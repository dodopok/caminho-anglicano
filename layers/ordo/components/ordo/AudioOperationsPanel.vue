<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoStatList from './StatList.vue'
import OrdoAudioReadiness from './AudioReadiness.vue'
import OrdoBookPicker from './BookPicker.vue'
import OrdoCorpusPicker from './CorpusPicker.vue'
import OrdoLocBadge from './LocBadge.vue'
import { useOrdoDashboardPresentation, type DashboardStatItem } from '../../composables/useOrdoDashboardPresentation'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { officeMeta } from '../../utils/series'
import { usePortalQuery, useQueryParam } from '../../composables/usePortalQuery'
import type {
  AudioActiveJob,
  AudioCatalogRequest,
  AudioCatalogTranslation,
  AudioCleanupPreview,
  AudioClip,
  AudioClipCandidate,
  AudioClipFilters,
  AudioEstimate,
  AudioGenerationRequest,
  AudioOperation,
  AudioPrayerBook,
  AudioProfileStatus,
  AudioWorkerQueuePurgeScope,
  DashboardAudio
} from '../../types/dashboard'

const {
  fetchAudioSummary,
  fetchAudioClips,
  fetchAudioClipUrl,
  fetchAudioOperations,
  fetchAudioOperation,
  estimateAudioGeneration,
  enqueueAudioGeneration,
  regenerateAudioClip,
  acceptAudioClipCandidate,
  rejectAudioClipCandidate,
  previewAudioCleanup,
  enqueueAudioCleanup,
  enqueueAudioCatalog,
  fetchAudioCatalogTranslations,
  purgeAudioWorkerQueue,
  acknowledgeAudioFailures,
  reindexAudioCatalog,
  fetchAudioPrayerBooks
} = useOrdoApi()

const {
  formatNumber,
  formatDecimal,
  formatDuration,
  formatPercent,
  formatTimestamp,
  humanizeKey
} = useOrdoDashboardPresentation()

const DEFAULT_OFFICES = ['morning', 'midday', 'evening', 'compline']
const CLIP_PAGE_SIZE = 20

// The panel used to stack every metric, form, list and clip on one page. Each
// job the operator does now has its own section.
type AudioSection = 'overview' | 'generate' | 'clips' | 'maintenance'

const todayInput = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// The section is part of the address (`?aba=audio&secao=clips`), so a reload
// or a link from the overview's attention band lands on it.
const SECTION_SLUGS: Record<AudioSection, string> = { overview: 'visao-geral', generate: 'gerar', clips: 'clips', maintenance: 'manutencao' }
const portalQuery = usePortalQuery()
const sectionSlug = useQueryParam('secao', SECTION_SLUGS.overview, Object.values(SECTION_SLUGS), { query: portalQuery })
const activeSection = computed<AudioSection>({
  get: () => (Object.entries(SECTION_SLUGS).find(([, slug]) => slug === sectionSlug.value)?.[0] as AudioSection | undefined) || 'overview',
  set: section => { sectionSlug.value = SECTION_SLUGS[section] }
})
const summary = ref<DashboardAudio | null>(null)
const prayerBooks = ref<AudioPrayerBook[]>([])
const operations = ref<AudioOperation[]>([])
const clips = ref<AudioClip[]>([])
const clipsPagination = ref({ total: 0, limit: CLIP_PAGE_SIZE, offset: 0, count: 0 })
const loading = ref(false)
const clipsLoading = ref(false)
const error = ref<string | null>(null)
const clipsError = ref<string | null>(null)

const generation = reactive<AudioGenerationRequest>({
  prayer_book_code: 'loc_2015',
  start_date: todayInput(),
  days: 1,
  offices: [...DEFAULT_OFFICES],
  preferences: {}
})
// The Bible the window's readings are narrated in. Empty means the book's own
// default, which is what readers who never chose a Bible get.
const generationBible = ref('')
const generationBibles = ref<AudioCatalogTranslation[]>([])
let generationBiblesRequest = 0
const estimate = ref<AudioEstimate | null>(null)
const generationLoading = ref(false)
const generationError = ref<string | null>(null)

const catalog = reactive<AudioCatalogRequest>({ prayer_book_code: 'loc_2015', dry_run: false })
const catalogLoading = ref(false)
const catalogError = ref<string | null>(null)
// The corpora are chosen explicitly: an absent list would make the API narrate
// every Bible of the book's language, tens of millions of characters.
const catalogCorpora = ref<AudioCatalogTranslation[]>([])
const catalogCorporaLoading = ref(false)
const catalogCorporaError = ref<string | null>(null)
const catalogSelection = ref<string[]>([])
const catalogTextsOnly = ref(false)
let catalogCorporaRequest = 0

const queueLoading = ref(false)
const queueError = ref<string | null>(null)
const queueNotice = ref<string | null>(null)

const clipSearch = ref('')
const clipBookFilter = ref('')
const clipProfileFilter = ref<'all' | AudioProfileStatus>('all')
const clipProviderFilter = ref('')
const clipVoiceFilter = ref('')
const clipMaxCharacters = ref('')
const clipOffset = ref(0)
const clipSort = ref('created_at')
const clipDirection = ref<'asc' | 'desc'>('desc')
const clipInstructions = ref<Record<string, string>>({})
const expandedClips = ref<Record<string, boolean>>({})
const showMoreFilters = ref(false)

const cleanupBookCode = ref('')
const cleanupProfileStatus = ref<AudioProfileStatus>('legacy')
const cleanupPreview = ref<AudioCleanupPreview | null>(null)
const cleanupLoading = ref(false)
const cleanupError = ref<string | null>(null)

const clipActionLoading = ref<Record<string, boolean>>({})
const reindexBookCode = ref('loc_2015')
const reindexLoading = ref(false)
// The operation asked for last, so the section that asked for it can follow it
// without sending the operator back to the overview.
const lastEnqueuedId = ref<number | string | null>(null)

let pollingTimer: ReturnType<typeof setInterval> | null = null

const selectedBook = computed(() => prayerBooks.value.find(book => book.code === generation.prayer_book_code) || null)
const officeOptions = computed(() => {
  const available = selectedBook.value?.available_offices || []
  return available.length ? available : DEFAULT_OFFICES
})
const profileOptions = computed(() => summary.value?.profiles || [])
const workerQueue = computed(() => summary.value?.worker_queue || null)
const queueJobs = computed<AudioActiveJob[]>(() => workerQueue.value?.jobs || summary.value?.active_jobs || [])
const runningJobs = computed(() => queueJobs.value.filter(job => job.state === 'running').length)
const deadJobs = computed(() => workerQueue.value?.purgeable ?? queueJobs.value.filter(job => job.purgeable).length)
const queueStateItems = computed(() => Object.entries(workerQueue.value?.by_state || {})
  .filter(([, count]) => count > 0)
  .map(([state, count]) => ({ state, count })))
const bookCoverage = computed(() => summary.value?.by_prayer_book || [])
// From the readiness card straight into the date form, with the book chosen.
const openGenerationFor = (code: string) => {
  generation.prayer_book_code = code
  activeSection.value = 'generate'
}
const recentWindow = computed(() => summary.value?.recent || null)
const userUsage = computed(() => summary.value?.user_usage || null)
const topBackgroundTracks = computed(() => userUsage.value?.top_background_tracks?.slice(0, 10) || [])
// Failures the operator has already seen are cleared on the API, for every
// device. Until the summary's short cache catches up, the moment of the click
// keeps them hidden here; a failure that happens after it still shows.
const failuresAcknowledgedAt = ref<number | null>(null)
const acknowledgingFailures = ref(false)
const acknowledgeError = ref<string | null>(null)
const recentFailures = computed(() => (summary.value?.operations?.recent_failures || [])
  .filter(failure => !failuresAcknowledgedAt.value || new Date(failure.completed_at || 0).getTime() > failuresAcknowledgedAt.value))
const failedOperations = computed(() => failuresAcknowledgedAt.value
  ? recentFailures.value.length
  : summary.value?.operations?.failed_last_24_hours || 0)

const acknowledgeFailures = async () => {
  acknowledgingFailures.value = true
  acknowledgeError.value = null
  try {
    await acknowledgeAudioFailures()
    failuresAcknowledgedAt.value = Date.now()
  } catch (reason) {
    acknowledgeError.value = errorMessage(reason)
  } finally {
    acknowledgingFailures.value = false
  }
}
const providerOptions = computed(() => [...new Set(profileOptions.value.map(profile => profile.provider).filter(Boolean))] as string[])
const voiceOptions = computed(() => [...new Set(profileOptions.value.map(profile => profile.voice).filter(Boolean))] as string[])
const currentProfiles = computed(() => profileOptions.value.filter(profile => profile.profile_status === 'current'))
const totalPages = computed(() => Math.max(1, Math.ceil(clipsPagination.value.total / CLIP_PAGE_SIZE)))
const currentPage = computed(() => Math.floor(clipOffset.value / CLIP_PAGE_SIZE) + 1)
const hasActiveOperations = computed(() => operations.value.some(operation => ['queued', 'running'].includes(operation.status)))
// Only work a worker will still pick up justifies the 4-second poll. A queue
// full of dead jobs used to keep the panel refreshing forever.
const LIVE_JOB_STATES = ['running', 'ready', 'scheduled', 'blocked']
const liveJobs = computed(() => queueJobs.value.filter(job => LIVE_JOB_STATES.includes(job.state || (job.claimed ? 'running' : 'ready'))).length)
const hasActiveWork = computed(() => hasActiveOperations.value || liveJobs.value > 0)
// A run waiting for the voice provider to come back has nothing to show for
// up to half an hour, so the panel checks on it once a minute, not every 4 s.
const isWaitingRetry = (operation: AudioOperation) => operation.status === 'queued' && Boolean(operation.next_attempt_at)
const waitingOperations = computed(() => operations.value.filter(isWaitingRetry))
const onlyWaiting = computed(() => hasActiveOperations.value
  && operations.value.filter(operation => ['queued', 'running'].includes(operation.status)).every(isWaitingRetry)
  && !queueJobs.value.some(job => ['running', 'ready'].includes(job.state || (job.claimed ? 'running' : 'ready'))))
