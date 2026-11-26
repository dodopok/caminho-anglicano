import type { InjectionKey } from 'vue'
import { useAudioApi } from './useAudioApi'
import { useOrdoApi } from './useOrdoApi'
import { usePortalQuery, useQueryParam } from './usePortalQuery'
import { createReport, isNotDeployed, errorText } from './useReport'
import { isSessionError, OrdoApiError, type AudioPrayerBook, type AudioWorkerQueuePurgeScope, type DashboardAudio } from '../types/dashboard'
import type { AudioProviderHealth, AudioReadinessResponse, AudioRun } from '../types/audio'
import { isLive, isWaiting, number, pricePer1k, providerIsDown, providerName } from '../utils/audio'

/**
 * Everything the Áudio sections share: the summary, the provider's health,
 * the stored coverage, the latest runs, the books, the actions on a run, and
 * where in the tab the operator is (`?aba=audio&secao=…&livro=…&biblia=…&execucao=…`).
 * The panel creates it once and its sections inject it.
 */
export const AUDIO_SECTIONS = ['visao-geral', 'cobertura', 'execucoes', 'clips', 'manutencao', 'nova-geracao'] as const
export type AudioSection = typeof AUDIO_SECTIONS[number]

export interface GenerationDraft {
  mode?: 'office' | 'catalog'
  prayer_book_code?: string
  bible_version?: string
  start_date?: string
  days?: number
  offices?: string[]
  step?: 1 | 2 | 3
}

export interface RunActionState {
  busy?: boolean
  note?: string | null
  error?: string | null
}

export const POLL_FAST = 4_000
export const POLL_SLOW = 60_000
export const POLL_MAX = 60_000

export type PollMode = 'fast' | 'slow' | null

export interface LivePollerOptions {
  /** `fast` while something is queued or running, `slow` while runs only wait for the provider, null when idle. */
  mode: () => PollMode
  /** One light read; resolves true when something on screen changed. */
  read: () => Promise<boolean>
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> | null
}

/**
 * The Áudio tab's only timer. It reads while there is live work and never
 * otherwise: an idle tab makes no requests until someone presses refresh or
 * acts. While nothing changes the wait doubles (4 s, 8 s, 16 s… up to 60 s)
 * and goes back to the start as soon as something moves. A hidden tab stops
 * reading and, when it is shown again, reads at once and carries on.
 */
export const createLivePoller = ({ mode, read, document: doc = typeof document === 'undefined' ? null : document }: LivePollerOptions) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let delay = 0
  let current: PollMode = null
  let reading = false
  let stopped = false

  const hidden = () => doc?.visibilityState === 'hidden'
  const base = (value: PollMode) => value === 'fast' ? POLL_FAST : POLL_SLOW
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = () => {
    clear()
    if (stopped || !current || hidden()) return
    timer = setTimeout(() => { void fire() }, delay)
  }

  const fire = async () => {
    timer = null
    if (reading || stopped) return
    reading = true
    let changed = false
    try {
      changed = await read()
    } catch {
      changed = false
    } finally {
      reading = false
    }
    current = mode()
    delay = changed ? base(current) : Math.min(Math.max(delay, base(current)) * 2, POLL_MAX)
    schedule()
  }

  /** Called when the mode may have changed (a run started, finished or began to wait). */
  const update = () => {
    const next = mode()
    if (next === current && (timer || reading || !next)) return
    current = next
    delay = base(next)
    schedule()
  }

  /** Something moved outside the poll (an action): start again from the shortest wait. */
  const kick = () => {
    current = mode()
    delay = base(current)
    if (!reading) schedule()
  }

  const onVisibility = () => {
    if (hidden()) {
      clear()
      return
    }
    current = mode()
    if (!current) return
    delay = base(current)
    void fire()
  }

  doc?.addEventListener('visibilitychange', onVisibility)

  const stop = () => {
    stopped = true
    clear()
    doc?.removeEventListener('visibilitychange', onVisibility)
  }

  return { update, kick, stop, get delay () { return timer ? delay : null } }
}

