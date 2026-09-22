<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoStatList from './StatList.vue'
import { useOrdoDashboardPresentation, type DashboardStatItem } from '../../composables/useOrdoDashboardPresentation'
import { useOrdoApi } from '../../composables/useOrdoApi'
import type {
  AudioActiveJob,
  AudioCatalogRequest,
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
  purgeAudioWorkerQueue,
  reindexAudioCatalog,
  fetchAudioPrayerBooks
} = useOrdoApi()

const {
  formatNumber,
  formatDecimal,
  formatDuration,
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

const activeSection = ref<AudioSection>('overview')
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
const estimate = ref<AudioEstimate | null>(null)
const generationLoading = ref(false)
const generationError = ref<string | null>(null)

const catalog = reactive<AudioCatalogRequest>({ prayer_book_code: 'loc_2015', dry_run: false })
const catalogLoading = ref(false)
const catalogError = ref<string | null>(null)

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
const recentWindow = computed(() => summary.value?.recent || null)
const failedOperations = computed(() => summary.value?.operations?.failed_last_24_hours || 0)
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
  ...(deadJobs.value ? [{ key: 'dead', text: `${plural(deadJobs.value, 'job morto', 'jobs mortos')} na fila do worker`, section: null, action: null }] : []),
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
  { key: 'current', label: 'Perfil atual', value: formatNumber(summary.value?.current_clips), ...(currentShare.value == null ? {} : { hint: `${currentShare.value}% do catálogo` }) },
  { key: 'stale', label: 'Prompt antigo', value: formatNumber(summary.value?.stale_clips), hint: 'gerados com outra configuração' },
  { key: 'legacy', label: 'Sem fingerprint', value: formatNumber(summary.value?.legacy_clips), hint: 'legados, sem perfil registrado' },
  { key: 'candidates', label: 'Tentativas a revisar', value: formatNumber(pendingCandidateCount.value), ...(pendingCandidateCount.value ? { tone: 'attention' as const } : {}) }
])

const queueStats = computed<DashboardStatItem[]>(() => [
  { key: 'active', label: 'Operações ativas', value: formatNumber(summary.value?.active_operations), hint: 'enfileiradas ou executando' },
  { key: 'running', label: 'Jobs em execução', value: formatNumber(runningJobs.value) },
  { key: 'total', label: 'Jobs na fila', value: formatNumber(workerQueue.value?.total), hint: 'ainda sem conclusão' },
  { key: 'dead', label: 'Jobs mortos', value: formatNumber(deadJobs.value), ...(deadJobs.value ? { tone: 'attention' as const, hint: 'nada os executará' } : {}) },
  { key: 'failed', label: 'Operações falhas', value: formatNumber(failedOperations.value), hint: 'nas últimas 24 horas', ...(failedOperations.value ? { tone: 'attention' as const } : {}) }
])

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
  orphaned: 'morto'
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
  stale: 'Prompt antigo',
  legacy: 'Sem fingerprint'
}[status || ''] || humanizeKey(status || 'desconhecido'))

const profileClass = (status?: string) => `audio-ops__badge--${status || 'unknown'}`

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : 'Não foi possível carregar os dados de áudio.'

const generationPayload = (): AudioGenerationRequest => ({
  prayer_book_code: generation.prayer_book_code,
  start_date: generation.start_date,
  days: Math.min(Math.max(Number(generation.days) || 1, 1), 31),
  ...(generation.offices?.length ? { offices: [...generation.offices] } : {}),
  preferences: generation.preferences || {}
})

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

const enqueueCatalog = async (dryRun: boolean) => {
  catalogLoading.value = true
  catalogError.value = null
  try {
    const response = await enqueueAudioCatalog({ prayer_book_code: catalog.prayer_book_code, dry_run: dryRun })
    trackOperation(response.operation)
  } catch (reason) {
    catalogError.value = errorMessage(reason)
  } finally {
    catalogLoading.value = false
  }
}