const minutesUntil = (value?: string | null) => {
  if (!value) return null
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000)
  return Number.isFinite(minutes) ? Math.max(0, minutes) : null
}
const retryText = (operation: AudioOperation) => {
  const minutes = minutesUntil(operation.next_attempt_at)
  const when = minutes === null ? '' : minutes < 1 ? 'a qualquer momento' : `em ${formatNumber(minutes)} min`
  const reason = operation.error_message || 'O provedor de voz não respondeu.'
  return when ? `${reason} · ${when}` : reason
}
const pendingCandidateCount = computed(() => summary.value?.pending_candidates || 0)
const lastEnqueued = computed(() => lastEnqueuedId.value == null
  ? null
  : operations.value.find(operation => String(operation.id) === String(lastEnqueuedId.value)) || null)
const extraFilterCount = computed(() => [clipProviderFilter.value, clipVoiceFilter.value, clipMaxCharacters.value].filter(Boolean).length)

const plural = (count: number, singular: string, pluralForm: string) => `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`

const sections = computed<Array<{ id: AudioSection; label: string; count?: number }>>(() => [
  { id: 'overview', label: 'Visão geral' },
  { id: 'generate', label: 'Gerar' },
  { id: 'clips', label: 'Clips', count: pendingCandidateCount.value },
  { id: 'maintenance', label: 'Manutenção' }
])

// Only what asks for a decision reaches the top of the overview.
const attentionItems = computed(() => [
  ...(pendingCandidateCount.value ? [{ key: 'candidates', text: `${plural(pendingCandidateCount.value, 'tentativa aguarda', 'tentativas aguardam')} revisão`, section: 'clips' as AudioSection, action: 'Abrir clips' }] : []),
  ...(deadJobs.value ? [{ key: 'dead', text: `${plural(deadJobs.value, 'tarefa travada', 'tarefas travadas')} na fila de processamento`, section: null, action: null }] : []),
  ...(waitingOperations.value.length ? [{ key: 'waiting', text: `${plural(waitingOperations.value.length, 'geração espera', 'gerações esperam')} o provedor de voz voltar; tentam de novo sozinhas`, section: null, action: null }] : []),
  ...(failedOperations.value ? [{ key: 'failed', text: `${plural(failedOperations.value, 'operação falhou', 'operações falharam')} nas últimas 24 horas`, section: null, action: null }] : [])
])

const catalogStats = computed<DashboardStatItem[]>(() => [
  { key: 'clips', label: 'Clips no catálogo', value: formatNumber(summary.value?.total_clips), hint: `${formatNumber(summary.value?.total_characters)} caracteres` },
  { key: 'duration', label: 'Duração narrada', value: formatDuration(summary.value?.total_duration_seconds), hint: `${formatNumber(summary.value?.silence_clips)} silêncios` },
  ...(recentWindow.value ? [{ key: 'recent', label: `Novos em ${recentWindow.value.window_days} dias`, value: formatNumber(recentWindow.value.clips), hint: `${formatNumber(recentWindow.value.characters)} caracteres gerados` }] : []),
  { key: 'books', label: 'Livros cobertos', value: formatNumber(bookCoverage.value.length) }
])

const currentShare = computed(() => {
  const total = summary.value?.total_clips || 0
  return total ? Math.round(((summary.value?.current_clips || 0) / total) * 100) : null
})

const qualityStats = computed<DashboardStatItem[]>(() => [
  { key: 'current', label: 'Na voz atual', value: formatNumber(summary.value?.current_clips), ...(currentShare.value == null ? {} : { hint: `${currentShare.value}% do catálogo` }) },
  { key: 'stale', label: 'Com instruções antigas', value: formatNumber(summary.value?.stale_clips), hint: 'gerados com outra configuração' },
  { key: 'legacy', label: 'Sem registro de versão', value: formatNumber(summary.value?.legacy_clips), hint: 'antigos, sem voz registrada' },
  { key: 'candidates', label: 'Tentativas para ouvir', value: formatNumber(pendingCandidateCount.value), ...(pendingCandidateCount.value ? { tone: 'attention' as const } : {}) }
])

const queueStats = computed<DashboardStatItem[]>(() => [
  { key: 'active', label: 'Gerações em andamento', value: formatNumber(summary.value?.active_operations), hint: 'esperando ou rodando' },
  { key: 'running', label: 'Tarefas rodando', value: formatNumber(runningJobs.value) },
  { key: 'total', label: 'Tarefas na fila', value: formatNumber(workerQueue.value?.total), hint: 'ainda não terminaram' },
  { key: 'dead', label: 'Tarefas travadas', value: formatNumber(deadJobs.value), ...(deadJobs.value ? { tone: 'attention' as const, hint: 'nunca vão terminar' } : {}) },
  { key: 'failed', label: 'Gerações com erro', value: formatNumber(failedOperations.value), hint: 'nas últimas 24 horas', ...(failedOperations.value ? { tone: 'attention' as const } : {}) }
])

const userUsageStats = computed<DashboardStatItem[]>(() => {
  const usage = userUsage.value
  if (!usage) return []

  const uniqueUsers = usage.unique_users || 0
  const totalAccesses = usage.total_accesses || 0
  const byType = usage.by_type || {}

  return [
    { key: 'users', label: 'Pessoas que usaram áudio', value: formatNumber(uniqueUsers) },
    { key: 'accesses', label: 'Acessos registrados', value: formatNumber(totalAccesses) },
    { key: 'average', label: 'Acessos por pessoa', value: uniqueUsers ? formatDecimal(totalAccesses / uniqueUsers) : '—' },
    { key: 'assets', label: 'Conteúdos distintos usados', value: formatNumber(usage.used_assets) },
    { key: 'background', label: 'Música de fundo', value: formatNumber(byType.background_track) },
    { key: 'office_narration', label: 'Narração nos ofícios', value: formatNumber(byType.audio_clip) },
    { key: 'text_narration', label: 'Narração de textos', value: formatNumber(byType.liturgical_text) }
  ]
})

const maxBackgroundTrackAccesses = computed(() => Math.max(...topBackgroundTracks.value.map(track => track.accesses || 0), 1))

const statusLabel = (status?: string) => ({
  queued: 'Na fila',
  running: 'Executando',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado'
}[status || ''] || humanizeKey(status || 'desconhecido'))

const jobStateLabel = (state?: string) => ({
  running: 'em execução',
  ready: 'na fila',
  scheduled: 'agendado',
  blocked: 'bloqueado',
  failed: 'falhou',
  orphaned: 'travada'
}[state || ''] || humanizeKey(state || 'desconhecido'))

const operationLabel = (kind?: string) => ({
  generate_office: 'Geração de ofícios',
  generate_catalog: 'Catálogo fixo',
  regenerate_clip: 'Regeneração de áudio',
  cleanup_clips: 'Limpeza de clips',
  index_catalog: 'Indexação do catálogo'
}[kind || ''] || humanizeKey(kind || 'operação'))

const profileLabel = (status?: string) => ({
  current: 'Atual',
  stale: 'Instruções antigas',
  legacy: 'Sem registro de versão'
}[status || ''] || humanizeKey(status || 'desconhecido'))

const profileClass = (status?: string) => `audio-ops__badge--${status || 'unknown'}`

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Não foi possível carregar os dados de áudio.'

const generationPayload = (): AudioGenerationRequest => ({
  prayer_book_code: generation.prayer_book_code,
  start_date: generation.start_date,
  days: Math.min(Math.max(Number(generation.days) || 1, 1), 31),
  ...(generation.offices?.length ? { offices: [...generation.offices] } : {}),
  preferences: {
    ...(generation.preferences || {}),
    ...(generationBible.value ? { bible_version: generationBible.value } : {})
  }
})

const loadGenerationBibles = async () => {
  const code = generation.prayer_book_code
  const requestId = ++generationBiblesRequest
  generationBibles.value = []
  generationBible.value = ''
  if (!code) return

  try {
    const response = await fetchAudioCatalogTranslations(code)
    if (requestId === generationBiblesRequest) {
      generationBibles.value = (response.translations || []).filter(corpus => corpus.kind === 'bible')
    }
  } catch {
    // Without the list the window still narrates the book's default Bible.
    if (requestId === generationBiblesRequest) generationBibles.value = []
  }
}

const clipFilters = (): AudioClipFilters => ({
  limit: CLIP_PAGE_SIZE,
  offset: clipOffset.value,
  sort: clipSort.value,
  direction: clipDirection.value,
  ...(clipSearch.value.trim() ? { q: clipSearch.value.trim() } : {}),
  ...(clipBookFilter.value ? { prayer_book_code: clipBookFilter.value } : {}),
  ...(clipProfileFilter.value !== 'all' ? { profile_status: clipProfileFilter.value } : {}),
  ...(clipProviderFilter.value ? { provider: clipProviderFilter.value } : {}),
  ...(clipVoiceFilter.value ? { voice: clipVoiceFilter.value } : {}),
  ...(clipMaxCharacters.value ? { max_characters: clipMaxCharacters.value } : {})
})

const loadSummary = async () => {
  summary.value = await fetchAudioSummary()
}

const loadPrayerBooks = async () => {
  const response = await fetchAudioPrayerBooks()
  prayerBooks.value = response.data || []
  if (!prayerBooks.value.some(book => book.code === generation.prayer_book_code)) {
    generation.prayer_book_code = prayerBooks.value.find(book => book.is_recommended)?.code || prayerBooks.value[0]?.code || generation.prayer_book_code
  }
  if (!prayerBooks.value.some(book => book.code === catalog.prayer_book_code)) {
    catalog.prayer_book_code = generation.prayer_book_code
  }
  if (!prayerBooks.value.some(book => book.code === reindexBookCode.value)) {
    reindexBookCode.value = generation.prayer_book_code
  }
  syncOffices()
}

const loadOperations = async (quiet = false) => {
  try {
    const response = await fetchAudioOperations()
    operations.value = response.operations || []
  } catch (reason) {
    if (!quiet) error.value = errorMessage(reason)
  }
}

const loadClips = async (quiet = false) => {
  clipsLoading.value = true
  clipsError.value = null
  try {
    const response = await fetchAudioClips(clipFilters())
    clips.value = response.clips || []
    clipsPagination.value = response.pagination || { total: 0, limit: CLIP_PAGE_SIZE, offset: clipOffset.value, count: 0 }
    clips.value.forEach(clip => {
      const id = String(clip.id)
      if (!(id in clipInstructions.value)) clipInstructions.value[id] = clip.customization?.instructions || ''
    })
  } catch (reason) {
    if (!quiet) clipsError.value = errorMessage(reason)
  } finally {
    clipsLoading.value = false
  }
}