export const createAudioStore = () => {
  const ordo = useOrdoApi()
  const audio = useAudioApi()
  const query = usePortalQuery()

  // --- Where the operator is ---------------------------------------------------
  // `gerar` was the old section with the date form; it opens the new wizard.
  const sectionParam = useQueryParam<string>('secao', 'visao-geral', [...AUDIO_SECTIONS, 'gerar'], { query, push: true })
  const section = computed<AudioSection>(() => sectionParam.value === 'gerar' ? 'nova-geracao' : sectionParam.value as AudioSection)
  const book = computed(() => query.values.value.livro || '')
  const bible = computed(() => query.values.value.biblia || '')
  const runId = computed(() => query.values.value.execucao || '')

  const go = (next: AudioSection, params: { livro?: string | null; biblia?: string | null; execucao?: string | number | null } = {}) => {
    query.set({
      secao: next === 'visao-geral' ? null : next,
      livro: params.livro ?? null,
      biblia: params.biblia ?? null,
      execucao: params.execucao ?? null
    }, { push: true })
  }
  const setParams = (params: Record<string, string | number | null>) => query.set(params)

  // --- Reports ----------------------------------------------------------------
  const summary = createReport<DashboardAudio>(() => ordo.fetchAudioSummary())
  const provider = createReport<AudioProviderHealth>(() => audio.fetchProvider())
  const readinessDays = ref<7 | 28>(28)
  const readiness = createReport<AudioReadinessResponse>(() => audio.fetchReadiness(readinessDays.value))
  const books = ref<AudioPrayerBook[]>([])
  const runs = ref<AudioRun[]>([])
  const runsError = ref<string | null>(null)
  const loading = ref(true)
  /** Bumped after each refresh, so a section that reads its own data reads it again. */
  const tick = ref(0)
  const now = ref(new Date())

  const loadBooks = async () => {
    try {
      books.value = (await ordo.fetchAudioPrayerBooks()).data || []
    } catch {
      // Without the list the codes still identify the books.
    }
  }

  const loadRuns = async () => {
    try {
      runs.value = (await audio.fetchRuns({ limit: 20 })).operations
      runsError.value = null
    } catch (error) {
      if (!isSessionError(error)) runsError.value = errorText(error) || null
    }
  }

  const refresh = async () => {
    now.value = new Date()
    await Promise.all([summary.load(), provider.load(), readiness.load(), loadRuns()])
    tick.value += 1
  }

  const loadAll = async () => {
    loading.value = true
    await Promise.all([refresh(), loadBooks()])
    loading.value = false
  }

  watch(readinessDays, () => readiness.load())

  // --- Derived ----------------------------------------------------------------
  const failuresAcknowledgedAt = ref<number | null>(null)
  const recentFailures = computed(() => (summary.state.data?.operations?.recent_failures || [])
    .filter(failure => !failuresAcknowledgedAt.value || new Date(failure.completed_at || 0).getTime() > failuresAcknowledgedAt.value))
  const failures = computed(() => failuresAcknowledgedAt.value ? recentFailures.value.length : summary.state.data?.operations?.failed_last_24_hours || 0)
  const pendingCandidates = computed(() => summary.state.data?.pending_candidates || 0)
  const queueJobs = computed(() => summary.state.data?.worker_queue?.jobs || summary.state.data?.active_jobs || [])
  const deadJobs = computed(() => summary.state.data?.worker_queue?.purgeable ?? queueJobs.value.filter(job => job.purgeable).length)
  const runningRuns = computed(() => runs.value.filter(run => run.status === 'running'))
  const waitingRuns = computed(() => runs.value.filter(isWaiting))
  const activeRuns = computed(() => runs.value.filter(run => isLive(run) && !isWaiting(run)))
  const providerLabel = computed(() => provider.state.data?.provider_name || providerName(summary.state.data?.profiles?.find(profile => profile.profile_status === 'current')?.provider))
  const providerDown = computed(() => providerIsDown(provider.state.data))
  const incident = computed(() => providerDown.value || waitingRuns.value.length > 0)
  const price = computed(() => pricePer1k(provider.state.data?.usd_per_1k_characters, ...runs.value.map(run => run.cost || null)))

  const bookOf = (code?: string | null) => books.value.find(item => item.code === code) || null
  /** "LOC 2015": the short name the books go by. */
  const bookName = (code?: string | null) => {
    if (!code) return 'Todos os livros'
    return bookOf(code)?.name || readiness.state.data?.books.find(item => item.prayer_book_code === code)?.name || code
  }
  const bookFullName = (code?: string | null) => {
    if (!code) return ''
    return readiness.state.data?.books.find(item => item.prayer_book_code === code)?.name || bookOf(code)?.full_name || bookOf(code)?.name || code
  }

  /** How far a running generation for this book (and Bible) got, or null. */
  const runningFor = (code: string, bibleVersion?: string) => {
    const run = runs.value.find(item => item.status === 'running' && item.prayer_book_code === code && item.kind === 'generate_office')
    if (!run) return null
    const chosen = (run.parameters?.preferences as Record<string, unknown> | undefined)?.bible_version
    const readinessBook = readiness.state.data?.books.find(item => item.prayer_book_code === code)
    const runBible = typeof chosen === 'string' && chosen ? chosen : readinessBook?.default_bible_version
    if (bibleVersion && runBible && runBible !== bibleVersion) return null
    return Math.round(run.progress_percentage ?? 0)
  }

  // --- Actions ----------------------------------------------------------------
  const acknowledging = ref(false)
  const acknowledgeError = ref<string | null>(null)
  const acknowledgeFailures = async () => {
    acknowledging.value = true
    acknowledgeError.value = null
    try {
      await ordo.acknowledgeAudioFailures()
      failuresAcknowledgedAt.value = Date.now()
    } catch (error) {
      acknowledgeError.value = errorText(error) || 'Não foi possível limpar o aviso.'
    } finally {
      acknowledging.value = false
    }
  }

  const queueBusy = ref(false)
  const queueNotice = ref<string | null>(null)
  const queueError = ref<string | null>(null)
  const purgeQueue = async (scope: AudioWorkerQueuePurgeScope) => {
    const confirmation = scope === 'all'
      ? 'Apagar todas as tarefas de áudio que ainda não rodaram? As que já estão rodando continuam.'
      : `Apagar ${number(deadJobs.value)} tarefas travadas? As gerações que esperavam por elas serão canceladas.`
    if (!window.confirm(confirmation)) return
    queueBusy.value = true
    queueError.value = null
    queueNotice.value = null
    try {
      const result = await ordo.purgeAudioWorkerQueue(scope)
      queueNotice.value = `${number(result.purged_jobs)} tarefas removidas · ${number(result.cancelled_operations)} gerações canceladas.`
      await Promise.all([summary.load(), loadRuns()])
    } catch (error) {
      queueError.value = errorText(error) || 'Não foi possível limpar a fila.'
    } finally {
      queueBusy.value = false
    }
  }

  const runActions = ref<Record<string, RunActionState>>({})
  const actionFor = (id: number | string) => runActions.value[String(id)] || {}

  /** Puts a run the API returned in the lists that already show it. */
  const track = (run: AudioRun) => {
    runs.value = [run, ...runs.value.filter(item => String(item.id) !== String(run.id))]
      .sort((a, b) => Number(b.id) - Number(a.id))
    tick.value += 1
    // After the lists update, so the poller sees the new run.
    void nextTick(() => poller.kick())
  }

  type RunAction = 'retry' | 'cancel' | 'try_now'
  const ACTION_CALLS = { retry: audio.retryRun, cancel: audio.cancelRun, try_now: audio.tryRunNow }
  const CONFIRM: Partial<Record<RunAction, string>> = {
    cancel: 'Cancelar esta geração? Os clips já salvos ficam; nada mais é comprado.'
  }

  const runAction = async (run: AudioRun, action: RunAction) => {
    const key = String(run.id)
    // A second click while the first is on its way does nothing.
    if (runActions.value[key]?.busy) return
    if (CONFIRM[action] && !window.confirm(CONFIRM[action]!)) return
    runActions.value = { ...runActions.value, [key]: { busy: true } }
    try {
      const response = await ACTION_CALLS[action](run.id)
      track(response.operation)
      runActions.value = { ...runActions.value, [key]: {} }
      void summary.load()
    } catch (error) {
      const state: RunActionState = isNotDeployed(error)
        ? { note: 'Em breve: esta ação chega com a próxima versão da API.' }
        : { error: error instanceof OrdoApiError && error.status === 409 ? error.message : errorText(error) || 'Não foi possível.' }
      runActions.value = { ...runActions.value, [key]: state }
    }
  }

  // --- Generation draft ---------------------------------------------------------
  const draft = ref<GenerationDraft | null>(null)
  const openGeneration = (next: GenerationDraft = {}) => {
    draft.value = next
    go('nova-geracao', { livro: next.prayer_book_code || null, biblia: next.bible_version || null })
  }

  // --- Polling -----------------------------------------------------------------
  // Fast while a run is queued or running (or a worker job runs), slow while
  // runs only wait for the provider, nothing at all otherwise. A poll reads
  // only what moves (the runs and the summary, the provider during an
  // incident) and tells the sections to reread only when something changed.
  const runningJobs = computed(() => queueJobs.value.filter(job => job.state === 'running' || (!job.state && job.claimed)).length)
  const hasLiveWork = computed(() => activeRuns.value.length > 0 || runningJobs.value > 0)
  const pollMode = computed<PollMode>(() => hasLiveWork.value ? 'fast' : waitingRuns.value.length ? 'slow' : null)

  const signature = () => JSON.stringify([
    runs.value.map(run => [run.id, run.status, run.processed_items, run.next_attempt_at, run.generated_clips]),
    summary.state.data?.pending_candidates,
    summary.state.data?.operations?.failed_last_24_hours,
    summary.state.data?.worker_queue?.purgeable,
    summary.state.data?.worker_queue?.total,
    provider.state.data?.status
  ])

  const poll = async () => {
    const before = signature()
    now.value = new Date()
    await Promise.all([summary.load(), loadRuns(), ...(incident.value ? [provider.load()] : [])])
    const changed = signature() !== before
    if (changed) tick.value += 1
    return changed
  }

  const poller = createLivePoller({ mode: () => pollMode.value, read: poll })
  watch(pollMode, () => poller.update())
  onScopeDispose(() => poller.stop())

  return {
    // place
    section, book, bible, runId, go, setParams, sectionParam,
    // data
    summary: summary.state, provider: provider.state, readiness: readiness.state, readinessDays,
    books, runs, runsError, loading, tick, now,
    // derived
    recentFailures, failures, pendingCandidates, queueJobs, deadJobs, runningRuns, waitingRuns, activeRuns,
    providerLabel, providerDown, incident, price, bookOf, bookName, bookFullName, runningFor, hasLiveWork, pollMode, poller,
    // actions
    loadAll, refresh, loadRuns, track,
    acknowledging, acknowledgeError, acknowledgeFailures,
    queueBusy, queueNotice, queueError, purgeQueue,
    runActions, actionFor, runAction,
    draft, openGeneration
  }
}

export type AudioStore = ReturnType<typeof createAudioStore>

const KEY: InjectionKey<AudioStore> = Symbol('ordo-audio-store')

export const provideAudioStore = (store: AudioStore) => {
  provide(KEY, store)
  return store
}

export const useAudioStore = () => {
  const store = inject(KEY, null)
  if (!store) throw new Error('useAudioStore() needs the Áudio panel to provide the store.')
  return store
}