const purgeQueue = async (scope: AudioWorkerQueuePurgeScope) => {
  const confirmation = scope === 'all'
    ? 'Apagar todos os jobs de áudio que ainda não rodaram? Os que já estão executando continuam.'
    : `Apagar ${formatNumber(deadJobs.value)} jobs mortos da fila? As operações que esperavam por eles serão canceladas.`
  if (!window.confirm(confirmation)) return

  queueLoading.value = true
  queueError.value = null
  queueNotice.value = null
  try {
    const result = await purgeAudioWorkerQueue(scope)
    queueNotice.value = `${formatNumber(result.purged_jobs)} jobs removidos · ${formatNumber(result.cancelled_operations)} operações canceladas.`
    await Promise.all([loadSummary(), loadOperations(true)])
  } catch (reason) {
    queueError.value = errorMessage(reason)
  } finally {
    queueLoading.value = false
  }
}

// A completed catalogue run — especially a dry run, whose only product is the
// report — carries its totals in `result`.
const catalogReport = (operation: AudioOperation) => {
  const result = operation.result
  if (!result || operation.kind !== 'generate_catalog') return null

  const asCount = (value: unknown) => typeof value === 'number' ? value : null
  return {
    dryRun: result.generate === false,
    ready: asCount(result.clips),
    generated: asCount(result.generated),
    missingCharacters: asCount(result.missing_characters),
    sources: Array.isArray(result.sources) ? result.sources.length : null
  }
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
  pollingTimer = setInterval(() => void pollOperations(), 4_000)
}

const stopPolling = () => {
  if (!pollingTimer) return
  clearInterval(pollingTimer)
  pollingTimer = null
}