const loadAll = async () => {
  loading.value = true
  error.value = null
  try {
    await Promise.all([loadSummary(), loadPrayerBooks(), loadOperations(), loadClips()])
  } catch (reason) {
    error.value = errorMessage(reason)
  } finally {
    loading.value = false
  }
}

const syncOffices = () => {
  const allowed = officeOptions.value
  const selected = (generation.offices || []).filter(office => allowed.includes(office))
  generation.offices = selected.length ? selected : [...allowed]
}

const toggleOffice = (office: string) => {
  const selected = new Set(generation.offices || [])
  if (selected.has(office)) {
    if (selected.size === 1) return
    selected.delete(office)
  } else {
    selected.add(office)
  }
  generation.offices = [...selected]
}

const runEstimate = async () => {
  generationLoading.value = true
  generationError.value = null
  try {
    const response = await estimateAudioGeneration(generationPayload())
    estimate.value = response.estimate
  } catch (reason) {
    estimate.value = null
    generationError.value = errorMessage(reason)
  } finally {
    generationLoading.value = false
  }
}

const enqueueGeneration = async () => {
  generationLoading.value = true
  generationError.value = null
  try {
    const response = await enqueueAudioGeneration(generationPayload())
    trackOperation(response.operation)
    estimate.value = null
  } catch (reason) {
    generationError.value = errorMessage(reason)
  } finally {
    generationLoading.value = false
  }
}

const trackOperation = (operation: AudioOperation) => {
  operations.value = [operation, ...operations.value.filter(item => item.id !== operation.id)]
  lastEnqueuedId.value = operation.id
}

const isLive = (operation: AudioOperation) => ['queued', 'running'].includes(operation.status)

const catalogReady = computed(() => catalogTextsOnly.value || catalogSelection.value.length > 0)

const loadCatalogCorpora = async () => {
  const code = catalog.prayer_book_code
  const requestId = ++catalogCorporaRequest
  catalogCorpora.value = []
  catalogSelection.value = []
  catalogTextsOnly.value = false
  catalogCorporaError.value = null
  if (!code) return

  catalogCorporaLoading.value = true
  try {
    const response = await fetchAudioCatalogTranslations(code)
    if (requestId === catalogCorporaRequest) catalogCorpora.value = response.translations || []
  } catch (reason) {
    if (requestId === catalogCorporaRequest) catalogCorporaError.value = errorMessage(reason)
  } finally {
    if (requestId === catalogCorporaRequest) catalogCorporaLoading.value = false
  }
}

const enqueueCatalog = async (dryRun: boolean) => {
  if (!catalogReady.value) return

  catalogLoading.value = true
  catalogError.value = null
  try {
    const response = await enqueueAudioCatalog({
      prayer_book_code: catalog.prayer_book_code,
      dry_run: dryRun,
      translations: catalogTextsOnly.value ? [] : [...catalogSelection.value]
    })
    trackOperation(response.operation)
  } catch (reason) {
    catalogError.value = errorMessage(reason)
  } finally {
    catalogLoading.value = false
  }
}

const purgeQueue = async (scope: AudioWorkerQueuePurgeScope) => {
  const confirmation = scope === 'all'
    ? 'Apagar todas as tarefas de áudio que ainda não rodaram? As que já estão rodando continuam.'
    : `Apagar ${formatNumber(deadJobs.value)} tarefas travadas? As gerações que esperavam por elas serão canceladas.`
  if (!window.confirm(confirmation)) return

  queueLoading.value = true
  queueError.value = null
  queueNotice.value = null
  try {
    const result = await purgeAudioWorkerQueue(scope)
    queueNotice.value = `${formatNumber(result.purged_jobs)} tarefas removidas · ${formatNumber(result.cancelled_operations)} gerações canceladas.`
    await Promise.all([loadSummary(), loadOperations(true)])
  } catch (reason) {
    queueError.value = errorMessage(reason)
  } finally {
    queueLoading.value = false
  }
}

// A finished catalogue run — especially a dry run, whose only product is the
// report — carries its totals in `result`. While it runs, `result` is empty and
// the box used to announce "0 clips resolvidos em 0 fontes" next to a bar
// that was moving.
const catalogReport = (operation: AudioOperation) => {
  const result = operation.result
  if (!result || operation.kind !== 'generate_catalog' || isLive(operation) || typeof result.clips !== 'number') return null

  const asCount = (value: unknown) => typeof value === 'number' ? value : null
  return {
    dryRun: result.generate === false,
    ready: asCount(result.clips),
    generated: asCount(result.generated),
    missingCharacters: asCount(result.missing_characters),
    sources: Array.isArray(result.sources) ? result.sources.length : null
  }
}

// Which corpora a catalogue run asked for, from the parameters it was
// enqueued with. Runs from before the choice existed carry no list.
const catalogCorporaLabel = (operation: AudioOperation) => {
  if (operation.kind !== 'generate_catalog' || !operation.parameters) return null

  const translations = operation.parameters.translations
  if (!Array.isArray(translations)) return 'Corpora: todas as Bíblias do idioma'
  if (!translations.length) return 'Corpora: somente textos e coletas'
  return `Corpora: ${translations.map(code => String(code).toUpperCase()).join(', ')}`
}

// A catalogue run used to count progress in sources: the book's texts and
// collects finish in seconds, a whole Bible takes hours, so "2 de 3" sat at
// 66,67% for the entire run. An API that reports lines sends `progress`; one
// that does not is described as the step it is on, without a misleading bar.
const SOURCE_LABELS: Record<string, string> = {
  liturgical_texts: 'Textos do livro',
  collects: 'Coletas',
  prayer_book_psalter: 'Saltério do livro'
}

const sourceLabel = (progress: NonNullable<AudioOperation['progress']>) => {
  const code = progress.source_code ? progress.source_code.replaceAll('_', ' ').toUpperCase() : ''
  if (progress.source_kind === 'bible') return `Bíblia ${code}`.trim()
  if (progress.source_kind === 'psalter') return `Saltério ${code}`.trim()
  return SOURCE_LABELS[progress.source_kind || ''] || progress.source || 'Fonte'
}

const countsLines = (operation: AudioOperation) => operation.kind !== 'generate_catalog' || Boolean(operation.progress?.source_total)

const progressText = (operation: AudioOperation) => {
  if (operation.progress_percentage == null) return 'aguardando início'
  if (!countsLines(operation) && isLive(operation) && operation.total_items) {
    return `fonte ${formatNumber(Math.min((operation.processed_items || 0) + 1, operation.total_items))} de ${formatNumber(operation.total_items)}`
  }
  return formatPercent(operation.progress_percentage)
}

const stageText = (operation: AudioOperation) => {
  const progress = operation.progress
  if (!progress?.source || !isLive(operation)) return null
  const step = progress.sources_total && progress.sources_total > 1 ? `Etapa ${progress.source_index} de ${progress.sources_total} · ` : ''
  const lines = progress.source_total ? ` · ${formatNumber(progress.source_processed)} de ${formatNumber(progress.source_total)} linhas` : ''
  return `${step}${sourceLabel(progress)}${lines}`
}

const refreshOperation = async (operation: AudioOperation) => {
  try {
    const response = await fetchAudioOperation(operation.id)
    operations.value = operations.value.map(item => item.id === operation.id ? response.operation : item)
  } catch (reason) {
    error.value = errorMessage(reason)
  }
}

const pollOperations = async () => {
  const activeIds = new Set(operations.value.filter(operation => ['queued', 'running'].includes(operation.status)).map(operation => String(operation.id)))
  if (!activeIds.size) {
    try {
      await loadSummary()
    } catch (reason) {
      error.value = errorMessage(reason)
    }
    return
  }

  await loadOperations(true)
  const completedOne = operations.value.some(operation => activeIds.has(String(operation.id)) && !['queued', 'running'].includes(operation.status))
  if (completedOne) {
    try {
      await Promise.all([loadSummary(), loadClips(true)])
    } catch (reason) {
      error.value = errorMessage(reason)
    }
  }
}

const startPolling = () => {
  if (pollingTimer || !hasActiveWork.value) return
  pollingTimer = setInterval(() => void pollOperations(), onlyWaiting.value ? 60_000 : 4_000)
}

const stopPolling = () => {
  if (!pollingTimer) return
  clearInterval(pollingTimer)
  pollingTimer = null
}

watch([hasActiveWork, onlyWaiting], ([active]) => {
  stopPolling()
  if (active) startPolling()
}, { immediate: true })

const applyClipFilters = async () => {
  clipOffset.value = 0
  await loadClips()
}

const changeClipPage = async (direction: number) => {
  const nextOffset = clipOffset.value + direction * CLIP_PAGE_SIZE
  if (nextOffset < 0 || nextOffset >= clipsPagination.value.total) return
  clipOffset.value = nextOffset
  await loadClips()
}

const refreshClipUrl = async (clip: AudioClip) => {
  const id = String(clip.id)
  clipActionLoading.value = { ...clipActionLoading.value, [id]: true }
  try {
    const response = await fetchAudioClipUrl(clip.id)
    clips.value = clips.value.map(item => item.id === clip.id ? { ...item, audio_url: response.url } : item)
  } catch (reason) {
    clipsError.value = errorMessage(reason)
  } finally {
    clipActionLoading.value = { ...clipActionLoading.value, [id]: false }
  }
}

const regenerateClip = async (clip: AudioClip) => {
  const id = String(clip.id)
  const instructions = (clipInstructions.value[id] ?? clip.customization?.instructions ?? '').trim()
  if (!window.confirm(`Gerar uma nova tentativa para “${clip.text.slice(0, 80)}”? O áudio atual continuará intacto até você aprovar a tentativa.`)) return

  clipActionLoading.value = { ...clipActionLoading.value, [id]: true }
  try {
    const response = await regenerateAudioClip(clip.id, instructions || undefined)
    trackOperation(response.operation)
  } catch (reason) {
    clipsError.value = errorMessage(reason)
  } finally {
    clipActionLoading.value = { ...clipActionLoading.value, [id]: false }
  }
}