watch(hasActiveWork, active => {
  if (active) startPolling()
  else stopPolling()
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

onMounted(loadAll)
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
        <span class="audio-ops__badge" :class="`audio-ops__badge--${lastEnqueued.status}`">{{ statusLabel(lastEnqueued.status) }}</span>
        <strong>{{ operationLabel(lastEnqueued.kind) }}</strong>
        <small>{{ lastEnqueued.prayer_book_code || 'Todos os LOCs' }} · {{ lastEnqueued.progress_percentage == null ? 'aguardando início' : `${lastEnqueued.progress_percentage}%` }}</small>
      </div>
      <div class="audio-ops__tracked-actions">
        <button type="button" class="audio-ops__link" @click="activeSection = 'overview'">Ver operações →</button>
        <button type="button" class="audio-ops__dismiss" aria-label="Dispensar aviso da operação" @click="lastEnqueuedId = null">×</button>
      </div>
    </div>

    <template v-if="activeSection === 'overview'">
      <div v-if="summary" class="audio-ops__attention" :class="{ 'is-calm': !attentionItems.length }">
        <template v-if="attentionItems.length">
          <div v-for="item in attentionItems" :key="item.key" class="audio-ops__attention-item">
            <i aria-hidden="true">!</i>
            <span>{{ item.text }}</span>
            <button v-if="item.section" type="button" class="audio-ops__link" @click="activeSection = item.section">{{ item.action }} →</button>
          </div>
        </template>
        <div v-else class="audio-ops__attention-item">
          <i aria-hidden="true">✓</i>
          <span>Nada pede atenção: sem tentativas a revisar, jobs mortos ou falhas nas últimas 24 horas.</span>
        </div>
      </div>

      <div v-if="summary" class="audio-ops__stats-card">
        <div class="audio-ops__stats">
          <OrdoStatList title="Catálogo" :items="catalogStats" />
          <OrdoStatList title="Qualidade" :items="qualityStats" />
          <OrdoStatList title="Fila" :items="queueStats" />
        </div>
        <div v-if="bookCoverage.length" class="audio-ops__coverage">
          <span class="audio-ops__coverage-label">Clips por livro</span>
          <span v-for="book in bookCoverage" :key="book.prayer_book_code" class="audio-ops__coverage-chip"><strong>{{ book.prayer_book_code }}</strong> {{ formatNumber(book.clips) }} clips · {{ formatNumber(book.sources) }} fontes</span>
        </div>
      </div>

      <div class="audio-ops__grid">
        <OrdoChartCard title="Operações recentes" description="Atualiza sozinha enquanto houver trabalho vivo na fila." icon="↻" icon-color="purple" eyebrow="Acompanhamento">
          <div v-if="!operations.length" class="audio-ops__empty">Nenhuma operação do catálogo novo foi registrada.</div>
          <div v-else class="audio-ops__operations">
            <article v-for="operation in operations.slice(0, 8)" :key="operation.id" class="audio-ops__operation">
              <div class="audio-ops__operation-topline">
                <strong>{{ operationLabel(operation.kind) }}</strong>
                <span class="audio-ops__badge" :class="`audio-ops__badge--${operation.status}`">{{ statusLabel(operation.status) }}</span>
              </div>
              <small>{{ operation.prayer_book_code || 'Todos os LOCs' }} · {{ formatTimestamp(operation.created_at) }}</small>
              <div v-if="operation.total_items" class="audio-ops__progress"><i :style="{ width: `${operation.progress_percentage || 0}%` }" /></div>
              <div class="audio-ops__operation-meta">
                <span>{{ operation.progress_percentage == null ? 'aguardando início' : `${operation.progress_percentage}%` }}</span>
                <span v-if="operation.generated_clips">{{ formatNumber(operation.generated_clips) }} clips novos</span>
                <span v-if="operation.skipped_clips">{{ formatNumber(operation.skipped_clips) }} preservados</span>
                <span v-if="operation.failed_items">{{ formatNumber(operation.failed_items) }} {{ operation.kind === 'generate_catalog' ? 'faltando' : 'falhas' }}</span>
              </div>
              <div v-if="catalogReport(operation)" class="audio-ops__operation-report">
                <strong>{{ catalogReport(operation)?.dryRun ? 'Simulação do catálogo' : 'Catálogo gerado' }}</strong>
                <span>{{ formatNumber(catalogReport(operation)?.ready) }} clips resolvidos · {{ formatNumber(catalogReport(operation)?.generated) }} gerados · {{ formatNumber(catalogReport(operation)?.missingCharacters) }} caracteres a gerar em {{ formatNumber(catalogReport(operation)?.sources) }} fontes</span>
              </div>
              <p v-if="operation.error_message" class="audio-ops__operation-error">{{ operation.error_message }}</p>
              <button v-if="isLive(operation)" type="button" class="audio-ops__link" @click="refreshOperation(operation)">Atualizar agora</button>
            </article>
          </div>
        </OrdoChartCard>

        <OrdoChartCard title="Fila do worker" description="Jobs do Solid Queue e o estado que diz se algo ainda vai executá-los. Um job sem execução registrada está morto." icon="≡" icon-color="orange" eyebrow="Worker">
          <div v-if="queueStateItems.length" class="audio-ops__queue-states">
            <span v-for="item in queueStateItems" :key="item.state" class="audio-ops__badge" :class="`audio-ops__badge--job-${item.state}`">{{ jobStateLabel(item.state) }} · {{ formatNumber(item.count) }}</span>
          </div>
          <div v-if="queueError" class="audio-ops__alert audio-ops__alert--error">{{ queueError }}</div>
          <div v-if="queueNotice" class="audio-ops__alert audio-ops__alert--ok">{{ queueNotice }}</div>
          <div v-if="!queueJobs.length" class="audio-ops__empty">A fila está vazia.</div>
          <details v-else class="audio-ops__queue-details">
            <summary>Ver {{ plural(queueJobs.length, 'job', 'jobs') }}</summary>
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
            <button type="button" class="ordo-button ordo-button--quiet" :disabled="queueLoading || !deadJobs" @click="purgeQueue('dead')">{{ queueLoading ? 'Limpando…' : `Apagar ${formatNumber(deadJobs)} mortos` }}</button>
            <button type="button" class="ordo-button ordo-button--danger" :disabled="queueLoading || !queueJobs.length" @click="purgeQueue('all')">Zerar fila</button>
          </div>
        </OrdoChartCard>
      </div>
    </template>

    <div v-else-if="activeSection === 'generate'" class="audio-ops__grid">
      <OrdoChartCard title="Gerar por data e LOC" description="Monta os ofícios reais de cada dia da janela. O worker reaproveita os clips existentes e só gera o que falta." icon="＋" icon-color="blue" eyebrow="Janela de datas">
        <div class="audio-ops__form audio-ops__form--three">
          <label>Prayer Book
            <select v-model="generation.prayer_book_code" @change="syncOffices">
              <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }} · {{ book.name }}</option>
            </select>
          </label>
          <label>Data inicial
            <input v-model="generation.start_date" type="date">
          </label>
          <label>Dias
            <input v-model.number="generation.days" type="number" min="1" max="31">
          </label>
        </div>
        <fieldset class="audio-ops__offices">
          <legend>Ofícios</legend>
          <label v-for="office in officeOptions" :key="office" class="audio-ops__check">
            <input type="checkbox" :checked="generation.offices?.includes(office)" @change="toggleOffice(office)">
            <span>{{ humanizeKey(office) }}</span>
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

      <OrdoChartCard title="Catálogo fixo do LOC" description="Todo texto, coleta, saltério e corpus bíblico que o livro pode ler, independente de data." icon="◫" icon-color="green" eyebrow="Livro inteiro">
        <div class="audio-ops__form audio-ops__form--single">
          <label>Prayer Book
            <select v-model="catalog.prayer_book_code">
              <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }} · {{ book.name }}</option>
            </select>
          </label>
        </div>
        <p class="audio-ops__note">A contagem percorre corpora inteiros e roda no worker. A simulação não compra nada: ela relata quantos clips faltariam.</p>
        <div v-if="catalogError" class="audio-ops__alert audio-ops__alert--error">{{ catalogError }}</div>
        <div class="audio-ops__actions">
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="catalogLoading || !prayerBooks.length" @click="enqueueCatalog(true)">{{ catalogLoading ? 'Enfileirando…' : 'Simular catálogo' }}</button>
          <button type="button" class="ordo-button ordo-button--primary" :disabled="catalogLoading || !prayerBooks.length" @click="enqueueCatalog(false)">Gerar catálogo <span>→</span></button>
        </div>
      </OrdoChartCard>
    </div>

    <OrdoChartCard v-else-if="activeSection === 'clips'" title="Catálogo de clips" description="Ouça, ajuste a observação de um texto e gere uma nova tentativa. O player usa URL assinada do storage." icon="⌕" icon-color="green" eyebrow="Revisão individual">
      <template #actions><span v-if="clipsPagination.total" class="audio-ops__count">{{ plural(clipsPagination.total, 'clip', 'clips') }}</span></template>
      <div class="audio-ops__filters">
        <label class="audio-ops__filter-wide">Texto
          <input v-model="clipSearch" type="search" placeholder="ex.: Pai nosso…" @keyup.enter="applyClipFilters">
        </label>
        <label>LOC
          <select v-model="clipBookFilter" @change="applyClipFilters">
            <option value="">Todos</option>
            <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }}</option>
          </select>
        </label>
        <label>Perfil
          <select v-model="clipProfileFilter" @change="applyClipFilters">
            <option value="all">Todos</option>
            <option value="current">Atual</option>
            <option value="stale">Prompt antigo</option>
            <option value="legacy">Sem fingerprint</option>
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
              <div><dt>Perfil</dt><dd>{{ clip.provider }} · {{ clip.voice }} · {{ clip.language }}</dd></div>
              <div><dt>Criado</dt><dd>{{ formatTimestamp(clip.created_at) }}</dd></div>
              <div><dt>Fingerprint</dt><dd>{{ shortFingerprint(clip.configuration_fingerprint) }}</dd></div>
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
                <small>Usada só neste texto e nas próximas gerações dele; não altera o fingerprint global.</small>
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
          <label>Perfil a remover
            <select v-model="cleanupProfileStatus">
              <option value="legacy">Sem fingerprint</option>
              <option value="stale">Prompt antigo</option>
            </select>
          </label>
          <label>Limitar ao LOC
            <select v-model="cleanupBookCode">
              <option value="">Todos</option>
              <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }}</option>
            </select>
          </label>
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

      <OrdoChartCard title="Perfil e índice" description="O fingerprint vem da configuração do provedor e das instruções, sem expor o prompt no painel." icon="◎" icon-color="indigo" eyebrow="Rastreabilidade">
        <div v-if="currentProfiles.length" class="audio-ops__profiles">
          <div v-for="profile in currentProfiles" :key="`${profile.language}-${profile.configuration_fingerprint}`" class="audio-ops__profile">
            <div><strong>{{ profile.provider }} · {{ profile.voice }}</strong><span>{{ profile.language }} · {{ profile.model }}</span></div>
            <small>{{ shortFingerprint(profile.configuration_fingerprint) }} · {{ formatNumber(profile.clips) }} clips atuais</small>
          </div>
        </div>
        <div v-else class="audio-ops__empty">O perfil atual aparecerá após o primeiro catálogo indexado.</div>
        <div class="audio-ops__reindex">
          <label>LOC a reindexar
            <select v-model="reindexBookCode">
              <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }}</option>
            </select>
          </label>
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="reindexLoading || !prayerBooks.length" @click="reindexCatalog">{{ reindexLoading ? 'Indexando…' : 'Reindexar usos' }}</button>
        </div>
      </OrdoChartCard>
    </div>
  </section>
</template>

<style scoped>
.audio-ops { display: grid; gap: 16px; min-width: 0; }
.audio-ops__toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.audio-ops__sections { display: inline-flex; flex-wrap: wrap; gap: 3px; padding: 3px; border: 1px solid #d8e1d5; border-radius: 12px; background: #edf3eb; }
.audio-ops__sections button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: 0; border-radius: 9px; background: transparent; color: #748275; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }
.audio-ops__sections button:hover { color: var(--moss-deep, #20372a); }
.audio-ops__sections button.is-active { background: #fff; color: var(--moss-deep, #20372a); box-shadow: 0 2px 6px rgba(38, 55, 44, .08); }
.audio-ops__section-count { display: inline-grid; min-width: 17px; height: 17px; padding: 0 5px; box-sizing: border-box; place-items: center; border-radius: 99px; background: #f2d7c5; color: #a95d43; font-size: 9px; font-weight: 800; }
.audio-ops__toolbar-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 9px; }
.audio-ops__live { display: inline-flex; align-items: center; gap: 7px; color: #6f8a74; font-size: 10px; font-weight: 700; }
.audio-ops__live i { width: 7px; height: 7px; border-radius: 50%; background: #6f9a77; box-shadow: 0 0 0 3px #dcebdc; }
.audio-ops__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.audio-ops__grid > * { min-width: 0; }
.audio-ops__alert { padding: 10px 12px; border-radius: 10px; font-size: 11px; line-height: 1.45; }
.audio-ops__alert + .audio-ops__alert { margin-top: 8px; }
.audio-ops__alert--error { border: 1px solid #edcfca; background: #fff4f1; color: #9d5d55; }
.audio-ops__alert--ok { border: 1px solid #cfe0d0; background: #f2f8f1; color: #4f7157; }
.audio-ops__note { margin: 13px 0 0; color: #7d8a7e; font-size: 11px; line-height: 1.5; }

.audio-ops__tracked { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid #dfe8dc; border-radius: 12px; background: #f7faf5; }
.audio-ops__tracked-copy { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.audio-ops__tracked-copy strong { color: #304735; font-size: 12px; }
.audio-ops__tracked-copy small { color: #8d998e; font-size: 10px; }
.audio-ops__tracked-actions { display: flex; align-items: center; gap: 10px; }
.audio-ops__dismiss { width: 24px; height: 24px; padding: 0; border: 1px solid #d9e3d7; border-radius: 8px; background: #fff; color: #798579; cursor: pointer; font-size: 15px; line-height: 1; }

.audio-ops__attention { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid #efdcca; border-radius: 13px; background: #fcf6ef; }
.audio-ops__attention-item { display: flex; align-items: center; gap: 9px; min-width: 0; color: #7e4d37; font-size: 12px; font-weight: 600; }
.audio-ops__attention-item > span { min-width: 0; flex: 1; }
.audio-ops__attention-item > i { display: grid; flex: 0 0 auto; width: 18px; height: 18px; place-items: center; border-radius: 50%; background: #f6e2d3; color: #a5552f; font-size: 10px; font-style: normal; font-weight: 800; }
.audio-ops__attention.is-calm { border-color: #dce8da; background: #f4f9f2; }
.audio-ops__attention.is-calm .audio-ops__attention-item { color: #4f6f57; font-weight: 500; }
.audio-ops__attention.is-calm .audio-ops__attention-item > i { background: #dfeede; color: #4d7159; }

.audio-ops__stats-card { border: 1px solid rgba(50, 73, 56, .12); border-radius: 20px; background: rgba(251, 252, 248, .88); box-shadow: 0 12px 32px rgba(38, 55, 44, .055); }
.audio-ops__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.audio-ops__stats > * { padding: 16px 20px 10px; }
.audio-ops__stats > * + * { border-left: 1px solid #e5ebe2; }
.audio-ops__coverage { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 11px 20px 13px; border-top: 1px solid #e5ebe2; }
.audio-ops__coverage-label { margin-right: 4px; color: #8b978b; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.audio-ops__coverage-chip { padding: 4px 8px; border: 1px solid #e3eae0; border-radius: 99px; background: #fff; color: #7b887c; font-size: 10px; }
.audio-ops__coverage-chip strong { color: #304735; }

.audio-ops__operation-report { margin-top: 9px; padding: 9px 10px; border: 1px solid #dfe8dc; border-radius: 10px; background: #f4f9f2; }
.audio-ops__operation-report strong { display: block; color: #3f6047; font-size: 10px; }
.audio-ops__operation-report span { display: block; margin-top: 3px; color: #71806f; font-size: 10px; line-height: 1.45; }
.audio-ops__queue-states { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.audio-ops__queue-details { margin-top: 4px; }
.audio-ops__queue-details summary { color: var(--moss, #496451); cursor: pointer; font-size: 11px; font-weight: 800; }
.audio-ops__queue-jobs { display: grid; gap: 7px; max-height: 260px; overflow: auto; margin-top: 10px; padding-right: 2px; }
.audio-ops__queue-job { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid #e4ebe1; border-radius: 10px; background: #fff; }
.audio-ops__queue-job > div { min-width: 0; }
.audio-ops__queue-job strong { display: block; overflow: hidden; color: #304735; font-size: 11px; text-overflow: ellipsis; }
.audio-ops__queue-job small { display: block; margin-top: 2px; color: #9aa59b; font-size: 9px; }
.audio-ops__badge--job-running { background: #e4eff1; color: #457180; }
.audio-ops__badge--job-ready, .audio-ops__badge--job-scheduled { background: #f6eadc; color: #af7147; }
.audio-ops__badge--job-blocked { background: #eceee9; color: #78827a; }
.audio-ops__badge--job-orphaned, .audio-ops__badge--job-failed { background: #f5e5e6; color: #a65c64; }

.audio-ops__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.audio-ops__form--three { grid-template-columns: minmax(0, 2fr) minmax(0, 1.3fr) minmax(70px, .7fr); }
.audio-ops__form--single { grid-template-columns: minmax(0, 1fr); }
.audio-ops__form label, .audio-ops__filters label, .audio-ops__reindex label { display: grid; gap: 5px; min-width: 0; color: #718073; font-size: 10px; font-weight: 800; }
.audio-ops__form input, .audio-ops__form select, .audio-ops__filters input, .audio-ops__filters select, .audio-ops__reindex select { width: 100%; box-sizing: border-box; min-width: 0; padding: 9px 10px; border: 1px solid #d8e2d6; border-radius: 9px; outline: 0; background: #fff; color: #2f4032; font: inherit; font-size: 11px; }
.audio-ops__offices { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; border: 0; }
.audio-ops__offices legend { width: 100%; margin-bottom: 2px; color: #718073; font-size: 10px; font-weight: 800; }
.audio-ops__check { display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; border: 1px solid #dce5da; border-radius: 9px; background: #f7faf5; color: #596b5b; font-size: 11px; }
.audio-ops__check input { accent-color: #496451; }
.audio-ops__estimate { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 17px; padding: 12px; border: 1px solid #e2e8df; border-radius: 12px; background: #f7faf5; }
.audio-ops__estimate span, .audio-ops__estimate strong { display: block; }
.audio-ops__estimate span { color: #8b988c; font-size: 9px; }
.audio-ops__estimate strong { margin-top: 4px; color: #304735; font-size: 16px; font-variant-numeric: tabular-nums; }
.audio-ops__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 17px; }

.audio-ops__operations { display: grid; gap: 9px; max-height: 360px; overflow: auto; padding-right: 2px; }
.audio-ops__operation { padding: 12px; border: 1px solid #e2e8df; border-radius: 12px; background: #fff; }
.audio-ops__operation-topline, .audio-ops__operation-meta, .audio-ops__pagination { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.audio-ops__operation-topline strong { color: #304735; font-size: 12px; }
.audio-ops__operation small { display: block; margin-top: 5px; color: #929d92; font-size: 10px; }
.audio-ops__badge { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 99px; background: #eef2ed; color: #718073; font-size: 9px; font-weight: 800; white-space: nowrap; }
.audio-ops__badge--current, .audio-ops__badge--completed, .audio-ops__badge--accepted { background: #e5f0e5; color: #4d7159; }
.audio-ops__badge--running { background: #e4eff1; color: #457180; }
.audio-ops__badge--queued, .audio-ops__badge--pending { background: #f6eadc; color: #af7147; }
.audio-ops__badge--stale { background: #f6eadc; color: #9b6b3e; }
.audio-ops__badge--legacy, .audio-ops__badge--failed, .audio-ops__badge--rejected { background: #f5e5e6; color: #a65c64; }
.audio-ops__progress { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: #eaf0e8; }
.audio-ops__progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #58775e, #adc39b); transition: width 300ms ease; }
.audio-ops__operation-meta { justify-content: flex-start; flex-wrap: wrap; margin-top: 6px; color: #8f9a90; font-size: 9px; }
.audio-ops__operation-error { margin: 7px 0 0; color: #a15f57; font-size: 10px; line-height: 1.4; }
.audio-ops__link { padding: 0; border: 0; background: transparent; color: #54745d; cursor: pointer; font: inherit; font-size: 10px; font-weight: 800; }
.audio-ops__link:disabled { cursor: not-allowed; opacity: .45; }
.audio-ops__link--danger { color: #a15f57; }
.audio-ops__empty { padding: 25px 8px; color: #8b978c; font-size: 11px; text-align: center; }
.audio-ops__count { color: #899589; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }

.audio-ops__filters { display: grid; grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(110px, 1fr)) auto auto; align-items: end; gap: 9px; margin-bottom: 12px; }
.audio-ops__filters--more { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: -2px; padding: 10px; border: 1px solid #e4ebe1; border-radius: 11px; background: #f7faf5; }
.audio-ops__filter-wide { min-width: 0; }

.audio-ops__clips { display: grid; border: 1px solid #e2e8df; border-radius: 13px; background: #fff; transition: opacity 160ms ease; }
.audio-ops__clips.is-loading { opacity: .55; }
.audio-ops__clip { min-width: 0; padding: 11px 14px; }
.audio-ops__clip + .audio-ops__clip { border-top: 1px solid #edf1eb; }
.audio-ops__clip.is-open { background: #fbfdf9; }
.audio-ops__clip-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 250px); align-items: center; gap: 16px; }
.audio-ops__clip-copy { min-width: 0; }
.audio-ops__clip-headline { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; color: #8d998e; font-size: 9px; }
.audio-ops__clip-text { margin: 6px 0 3px; color: #334536; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.audio-ops__clip-text.is-clamped { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
.audio-ops__clip-usage { display: block; overflow: hidden; color: #9aa59b; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__clip-actions { display: grid; gap: 5px; min-width: 0; }
.audio-ops__clip-actions audio { width: 100%; height: 32px; }
.audio-ops__clip-actions > div { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.audio-ops__toggle { padding: 0; border: 0; background: transparent; color: var(--moss-deep, #20372a); cursor: pointer; font: inherit; font-size: 10px; font-weight: 800; }
.audio-ops__muted { color: #a1aaa1; font-size: 10px; text-align: right; }

.audio-ops__candidates { display: grid; gap: 6px; margin-top: 9px; }
.audio-ops__candidate { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 330px); align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid #f0dcc4; border-radius: 10px; background: #fff8ee; }
.audio-ops__candidate > div:first-child { display: grid; gap: 2px; min-width: 0; }
.audio-ops__candidate strong { color: #8e643b; font-size: 11px; }
.audio-ops__candidate small { color: #a0896c; font-size: 9px; line-height: 1.4; }
.audio-ops__candidate-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.audio-ops__candidate-actions audio { flex: 1; min-width: 0; height: 30px; }

.audio-ops__clip-details { display: grid; gap: 10px; margin-top: 11px; padding-top: 11px; border-top: 1px dashed #e1e8de; }
.audio-ops__clip-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
.audio-ops__clip-facts > div { min-width: 0; }
.audio-ops__clip-facts dt { color: #97a297; font-size: 9px; font-weight: 800; text-transform: uppercase; }
.audio-ops__clip-facts dd { margin: 2px 0 0; overflow: hidden; color: #4d5e50; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__usages { display: flex; flex-wrap: wrap; gap: 5px; }
.audio-ops__usages span { padding: 4px 6px; border-radius: 6px; background: #f1f5ef; color: #6d7d6e; font-size: 9px; }
.audio-ops__customization { display: grid; gap: 7px; padding: 10px; border: 1px solid #dce7da; border-radius: 10px; background: #f8fbf6; }
.audio-ops__customization label { display: grid; gap: 5px; color: #627365; font-size: 10px; font-weight: 800; }
.audio-ops__customization textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 8px 9px; border: 1px solid #d5e0d3; border-radius: 8px; outline: 0; background: #fff; color: #334536; font: inherit; font-size: 11px; line-height: 1.4; }
.audio-ops__customization textarea:focus { border-color: #8eaa91; box-shadow: 0 0 0 2px #e7f0e5; }
.audio-ops__customization-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.audio-ops__customization-footer small { color: #8b998c; font-size: 9px; line-height: 1.4; }
.audio-ops__customization-footer .ordo-button { flex: 0 0 auto; }
.audio-ops__history { display: grid; gap: 5px; }
.audio-ops__history > strong { color: #536956; font-size: 10px; }
.audio-ops__history > div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.audio-ops__history small { overflow: hidden; color: #8b988c; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__pagination { margin-top: 12px; color: #879387; font-size: 10px; }
.audio-ops__pagination > div { display: flex; gap: 7px; }

.audio-ops__cleanup-preview { display: grid; gap: 4px; margin-top: 16px; padding: 12px; border: 1px solid #f0dcc4; border-radius: 11px; background: #fff8ee; }
.audio-ops__cleanup-preview strong { color: #8e643b; font-family: 'Fraunces', Georgia, serif; font-size: 19px; }
.audio-ops__cleanup-preview span { color: #a78b6c; font-size: 10px; }
.audio-ops__profiles { display: grid; gap: 8px; }
.audio-ops__profile { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 10px; border: 1px solid #e2e8df; border-radius: 10px; background: #fff; }
.audio-ops__profile strong, .audio-ops__profile span, .audio-ops__profile small { display: block; }
.audio-ops__profile strong { color: #3d5943; font-size: 11px; }
.audio-ops__profile span { margin-top: 3px; color: #909b90; font-size: 9px; }
.audio-ops__profile small { color: #6e826f; font-size: 9px; text-align: right; }
.audio-ops__reindex { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 9px; margin-top: 14px; }
.ordo-button--danger { border-color: #ebc9c4; background: #fff4f1; color: #995d55; }

@media (max-width: 1100px) {
  .audio-ops__filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .audio-ops__filter-wide { grid-column: 1 / -1; }
  .audio-ops__clip-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .audio-ops__grid { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__stats > * { padding-right: 14px; padding-left: 14px; }
}

@media (max-width: 640px) {
  .audio-ops__stats { grid-template-columns: minmax(0, 1fr); }
  .audio-ops__stats > * { padding-right: 20px; padding-left: 20px; }
  .audio-ops__stats > * + * { border-top: 1px solid #e5ebe2; border-left: 0; }
}

@media (max-width: 720px) {
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

@media (max-width: 480px) {
  .audio-ops__sections button { font-size: 10px; }
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