const candidateActionKey = (clip: AudioClip, candidate: AudioClipCandidate) => `${clip.id}:candidate:${candidate.id}`
const pendingCandidates = (clip: AudioClip) => (clip.candidates || []).filter(candidate => candidate.status === 'pending')
const reviewedCandidates = (clip: AudioClip) => (clip.candidates || []).filter(candidate => candidate.status !== 'pending')

const isExpanded = (clip: AudioClip) => Boolean(expandedClips.value[String(clip.id)])
const toggleClip = (clip: AudioClip) => {
  const id = String(clip.id)
  expandedClips.value = { ...expandedClips.value, [id]: !expandedClips.value[id] }
}

const usageSummary = (clip: AudioClip) => {
  const usages = clip.usages || []
  const shown = usages.slice(0, 2).map(usage => `${usage.prayer_book_code} / ${usage.source_name}`)
  const hidden = usages.length - shown.length
  return hidden ? `${shown.join(' · ')} · +${hidden} ${hidden === 1 ? 'uso' : 'usos'}` : shown.join(' · ')
}

const acceptCandidate = async (clip: AudioClip, candidate: AudioClipCandidate) => {
  if (!window.confirm('Aprovar esta tentativa? Ela substituirá o áudio oficial deste texto.')) return

  const key = candidateActionKey(clip, candidate)
  clipActionLoading.value = { ...clipActionLoading.value, [key]: true }
  try {
    await acceptAudioClipCandidate(clip.id, candidate.id)
    await Promise.all([loadClips(true), loadSummary()])
  } catch (reason) {
    clipsError.value = errorMessage(reason)
  } finally {
    clipActionLoading.value = { ...clipActionLoading.value, [key]: false }
  }
}

const rejectCandidate = async (clip: AudioClip, candidate: AudioClipCandidate) => {
  if (!window.confirm('Descartar esta tentativa e apagar o arquivo gerado?')) return

  const key = candidateActionKey(clip, candidate)
  clipActionLoading.value = { ...clipActionLoading.value, [key]: true }
  try {
    await rejectAudioClipCandidate(clip.id, candidate.id)
    await loadClips(true)
  } catch (reason) {
    clipsError.value = errorMessage(reason)
  } finally {
    clipActionLoading.value = { ...clipActionLoading.value, [key]: false }
  }
}

const candidateStatusLabel = (status?: string) => ({
  pending: 'aguardando revisão',
  accepted: 'aprovada',
  rejected: 'descartada'
}[status || ''] || humanizeKey(status || 'desconhecida'))

const cleanupFilters = (): AudioClipFilters => ({
  profile_status: cleanupProfileStatus.value,
  ...(cleanupBookCode.value ? { prayer_book_code: cleanupBookCode.value } : {})
})

const runCleanupPreview = async () => {
  cleanupLoading.value = true
  cleanupError.value = null
  try {
    cleanupPreview.value = await previewAudioCleanup(cleanupFilters())
  } catch (reason) {
    cleanupPreview.value = null
    cleanupError.value = errorMessage(reason)
  } finally {
    cleanupLoading.value = false
  }
}

const enqueueCleanup = async () => {
  if (!cleanupPreview.value?.total_clips) return
  if (!window.confirm(`Remover ${formatNumber(cleanupPreview.value.total_clips)} clips e seus arquivos do storage? Essa ação não pode ser desfeita.`)) return

  cleanupLoading.value = true
  cleanupError.value = null
  try {
    const response = await enqueueAudioCleanup(cleanupFilters())
    trackOperation(response.operation)
    cleanupPreview.value = null
  } catch (reason) {
    cleanupError.value = errorMessage(reason)
  } finally {
    cleanupLoading.value = false
  }
}

const reindexCatalog = async () => {
  reindexLoading.value = true
  error.value = null
  try {
    const response = await reindexAudioCatalog(reindexBookCode.value)
    trackOperation(response.operation)
  } catch (reason) {
    error.value = errorMessage(reason)
  } finally {
    reindexLoading.value = false
  }
}

const shortFingerprint = (value?: string | null) => value ? value.slice(0, 12) : '—'

watch(
  () => [generation.prayer_book_code, prayerBooks.value.length] as const,
  ([code, books], previous) => {
    if (!books || (previous && previous[0] === code && previous[1])) return
    estimate.value = null
    loadGenerationBibles()
  }
)

watch(generationBible, () => { estimate.value = null })
watch(() => generation.prayer_book_code, syncOffices)

watch(
  () => [catalog.prayer_book_code, prayerBooks.value.length] as const,
  ([code, books], previous) => {
    if (!books || (previous && previous[0] === code && previous[1])) return
    loadCatalogCorpora()
  }
)

// A link that asked for a card (`foco=fila`) scrolls to it once the data is
// there, then drops the key so later reloads open the section from the top.
const focusRequestedCard = async () => {
  const focus = portalQuery.get('foco')
  if (!focus) return
  await nextTick()
  if (import.meta.client) document.getElementById(`audio-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  portalQuery.set({ foco: null })
}

onMounted(async () => {
  await loadAll()
  focusRequestedCard()
})
onUnmounted(stopPolling)
</script>

<template>
  <section class="audio-ops">
    <div class="audio-ops__toolbar">
      <div class="audio-ops__sections" role="tablist" aria-label="Seções da operação de áudio">
        <button v-for="section in sections" :key="section.id" type="button" role="tab" :aria-selected="activeSection === section.id" :class="{ 'is-active': activeSection === section.id }" @click="activeSection = section.id">
          {{ section.label }}<span v-if="section.count" class="audio-ops__section-count">{{ formatNumber(section.count) }}</span>
        </button>
      </div>
      <div class="audio-ops__toolbar-actions">
        <span v-if="loading" class="ordo-loading-note"><i /> lendo catálogo…</span>
        <span v-else-if="hasActiveWork" class="audio-ops__live"><i /> acompanhando a fila</span>
        <button type="button" class="ordo-button ordo-button--quiet" :disabled="loading" @click="loadAll">↻ Atualizar</button>
      </div>
    </div>

    <div v-if="error" class="audio-ops__alert audio-ops__alert--error">{{ error }}</div>

    <div v-if="lastEnqueued && activeSection !== 'overview'" class="audio-ops__tracked" aria-live="polite">
      <div class="audio-ops__tracked-copy">
        <span class="audio-ops__badge" :class="isWaitingRetry(lastEnqueued) ? 'audio-ops__badge--waiting' : `audio-ops__badge--${lastEnqueued.status}`">{{ isWaitingRetry(lastEnqueued) ? 'Nova tentativa' : statusLabel(lastEnqueued.status) }}</span>
        <strong>{{ operationLabel(lastEnqueued.kind) }}</strong>
        <small>{{ lastEnqueued.prayer_book_code || 'Todos os LOCs' }} · {{ stageText(lastEnqueued) || progressText(lastEnqueued) }}</small>
      </div>
      <div class="audio-ops__tracked-actions">
        <button type="button" class="audio-ops__link" @click="activeSection = 'overview'">Ver operações →</button>
        <button type="button" class="audio-ops__dismiss" aria-label="Dispensar aviso da operação" @click="lastEnqueuedId = null">×</button>
      </div>
    </div>

    <template v-if="activeSection === 'overview'">
      <div v-if="!summary && loading" class="audio-ops__skeleton" aria-hidden="true">
        <span class="op-skeleton" style="height: 52px" />
        <span class="op-skeleton" style="height: 170px" />
        <span class="op-skeleton" style="height: 240px" />
      </div>
      <div v-if="summary" class="audio-ops__attention" :class="{ 'is-calm': !attentionItems.length }">
        <template v-if="attentionItems.length">
          <template v-for="item in attentionItems" :key="item.key">
            <div class="audio-ops__attention-item">
              <i aria-hidden="true">!</i>
              <span>{{ item.text }}</span>
              <button v-if="item.section" type="button" class="audio-ops__link" @click="activeSection = item.section">{{ item.action }} →</button>
              <button v-if="item.key === 'failed'" type="button" class="audio-ops__link" :disabled="acknowledgingFailures" @click="acknowledgeFailures">{{ acknowledgingFailures ? 'Limpando…' : 'Limpar aviso' }}</button>
            </div>
            <ul v-if="item.key === 'failed' && recentFailures.length" class="audio-ops__failures">
              <li v-for="failure in recentFailures" :key="failure.id">
                <strong>{{ operationLabel(failure.kind) }}</strong>
                <OrdoLocBadge v-if="failure.prayer_book_code" :code="failure.prayer_book_code" />
                <span class="audio-ops__failure-time">{{ formatTimestamp(failure.completed_at) }}</span>
                <small v-if="failure.error_message" :title="failure.error_message">{{ failure.error_message }}</small>
              </li>
            </ul>
          </template>
          <p v-if="acknowledgeError" class="audio-ops__failure-error" role="alert">{{ acknowledgeError }}</p>
        </template>
        <div v-else class="audio-ops__attention-item">
          <i aria-hidden="true">✓</i>
          <span>Nada pede atenção: sem tentativas para ouvir, tarefas travadas ou erros novos nas últimas 24 horas.</span>
        </div>
      </div>

      <OrdoAudioReadiness v-if="bookCoverage.length" :codes="bookCoverage.map(book => book.prayer_book_code || '').filter(Boolean)" :books="prayerBooks" @generate="openGenerationFor" />

      <div v-if="summary" class="audio-ops__stats-card">
        <div class="audio-ops__stats">
          <OrdoStatList title="Catálogo" :items="catalogStats" />
          <OrdoStatList title="Qualidade" :items="qualityStats" />
          <OrdoStatList title="Fila" :items="queueStats" />
        </div>
        <div v-if="bookCoverage.length" class="audio-ops__coverage">
          <span class="audio-ops__coverage-label">Clips por livro</span>
          <span v-for="book in bookCoverage" :key="book.prayer_book_code" class="audio-ops__coverage-chip"><OrdoLocBadge :code="book.prayer_book_code" /> {{ formatNumber(book.clips) }} clips · {{ formatNumber(book.sources) }} fontes</span>
        </div>
      </div>

      <div v-if="userUsage" class="audio-ops__grid">
        <OrdoChartCard title="Uso de áudio" description="Contagem agregada desde o início do registro de uso." icon="◖" icon-color="blue" eyebrow="Pessoas & consumo">
          <OrdoStatList :items="userUsageStats" />
          <p class="audio-ops__usage-note">A API registra a entrega dos clips nos ofícios e a solicitação de URLs de áudio. Isso não confirma que a reprodução foi concluída; estes números também não seguem o filtro de período do dashboard.</p>
        </OrdoChartCard>

        <OrdoChartCard title="Músicas de fundo mais acessadas" description="Faixas com mais solicitações registradas." icon="♫" icon-color="green" eyebrow="Preferências">
          <div v-if="topBackgroundTracks.length" class="audio-ops__usage-list">
            <div v-for="track in topBackgroundTracks" :key="track.id" class="audio-ops__usage-row">
              <span>{{ track.title || track.slug || `Faixa ${track.id}` }}</span>
              <strong>{{ formatNumber(track.accesses) }}</strong>
              <i><b :style="{ width: `${((track.accesses || 0) / maxBackgroundTrackAccesses) * 100}%` }" /></i>
            </div>
          </div>
          <div v-else class="audio-ops__empty">Ainda não há solicitações de músicas de fundo registradas.</div>
        </OrdoChartCard>
      </div>

      <div class="audio-ops__grid">
        <OrdoChartCard title="Operações recentes" description="Atualiza sozinha enquanto houver trabalho vivo na fila." icon="↻" icon-color="purple" eyebrow="Acompanhamento">
          <div v-if="!operations.length" class="audio-ops__empty">Nenhuma operação do catálogo novo foi registrada.</div>
          <div v-else class="audio-ops__operations">
            <article v-for="operation in operations.slice(0, 8)" :key="operation.id" class="audio-ops__operation">
              <div class="audio-ops__operation-topline">
                <strong>{{ operationLabel(operation.kind) }}</strong>
                <span class="audio-ops__badge" :class="isWaitingRetry(operation) ? 'audio-ops__badge--waiting' : `audio-ops__badge--${operation.status}`">{{ isWaitingRetry(operation) ? 'Nova tentativa' : statusLabel(operation.status) }}</span>
              </div>
              <small>{{ operation.prayer_book_code || 'Todos os LOCs' }} · {{ formatTimestamp(operation.created_at) }}</small>
              <div v-if="operation.total_items && countsLines(operation)" class="audio-ops__progress"><i :style="{ width: `${operation.progress_percentage || 0}%` }" /></div>
              <p v-if="stageText(operation)" class="audio-ops__operation-stage">{{ stageText(operation) }}</p>
              <div class="audio-ops__operation-meta">
                <span>{{ progressText(operation) }}</span>
                <span v-if="operation.generated_clips">{{ formatNumber(operation.generated_clips) }} clips novos</span>
                <span v-if="operation.generated_characters">{{ formatNumber(operation.generated_characters) }} caracteres narrados</span>
                <span v-if="operation.skipped_clips">{{ formatNumber(operation.skipped_clips) }} já existiam</span>
                <span v-if="operation.failed_items">{{ formatNumber(operation.failed_items) }} {{ operation.kind === 'generate_catalog' ? 'faltando' : 'falhas' }}</span>
              </div>
              <div v-if="catalogReport(operation)" class="audio-ops__operation-report">
                <strong>{{ catalogReport(operation)?.dryRun ? 'Simulação do catálogo' : 'Catálogo gerado' }}</strong>
                <span>{{ formatNumber(catalogReport(operation)?.ready) }} clips resolvidos · {{ formatNumber(catalogReport(operation)?.generated) }} gerados · {{ formatNumber(catalogReport(operation)?.missingCharacters) }} caracteres a gerar em {{ formatNumber(catalogReport(operation)?.sources) }} fontes</span>
              </div>
              <small v-if="catalogCorporaLabel(operation)" class="audio-ops__operation-corpora">{{ catalogCorporaLabel(operation) }}</small>
              <p v-if="isWaitingRetry(operation)" class="audio-ops__operation-retry" role="status">{{ retryText(operation) }}</p>
              <p v-else-if="operation.error_message" class="audio-ops__operation-error">{{ operation.error_message }}</p>
              <button v-if="isLive(operation)" type="button" class="audio-ops__link" @click="refreshOperation(operation)">Atualizar agora</button>
            </article>
          </div>
        </OrdoChartCard>

        <OrdoChartCard id="audio-fila" title="Fila de processamento" description="As tarefas de áudio esperando para rodar. Uma tarefa sem execução registrada está travada e nunca vai terminar." eyebrow="Processamento">
          <div v-if="queueStateItems.length" class="audio-ops__queue-states">
            <span v-for="item in queueStateItems" :key="item.state" class="audio-ops__badge" :class="`audio-ops__badge--job-${item.state}`">{{ jobStateLabel(item.state) }} · {{ formatNumber(item.count) }}</span>
          </div>
          <div v-if="queueError" class="audio-ops__alert audio-ops__alert--error">{{ queueError }}</div>
          <div v-if="queueNotice" class="audio-ops__alert audio-ops__alert--ok">{{ queueNotice }}</div>
          <div v-if="!queueJobs.length" class="audio-ops__empty">A fila está vazia.</div>
          <details v-else class="audio-ops__queue-details">
            <summary>Ver {{ plural(queueJobs.length, 'tarefa', 'tarefas') }}</summary>
            <div class="audio-ops__queue-jobs">
              <article v-for="workerJob in queueJobs" :key="workerJob.active_job_id || workerJob.id" class="audio-ops__queue-job">
                <div>
                  <strong>{{ workerJob.class_name }}</strong>
                  <small>{{ workerJob.queue_name }} · {{ formatTimestamp(workerJob.created_at) }}</small>
                </div>
                <span class="audio-ops__badge" :class="`audio-ops__badge--job-${workerJob.state || 'unknown'}`">{{ jobStateLabel(workerJob.state || (workerJob.claimed ? 'running' : 'ready')) }}</span>
              </article>
            </div>
          </details>
          <div class="audio-ops__actions">
            <button type="button" class="ordo-button ordo-button--quiet" :disabled="queueLoading || !deadJobs" @click="purgeQueue('dead')">{{ queueLoading ? 'Limpando…' : `Apagar ${formatNumber(deadJobs)} travadas` }}</button>
            <button type="button" class="ordo-button ordo-button--danger" :disabled="queueLoading || !queueJobs.length" @click="purgeQueue('all')">Zerar fila</button>
          </div>
        </OrdoChartCard>
      </div>
    </template>

    <div v-else-if="activeSection === 'generate'" class="audio-ops__grid">
      <OrdoChartCard title="Gerar por datas" description="Monta os ofícios reais de cada dia. Reaproveita os clips que já existem e só narra o que falta." icon="＋" icon-color="blue" eyebrow="Janela de datas">
        <div class="audio-ops__form audio-ops__form--three">
          <OrdoBookPicker v-model="generation.prayer_book_code" class="audio-ops__book" :books="prayerBooks" :disabled="!prayerBooks.length" />
          <label>Data inicial
            <input v-model="generation.start_date" type="date">
          </label>
          <label>Dias
            <input v-model.number="generation.days" type="number" min="1" max="31">
          </label>
          <label>Bíblia das leituras
            <select v-model="generationBible">
              <option value="">Padrão do livro</option>
              <option v-for="bible in generationBibles" :key="bible.code" :value="bible.code">{{ bible.name }} · {{ bible.full_name || bible.code }}</option>
            </select>
          </label>
        </div>
        <fieldset class="audio-ops__offices">
          <legend>Ofícios</legend>
          <label v-for="office in officeOptions" :key="office" class="audio-ops__check">
            <input type="checkbox" :checked="generation.offices?.includes(office)" @change="toggleOffice(office)">
            <span>{{ officeMeta(office).label }}</span>
          </label>
        </fieldset>
        <div v-if="generationError" class="audio-ops__alert audio-ops__alert--error">{{ generationError }}</div>
        <div v-if="estimate" class="audio-ops__estimate">
          <div><span>Prontos</span><strong>{{ formatNumber(estimate.ready_clips) }}</strong></div>
          <div><span>Faltantes</span><strong>{{ formatNumber(estimate.missing_clips) }}</strong></div>
          <div><span>Caracteres a gerar</span><strong>{{ formatNumber(estimate.missing_characters) }}</strong></div>
          <div><span>Custo estimado</span><strong>{{ estimate.estimated_cost == null ? '—' : `US$ ${formatDecimal(estimate.estimated_cost, 2)}` }}</strong></div>
        </div>
        <div class="audio-ops__actions">
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="generationLoading || !prayerBooks.length" @click="runEstimate">{{ generationLoading ? 'Calculando…' : 'Estimar' }}</button>
          <button type="button" class="ordo-button ordo-button--primary" :disabled="generationLoading || !prayerBooks.length" @click="enqueueGeneration">Enfileirar geração <span>→</span></button>
        </div>
      </OrdoChartCard>

      <OrdoChartCard title="Livro inteiro" description="Todo texto, coleta, saltério e corpus bíblico que o livro pode ler, independente de data." icon="◫" icon-color="green" eyebrow="Livro inteiro">
        <div class="audio-ops__form audio-ops__form--single">
          <OrdoBookPicker v-model="catalog.prayer_book_code" :books="prayerBooks" :disabled="!prayerBooks.length" />
        </div>
        <OrdoCorpusPicker v-model="catalogSelection" v-model:texts-only="catalogTextsOnly" :corpora="catalogCorpora" :loading="catalogCorporaLoading" :error="catalogCorporaError" />
        <p class="audio-ops__note">A contagem percorre corpora inteiros e roda em segundo plano. A simulação não compra nada: ela relata quantos clips faltariam.</p>
        <div v-if="catalogError" class="audio-ops__alert audio-ops__alert--error">{{ catalogError }}</div>
        <div class="audio-ops__actions">
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="catalogLoading || !prayerBooks.length || !catalogReady" @click="enqueueCatalog(true)">{{ catalogLoading ? 'Enfileirando…' : 'Simular catálogo' }}</button>
          <button type="button" class="ordo-button ordo-button--primary" :disabled="catalogLoading || !prayerBooks.length || !catalogReady" @click="enqueueCatalog(false)">Gerar catálogo <span>→</span></button>
        </div>
        <p v-if="!catalogReady && !catalogCorporaLoading" class="audio-ops__note audio-ops__catalog-hint">Escolha ao menos uma Bíblia ou “Só os textos do livro”.</p>
      </OrdoChartCard>
    </div>

    <OrdoChartCard v-else-if="activeSection === 'clips'" title="Catálogo de clips" description="Ouça, ajuste a observação de um texto e gere uma nova tentativa. O player usa URL assinada do storage." icon="⌕" icon-color="green" eyebrow="Revisão individual">
      <template #actions><span v-if="clipsPagination.total" class="audio-ops__count">{{ plural(clipsPagination.total, 'clip', 'clips') }}</span></template>
      <div class="audio-ops__filters">
        <label class="audio-ops__filter-wide">Texto
          <input v-model="clipSearch" type="search" placeholder="ex.: Pai nosso…" @keyup.enter="applyClipFilters">
        </label>
        <OrdoBookPicker v-model="clipBookFilter" compact empty-label="Todos os livros" :books="prayerBooks" @update:model-value="applyClipFilters" />
        <label>Versão da voz
          <select v-model="clipProfileFilter" @change="applyClipFilters">
            <option value="all">Todos</option>
            <option value="current">Atual</option>
            <option value="stale">Instruções antigas</option>
            <option value="legacy">Sem registro de versão</option>
          </select>
        </label>
        <button type="button" class="ordo-button ordo-button--quiet" :aria-expanded="showMoreFilters" @click="showMoreFilters = !showMoreFilters">Mais filtros<span v-if="extraFilterCount" class="audio-ops__section-count">{{ extraFilterCount }}</span></button>
        <button type="button" class="ordo-button ordo-button--primary" :disabled="clipsLoading" @click="applyClipFilters">{{ clipsLoading ? 'Buscando…' : 'Buscar' }}</button>
      </div>
      <div v-if="showMoreFilters" class="audio-ops__filters audio-ops__filters--more">
        <label>Provedor
          <select v-model="clipProviderFilter" @change="applyClipFilters">
            <option value="">Todos</option>
            <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>Voz
          <select v-model="clipVoiceFilter" @change="applyClipFilters">
            <option value="">Todas</option>
            <option v-for="voice in voiceOptions" :key="voice" :value="voice">{{ voice }}</option>
          </select>
        </label>
        <label>Textos curtos
          <select v-model="clipMaxCharacters" @change="applyClipFilters">
            <option value="">Todos</option>
            <option value="30">Até 30 caracteres</option>
            <option value="60">Até 60 caracteres</option>
            <option value="120">Até 120 caracteres</option>
          </select>
        </label>
      </div>

      <div v-if="clipsError" class="audio-ops__alert audio-ops__alert--error">{{ clipsError }}</div>
      <div v-if="clipsLoading && !clips.length" class="audio-ops__empty">Lendo clips…</div>
      <div v-else-if="!clips.length" class="audio-ops__empty">Nenhum clip corresponde aos filtros.</div>
      <div v-else class="audio-ops__clips" :class="{ 'is-loading': clipsLoading }">
        <article v-for="clip in clips" :key="clip.id" class="audio-ops__clip" :class="{ 'is-open': isExpanded(clip) }">
          <div class="audio-ops__clip-row">
            <div class="audio-ops__clip-copy">
              <div class="audio-ops__clip-headline">
                <span class="audio-ops__badge" :class="profileClass(clip.profile_status)">{{ profileLabel(clip.profile_status) }}</span>
                <span v-if="pendingCandidates(clip).length" class="audio-ops__badge audio-ops__badge--pending">{{ plural(pendingCandidates(clip).length, 'tentativa', 'tentativas') }} a revisar</span>
                <span>{{ clip.kind }} / {{ clip.line_type || 'linha' }} · {{ formatDuration(clip.duration) }} · {{ formatNumber(clip.character_count) }} caracteres</span>
              </div>
              <p class="audio-ops__clip-text" :class="{ 'is-clamped': !isExpanded(clip) }">{{ clip.text }}</p>
              <small v-if="clip.usages?.length && !isExpanded(clip)" class="audio-ops__clip-usage">{{ usageSummary(clip) }}</small>
            </div>
            <div class="audio-ops__clip-actions">
              <audio v-if="clip.audio_url" :src="clip.audio_url" controls preload="none" />
              <span v-else class="audio-ops__muted">URL indisponível</span>
              <div>
                <button type="button" class="audio-ops__link" :disabled="clipActionLoading[String(clip.id)]" @click="refreshClipUrl(clip)">nova URL</button>
                <button type="button" class="audio-ops__toggle" :aria-expanded="isExpanded(clip)" @click="toggleClip(clip)">{{ isExpanded(clip) ? 'Fechar' : 'Detalhes' }} <span aria-hidden="true">{{ isExpanded(clip) ? '▴' : '▾' }}</span></button>
              </div>
            </div>
          </div>

          <div v-if="pendingCandidates(clip).length" class="audio-ops__candidates">
            <article v-for="candidate in pendingCandidates(clip)" :key="candidate.id" class="audio-ops__candidate">
              <div>
                <strong>Nova tentativa</strong>
                <small>{{ formatDuration(candidate.duration) }} · {{ formatTimestamp(candidate.created_at) }}</small>
                <small v-if="candidate.custom_instructions">observação: {{ candidate.custom_instructions }}</small>
              </div>
              <div class="audio-ops__candidate-actions">
                <audio v-if="candidate.audio_url" :src="candidate.audio_url" controls preload="none" />
                <button type="button" class="audio-ops__link" :disabled="clipActionLoading[candidateActionKey(clip, candidate)]" @click="acceptCandidate(clip, candidate)">aprovar</button>
                <button type="button" class="audio-ops__link audio-ops__link--danger" :disabled="clipActionLoading[candidateActionKey(clip, candidate)]" @click="rejectCandidate(clip, candidate)">{{ clipActionLoading[candidateActionKey(clip, candidate)] ? 'descartando…' : 'descartar' }}</button>
              </div>
            </article>
          </div>

          <div v-if="isExpanded(clip)" class="audio-ops__clip-details">
            <dl class="audio-ops__clip-facts">
              <div><dt>Voz</dt><dd>{{ clip.provider }} · {{ clip.voice }} · {{ clip.language }}</dd></div>
              <div><dt>Criado</dt><dd>{{ formatTimestamp(clip.created_at) }}</dd></div>
              <div><dt>Versão</dt><dd>{{ shortFingerprint(clip.configuration_fingerprint) }}</dd></div>
              <div><dt>Instruções</dt><dd>{{ shortFingerprint(clip.instructions_sha256) }}</dd></div>
            </dl>
            <div v-if="clip.usages?.length" class="audio-ops__usages">
              <span v-for="usage in clip.usages" :key="`${usage.prayer_book_code}-${usage.source_name}-${usage.source_key}`">{{ usage.prayer_book_code }} / {{ usage.source_name }}</span>
            </div>
            <div class="audio-ops__customization">
              <label>Observação específica deste áudio
                <textarea v-model="clipInstructions[String(clip.id)]" maxlength="1000" rows="2" placeholder="Ex.: pronuncie “Efraim” com a tonicidade correta." />
              </label>
              <div class="audio-ops__customization-footer">
                <small>Usada só neste texto e nas próximas gerações dele; não muda a voz dos outros textos.</small>
                <button type="button" class="ordo-button ordo-button--quiet" :disabled="clipActionLoading[String(clip.id)]" @click="regenerateClip(clip)">{{ clipActionLoading[String(clip.id)] ? 'Enviando…' : 'Gerar nova tentativa' }}</button>
              </div>
            </div>
            <div v-if="reviewedCandidates(clip).length" class="audio-ops__history">
              <strong>Tentativas anteriores</strong>
              <div v-for="candidate in reviewedCandidates(clip)" :key="candidate.id">
                <span class="audio-ops__badge" :class="`audio-ops__badge--${candidate.status || 'unknown'}`">{{ candidateStatusLabel(candidate.status) }}</span>
                <small>{{ formatDuration(candidate.duration) }} · {{ formatTimestamp(candidate.created_at) }}<template v-if="candidate.custom_instructions"> · observação: {{ candidate.custom_instructions }}</template></small>
              </div>
            </div>
          </div>
        </article>
      </div>
      <div v-if="clipsPagination.total" class="audio-ops__pagination">
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <div>
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="currentPage <= 1 || clipsLoading" @click="changeClipPage(-1)">← Anterior</button>
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="currentPage >= totalPages || clipsLoading" @click="changeClipPage(1)">Próxima →</button>
        </div>
      </div>
    </OrdoChartCard>

    <div v-else class="audio-ops__grid">
      <OrdoChartCard title="Limpar perfis antigos" description="Pré-visualize antes de apagar. A operação remove o arquivo do storage e o registro do banco." icon="⌫" icon-color="orange" eyebrow="Manutenção destrutiva">
        <div class="audio-ops__form">
          <label>Quais áudios
            <select v-model="cleanupProfileStatus">
              <option value="legacy">Sem registro de versão</option>
              <option value="stale">Instruções antigas</option>
            </select>
          </label>
          <OrdoBookPicker v-model="cleanupBookCode" label="Só neste livro" empty-label="Todos os livros" :books="prayerBooks" />
        </div>
        <div v-if="cleanupError" class="audio-ops__alert audio-ops__alert--error">{{ cleanupError }}</div>
        <div v-if="cleanupPreview" class="audio-ops__cleanup-preview">
          <strong>{{ formatNumber(cleanupPreview.total_clips) }} clips selecionados</strong>
          <span>{{ formatNumber(cleanupPreview.total_characters) }} caracteres · {{ formatDuration(cleanupPreview.total_duration_seconds) }}</span>
        </div>
        <div class="audio-ops__actions">
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="cleanupLoading" @click="runCleanupPreview">{{ cleanupLoading ? 'Calculando…' : 'Pré-visualizar' }}</button>
          <button type="button" class="ordo-button ordo-button--danger" :disabled="cleanupLoading || !cleanupPreview?.total_clips" @click="enqueueCleanup">Enfileirar limpeza</button>
        </div>
      </OrdoChartCard>

      <OrdoChartCard title="Voz e índice" description="A versão vem da configuração da voz e das instruções; o texto das instruções não aparece aqui." icon="◎" icon-color="indigo" eyebrow="Rastreabilidade">
        <div v-if="currentProfiles.length" class="audio-ops__profiles">
          <div v-for="profile in currentProfiles" :key="`${profile.language}-${profile.configuration_fingerprint}`" class="audio-ops__profile">
            <div><strong>{{ profile.provider }} · {{ profile.voice }}</strong><span>{{ profile.language }} · {{ profile.model }}</span></div>
            <small>{{ shortFingerprint(profile.configuration_fingerprint) }} · {{ formatNumber(profile.clips) }} clips atuais</small>
          </div>
        </div>
        <div v-else class="audio-ops__empty">A voz atual aparece depois do primeiro catálogo indexado.</div>
        <div class="audio-ops__reindex">
          <OrdoBookPicker v-model="reindexBookCode" label="Livro a reindexar" :books="prayerBooks" :disabled="!prayerBooks.length" />
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="reindexLoading || !prayerBooks.length" @click="reindexCatalog">{{ reindexLoading ? 'Indexando…' : 'Reindexar usos' }}</button>
        </div>
      </OrdoChartCard>
    </div>
  </section>
</template>

<style scoped>
.audio-ops { display: grid; gap: 16px; min-width: 0; }
.audio-ops__toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.audio-ops__sections { display: inline-flex; flex-wrap: wrap; gap: 3px; padding: 3px; border: 1px solid var(--op-hair); border-radius: 12px; background: var(--op-paper-deep); }
.audio-ops__sections button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: 0; border-radius: 9px; background: transparent; color: var(--op-ink-soft); cursor: pointer; font: inherit; font-size: 13px; font-weight: 800; }
.audio-ops__sections button:hover { color: var(--op-ink); }
.audio-ops__sections button.is-active { background: #fff; color: var(--op-ink); box-shadow: 0 2px 6px rgba(13, 39, 68, .12); }
.audio-ops__section-count { display: inline-grid; min-width: 17px; height: 17px; padding: 0 5px; box-sizing: border-box; place-items: center; border-radius: 99px; background: var(--op-gold-light); color: var(--op-ink); font-size: 11.5px; font-weight: 800; }
.audio-ops__toolbar-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 9px; }
.audio-ops__live { display: inline-flex; align-items: center; gap: 7px; color: var(--op-ink-soft); font-size: 12px; font-weight: 700; }
.audio-ops__live i { width: 7px; height: 7px; border-radius: 50%; background: var(--op-action); box-shadow: 0 0 0 3px rgba(23, 84, 207, .16); }
.audio-ops__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.audio-ops__grid > * { min-width: 0; }
.audio-ops__alert { padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.45; }
.audio-ops__alert + .audio-ops__alert { margin-top: 8px; }
.audio-ops__alert--error { border: 1px solid rgba(180, 35, 24, .25); background: var(--op-danger-wash); color: var(--op-danger-ink); }
.audio-ops__alert--ok { border: 1px solid rgba(47, 106, 55, .25); background: var(--op-ok-wash); color: var(--op-ok); }
.audio-ops__note { margin: 13px 0 0; color: var(--op-ink-faint); font-size: 13px; line-height: 1.5; }

.audio-ops__tracked { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--op-hair); border-radius: 12px; background: var(--op-paper); }
.audio-ops__tracked-copy { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.audio-ops__tracked-copy strong { color: var(--op-ink); font-size: 12px; }
.audio-ops__tracked-copy small { color: var(--op-ink-faint); font-size: 12px; }
.audio-ops__tracked-actions { display: flex; align-items: center; gap: 10px; }
.audio-ops__dismiss { width: 24px; height: 24px; padding: 0; border: 1px solid var(--op-hair); border-radius: 8px; background: #fff; color: var(--op-ink-soft); cursor: pointer; font-size: 15px; line-height: 1; }

.audio-ops__attention { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid rgba(168, 128, 26, .3); border-radius: 13px; background: var(--op-gold-wash); }
.audio-ops__attention-item { display: flex; align-items: center; gap: 9px; min-width: 0; color: var(--op-ink); font-size: 12px; font-weight: 600; }
.audio-ops__attention-item > span { min-width: 0; flex: 1; }
.audio-ops__attention-item > i { display: grid; flex: 0 0 auto; width: 18px; height: 18px; place-items: center; border-radius: 50%; background: var(--op-card); color: var(--op-gold-ink); font-size: 12px; font-style: normal; font-weight: 800; }
.audio-ops__attention-item .audio-ops__link:disabled { cursor: wait; opacity: .6; }
.audio-ops__failures { display: grid; gap: 4px; margin: 0 0 2px 27px; padding: 0; list-style: none; }
.audio-ops__failures li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 6px 10px; border-radius: 9px; background: var(--op-card); color: var(--op-ink); font-size: 12px; }
.audio-ops__failures strong { font-weight: 700; }
.audio-ops__failure-time { color: var(--op-ink-faint); font-variant-numeric: tabular-nums; }
.audio-ops__failures small { overflow: hidden; flex-basis: 100%; color: var(--op-danger-ink); font-family: var(--op-font-mono); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__failure-error { margin: 0 0 0 27px; color: var(--op-danger-ink); font-size: 12px; }
.audio-ops__attention.is-calm { border-color: rgba(47, 106, 55, .2); background: var(--op-ok-wash); }
.audio-ops__attention.is-calm .audio-ops__attention-item { color: var(--op-ok); font-weight: 500; }
.audio-ops__attention.is-calm .audio-ops__attention-item > i { background: var(--op-card); color: var(--op-ok); }

.audio-ops__stats-card { border: 1px solid var(--op-hair); border-radius: 20px; background: var(--op-card); box-shadow: 0 12px 32px rgba(13, 39, 68, .06); }
.audio-ops__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.audio-ops__stats > * { padding: 16px 20px 10px; }
.audio-ops__stats > * + * { border-left: 1px solid var(--op-hair-soft); }
.audio-ops__coverage { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 11px 20px 13px; border-top: 1px solid var(--op-hair-soft); }
.audio-ops__coverage-label { margin-right: 4px; color: var(--op-ink-faint); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.audio-ops__coverage-chip { padding: 4px 8px; border: 1px solid var(--op-hair); border-radius: 99px; background: #fff; color: var(--op-ink-soft); font-size: 12px; }
.audio-ops__coverage-chip strong { color: var(--op-ink); }
.audio-ops__usage-note { margin: 12px 0 0; color: var(--op-ink-faint); font-size: 12px; line-height: 1.5; }
.audio-ops__usage-list { display: grid; gap: 12px; }
.audio-ops__usage-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; color: var(--op-ink-soft); font-size: 13px; }
.audio-ops__usage-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__usage-row strong { color: var(--op-ink); font-size: 13px; font-variant-numeric: tabular-nums; }
.audio-ops__usage-row i { grid-column: 1 / -1; height: 5px; overflow: hidden; border-radius: 99px; background: rgba(13, 39, 68, .06); }
.audio-ops__usage-row i b { display: block; height: 100%; border-radius: inherit; background: var(--op-action); }

.audio-ops__operation-stage { margin: 7px 0 0; color: var(--op-ink); font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.audio-ops__operation-report { margin-top: 9px; padding: 9px 10px; border: 1px solid var(--op-hair); border-radius: 10px; background: var(--op-ok-wash); }
.audio-ops__operation-report strong { display: block; color: var(--op-ok); font-size: 12px; }
.audio-ops__operation-report span { display: block; margin-top: 3px; color: var(--op-ink-soft); font-size: 12px; line-height: 1.45; }
.audio-ops__queue-states { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.audio-ops__queue-details { margin-top: 4px; }
.audio-ops__queue-details summary { color: var(--op-action); cursor: pointer; font-size: 13px; font-weight: 800; }
.audio-ops__queue-jobs { display: grid; gap: 7px; max-height: 260px; overflow: auto; margin-top: 10px; padding-right: 2px; }
.audio-ops__queue-job { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid var(--op-hair); border-radius: 10px; background: #fff; }
.audio-ops__queue-job > div { min-width: 0; }
.audio-ops__queue-job strong { display: block; overflow: hidden; color: var(--op-ink); font-size: 13px; text-overflow: ellipsis; }
.audio-ops__queue-job small { display: block; margin-top: 2px; color: var(--op-ink-faint); font-size: 11.5px; }
.audio-ops__badge--job-running { background: var(--op-wash); color: var(--op-action); }
.audio-ops__badge--job-ready, .audio-ops__badge--job-scheduled { background: var(--op-gold-wash); color: var(--op-gold-ink); }
.audio-ops__badge--job-blocked { background: rgba(13, 39, 68, .06); color: var(--op-ink-soft); }
.audio-ops__badge--job-orphaned, .audio-ops__badge--job-failed { background: var(--op-danger-wash); color: var(--op-danger); }

.audio-ops__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.audio-ops__form--three { grid-template-columns: minmax(0, 1.2fr) minmax(76px, .55fr) minmax(0, 1.5fr); }
.audio-ops__form--single { grid-template-columns: minmax(0, 1fr); }
.audio-ops__form label, .audio-ops__filters label, .audio-ops__reindex label { display: grid; gap: 5px; min-width: 0; color: var(--op-ink-soft); font-size: 12px; font-weight: 800; }
.audio-ops__form input, .audio-ops__form select, .audio-ops__filters input, .audio-ops__filters select, .audio-ops__reindex select { width: 100%; box-sizing: border-box; min-width: 0; padding: 9px 10px; border: 1px solid var(--op-hair); border-radius: 9px; outline: 0; background: #fff; color: var(--op-ink); font: inherit; font-size: 13px; }
.audio-ops__offices { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; border: 0; }
.audio-ops__offices legend { width: 100%; margin-bottom: 2px; color: var(--op-ink-soft); font-size: 12px; font-weight: 800; }
.audio-ops__check { display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; border: 1px solid var(--op-hair); border-radius: 9px; background: var(--op-paper); color: var(--op-ink-soft); font-size: 13px; }
.audio-ops__check input { accent-color: var(--op-action); }
.audio-ops__check small { color: var(--op-ink-faint); font-size: 12px; }
.audio-ops__book { grid-column: 1 / -1; }
.audio-ops__skeleton { display: grid; gap: 14px; }
.audio-ops__catalog-hint { text-align: right; }
.audio-ops__operation-corpora { display: block; margin-top: 6px; color: var(--op-ink-soft); font-size: 12px; }
.audio-ops__estimate { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 17px; padding: 12px; border: 1px solid var(--op-hair); border-radius: 12px; background: var(--op-paper); }
.audio-ops__estimate span, .audio-ops__estimate strong { display: block; }
.audio-ops__estimate span { color: var(--op-ink-faint); font-size: 11.5px; }
.audio-ops__estimate strong { margin-top: 4px; color: var(--op-ink); font-size: 16px; font-variant-numeric: tabular-nums; }
.audio-ops__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 17px; }

.audio-ops__operations { display: grid; gap: 9px; max-height: 360px; overflow: auto; padding-right: 2px; }
.audio-ops__operation { padding: 12px; border: 1px solid var(--op-hair); border-radius: 12px; background: #fff; }
.audio-ops__operation-topline, .audio-ops__operation-meta, .audio-ops__pagination { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.audio-ops__operation-topline strong { color: var(--op-ink); font-size: 12px; }
.audio-ops__operation small { display: block; margin-top: 5px; color: var(--op-ink-faint); font-size: 12px; }
.audio-ops__badge { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 99px; background: var(--op-paper); color: var(--op-ink-soft); font-size: 11.5px; font-weight: 800; white-space: nowrap; }
.audio-ops__badge--current, .audio-ops__badge--completed, .audio-ops__badge--accepted { background: var(--op-ok-wash); color: var(--op-ok); }
.audio-ops__badge--running { background: var(--op-wash); color: var(--op-action); }
.audio-ops__badge--queued, .audio-ops__badge--pending { background: var(--op-gold-wash); color: var(--op-gold-ink); }
.audio-ops__badge--stale { background: var(--op-gold-wash); color: var(--op-gold-ink); }
.audio-ops__badge--legacy, .audio-ops__badge--failed, .audio-ops__badge--rejected { background: var(--op-danger-wash); color: var(--op-danger); }
.audio-ops__progress { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: rgba(13, 39, 68, .06); }
.audio-ops__progress i { display: block; height: 100%; border-radius: inherit; background: var(--op-action); transition: width 300ms ease; }
.audio-ops__operation-meta { justify-content: flex-start; flex-wrap: wrap; margin-top: 6px; color: var(--op-ink-faint); font-size: 11.5px; }
.audio-ops__operation-retry { margin: 7px 0 0; padding: 7px 10px; border-radius: 9px; background: var(--op-warn-wash); color: var(--op-warn); font-size: 12px; line-height: 1.45; }
.audio-ops__badge--waiting { background: var(--op-warn-wash); color: var(--op-warn); }
.audio-ops__operation-error { margin: 7px 0 0; color: var(--op-danger); font-size: 12px; line-height: 1.4; }
.audio-ops__link { padding: 0; border: 0; background: transparent; color: var(--op-action); cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; }
.audio-ops__link:disabled { cursor: not-allowed; opacity: .45; }
.audio-ops__link--danger { color: var(--op-danger); }
.audio-ops__empty { padding: 25px 8px; color: var(--op-ink-faint); font-size: 13px; text-align: center; }
.audio-ops__count { color: var(--op-ink-faint); font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }

.audio-ops__filters { display: grid; grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(110px, 1fr)) auto auto; align-items: end; gap: 9px; margin-bottom: 12px; }
.audio-ops__filters--more { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: -2px; padding: 10px; border: 1px solid var(--op-hair); border-radius: 11px; background: var(--op-paper); }
.audio-ops__filter-wide { min-width: 0; }

.audio-ops__clips { display: grid; border: 1px solid var(--op-hair); border-radius: 13px; background: #fff; transition: opacity 160ms ease; }
.audio-ops__clips.is-loading { opacity: .55; }
.audio-ops__clip { min-width: 0; padding: 11px 14px; }
.audio-ops__clip + .audio-ops__clip { border-top: 1px solid var(--op-paper); }
.audio-ops__clip.is-open { background: var(--op-paper); }
.audio-ops__clip-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 250px); align-items: center; gap: 16px; }
.audio-ops__clip-copy { min-width: 0; }
.audio-ops__clip-headline { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; color: var(--op-ink-faint); font-size: 11.5px; }
.audio-ops__clip-text { margin: 6px 0 3px; color: var(--op-ink); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.audio-ops__clip-text.is-clamped { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
.audio-ops__clip-usage { display: block; overflow: hidden; color: var(--op-ink-faint); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__clip-actions { display: grid; gap: 5px; min-width: 0; }
.audio-ops__clip-actions audio { width: 100%; height: 32px; }
.audio-ops__clip-actions > div { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.audio-ops__toggle { padding: 0; border: 0; background: transparent; color: var(--op-ink); cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; }
.audio-ops__muted { color: var(--op-ink-faint); font-size: 12px; text-align: right; }

.audio-ops__candidates { display: grid; gap: 6px; margin-top: 9px; }
.audio-ops__candidate { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 330px); align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid rgba(168, 128, 26, .3); border-radius: 10px; background: var(--op-gold-wash); }
.audio-ops__candidate > div:first-child { display: grid; gap: 2px; min-width: 0; }
.audio-ops__candidate strong { color: var(--op-gold-ink); font-size: 13px; }
.audio-ops__candidate small { color: var(--op-gold-ink); font-size: 11.5px; line-height: 1.4; }
.audio-ops__candidate-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.audio-ops__candidate-actions audio { flex: 1; min-width: 0; height: 30px; }

.audio-ops__clip-details { display: grid; gap: 10px; margin-top: 11px; padding-top: 11px; border-top: 1px dashed var(--op-hair); }
.audio-ops__clip-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
.audio-ops__clip-facts > div { min-width: 0; }
.audio-ops__clip-facts dt { color: var(--op-ink-faint); font-size: 11.5px; font-weight: 800; text-transform: uppercase; }
.audio-ops__clip-facts dd { margin: 2px 0 0; overflow: hidden; color: var(--op-ink-soft); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__usages { display: flex; flex-wrap: wrap; gap: 5px; }
.audio-ops__usages span { padding: 4px 6px; border-radius: 6px; background: var(--op-paper); color: var(--op-ink-soft); font-size: 11.5px; }
.audio-ops__customization { display: grid; gap: 7px; padding: 10px; border: 1px solid var(--op-hair); border-radius: 10px; background: var(--op-paper); }
.audio-ops__customization label { display: grid; gap: 5px; color: var(--op-ink-soft); font-size: 12px; font-weight: 800; }
.audio-ops__customization textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 8px 9px; border: 1px solid var(--op-hair); border-radius: 8px; outline: 0; background: #fff; color: var(--op-ink); font: inherit; font-size: 13px; line-height: 1.4; }
.audio-ops__customization textarea:focus { border-color: var(--op-ok); box-shadow: 0 0 0 2px var(--op-ok-wash); }
.audio-ops__customization-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.audio-ops__customization-footer small { color: var(--op-ink-faint); font-size: 11.5px; line-height: 1.4; }
.audio-ops__customization-footer .ordo-button { flex: 0 0 auto; }
.audio-ops__history { display: grid; gap: 5px; }
.audio-ops__history > strong { color: var(--op-ink-soft); font-size: 12px; }
.audio-ops__history > div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.audio-ops__history small { overflow: hidden; color: var(--op-ink-faint); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__pagination { margin-top: 12px; color: var(--op-ink-faint); font-size: 12px; }
.audio-ops__pagination > div { display: flex; gap: 7px; }

.audio-ops__cleanup-preview { display: grid; gap: 4px; margin-top: 16px; padding: 12px; border: 1px solid rgba(168, 128, 26, .3); border-radius: 11px; background: var(--op-gold-wash); }
.audio-ops__cleanup-preview strong { color: var(--op-gold-ink); font-family: 'Fraunces', Georgia, serif; font-size: 19px; }
.audio-ops__cleanup-preview span { color: var(--op-gold-ink); font-size: 12px; }
.audio-ops__profiles { display: grid; gap: 8px; }
.audio-ops__profile { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px; border: 1px solid var(--op-hair); border-radius: 10px; background: #fff; }
.audio-ops__profile strong, .audio-ops__profile span, .audio-ops__profile small { display: block; }
.audio-ops__profile strong { color: var(--op-ink-soft); font-size: 13px; }
.audio-ops__profile span { margin-top: 3px; color: var(--op-ink-faint); font-size: 11.5px; }
.audio-ops__profile small { color: var(--op-ink-soft); font-size: 11.5px; text-align: right; }
.audio-ops__reindex { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 9px; margin-top: 14px; }
.ordo-button--danger { border-color: rgba(180, 35, 24, .25); background: var(--op-danger-wash); color: var(--op-danger); }

@media (max-width:1100px) {
  .audio-ops__filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .audio-ops__filter-wide { grid-column: 1 / -1; }
  .audio-ops__clip-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width:900px) {
  .audio-ops__grid { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__stats > * { padding-right: 14px; padding-left: 14px; }
}

@media (max-width:640px) {
  .audio-ops__stats { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__stats > * { padding-right: 20px; padding-left: 20px; }
  .audio-ops__stats > * + * { border-top: 1px solid var(--op-hair-soft); border-left: 0; }
}

@media (max-width:720px) {
  .audio-ops__toolbar { align-items: stretch; flex-direction: column; }
  .audio-ops__sections { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .audio-ops__sections button { justify-content: center; padding-right: 6px; padding-left: 6px; }
  .audio-ops__toolbar-actions { justify-content: space-between; }
  .audio-ops__estimate { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audio-ops__filters, .audio-ops__filters--more { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audio-ops__filters > .ordo-button { width: 100%; }
  .audio-ops__clip-row { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .audio-ops__clip-actions > div { justify-content: flex-start; }
  .audio-ops__candidate { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__candidate-actions { flex-wrap: wrap; justify-content: flex-start; }
  .audio-ops__candidate-actions audio { flex-basis: 100%; }
  .audio-ops__customization-footer { align-items: stretch; flex-direction: column; }
  .audio-ops__tracked { align-items: flex-start; }
  .audio-ops__pagination { display: block; }
  .audio-ops__pagination > div { margin-top: 9px; }
}

@media (max-width:480px) {
  .audio-ops__sections button { font-size: 12px; }
  .audio-ops__form, .audio-ops__form--three { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__filters, .audio-ops__filters--more { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__clip { padding: 11px 12px; }
  .audio-ops__clip-facts { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__actions { display: grid; grid-template-columns: 1fr; }
  .audio-ops__actions .ordo-button { width: 100%; }
  .audio-ops__reindex { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__profile { display: block; }
  .audio-ops__profile small { margin-top: 7px; text-align: left; }
}
</style>
