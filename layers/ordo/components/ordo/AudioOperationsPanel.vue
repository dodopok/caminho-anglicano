<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoMetricCard from './MetricCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { useOrdoApi } from '../../composables/useOrdoApi'
import type {
  AudioCleanupPreview,
  AudioClip,
  AudioClipFilters,
  AudioEstimate,
  AudioGenerationRequest,
  AudioOperation,
  AudioPrayerBook,
  AudioProfileStatus,
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
  previewAudioCleanup,
  enqueueAudioCleanup,
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

const todayInput = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

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

const clipSearch = ref('')
const clipBookFilter = ref('')
const clipProfileFilter = ref<'all' | AudioProfileStatus>('all')
const clipProviderFilter = ref('')
const clipVoiceFilter = ref('')
const clipOffset = ref(0)
const clipSort = ref('created_at')
const clipDirection = ref<'asc' | 'desc'>('desc')

const cleanupBookCode = ref('')
const cleanupProfileStatus = ref<AudioProfileStatus>('legacy')
const cleanupPreview = ref<AudioCleanupPreview | null>(null)
const cleanupLoading = ref(false)
const cleanupError = ref<string | null>(null)

const clipActionLoading = ref<Record<string, boolean>>({})
const reindexLoading = ref(false)

let pollingTimer: ReturnType<typeof setInterval> | null = null

const selectedBook = computed(() => prayerBooks.value.find(book => book.code === generation.prayer_book_code) || null)
const officeOptions = computed(() => {
  const available = selectedBook.value?.available_offices || []
  return available.length ? available : DEFAULT_OFFICES
})
const profileOptions = computed(() => summary.value?.profiles || [])
const providerOptions = computed(() => [...new Set(profileOptions.value.map(profile => profile.provider).filter(Boolean))] as string[])
const voiceOptions = computed(() => [...new Set(profileOptions.value.map(profile => profile.voice).filter(Boolean))] as string[])
const currentProfiles = computed(() => profileOptions.value.filter(profile => profile.profile_status === 'current'))
const totalPages = computed(() => Math.max(1, Math.ceil(clipsPagination.value.total / CLIP_PAGE_SIZE)))
const currentPage = computed(() => Math.floor(clipOffset.value / CLIP_PAGE_SIZE) + 1)
const hasActiveOperations = computed(() => operations.value.some(operation => ['queued', 'running'].includes(operation.status)))
const activeWorkerJobs = computed(() => summary.value?.active_jobs || [])
const hasActiveWork = computed(() => hasActiveOperations.value || activeWorkerJobs.value.length > 0)

const statusLabel = (status?: string) => ({
  queued: 'Na fila',
  running: 'Executando',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado'
}[status || ''] || humanizeKey(status || 'desconhecido'))

const operationLabel = (kind?: string) => ({
  generate_office: 'Geração de ofícios',
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
  ...(generation.character_budget ? { character_budget: Number(generation.character_budget) } : {}),
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
  ...(clipVoiceFilter.value ? { voice: clipVoiceFilter.value } : {})
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
    operations.value = [response.operation, ...operations.value.filter(operation => operation.id !== response.operation.id)]
    estimate.value = null
  } catch (reason) {
    generationError.value = errorMessage(reason)
  } finally {
    generationLoading.value = false
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
  if (!window.confirm(`Regenerar o áudio de “${clip.text.slice(0, 80)}”?`)) return

  clipActionLoading.value = { ...clipActionLoading.value, [id]: true }
  try {
    const response = await regenerateAudioClip(clip.id)
    operations.value = [response.operation, ...operations.value.filter(operation => operation.id !== response.operation.id)]
  } catch (reason) {
    clipsError.value = errorMessage(reason)
  } finally {
    clipActionLoading.value = { ...clipActionLoading.value, [id]: false }
  }
}

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
    operations.value = [response.operation, ...operations.value.filter(operation => operation.id !== response.operation.id)]
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
    const response = await reindexAudioCatalog(generation.prayer_book_code)
    operations.value = [response.operation, ...operations.value.filter(operation => operation.id !== response.operation.id)]
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
    <div class="audio-ops__intro">
      <div>
        <p class="ordo-kicker">Operação de áudio</p>
        <h2>Geração, revisão e limpeza do catálogo.</h2>
        <p>Os clips são deduplicados pelo texto e pelo perfil atual do provedor. Cada operação roda no worker e pode ser acompanhada aqui.</p>
      </div>
      <div class="audio-ops__intro-actions">
        <span v-if="loading" class="ordo-loading-note"><i /> lendo catálogo…</span>
        <button type="button" class="ordo-button ordo-button--quiet" :disabled="loading" @click="loadAll">↻ Atualizar</button>
      </div>
    </div>

    <div v-if="error" class="audio-ops__alert audio-ops__alert--error">{{ error }}</div>

    <div class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard title="Clips no catálogo" :value="formatNumber(summary?.total_clips)" :subtitle="`${formatNumber(summary?.total_characters)} caracteres`" color="blue" icon="◷" eyebrow="Áudio" />
      <OrdoMetricCard title="Perfil atual" :value="formatNumber(summary?.current_clips)" :subtitle="`${formatNumber(summary?.stale_clips)} com prompt antigo`" color="green" icon="✓" eyebrow="Qualidade" />
      <OrdoMetricCard title="Legados" :value="formatNumber(summary?.legacy_clips)" subtitle="sem fingerprint de prompt" color="orange" icon="⌁" eyebrow="Manutenção" />
      <OrdoMetricCard title="Operações ativas" :value="formatNumber(summary?.active_operations)" subtitle="Solid Queue no worker" color="purple" icon="↻" eyebrow="Fila" />
    </div>

    <div class="audio-ops__grid">
      <OrdoChartCard title="Gerar por data e LOC" description="Estime antes de enfileirar. O worker reaproveita clips existentes e só chama o provedor para os faltantes." icon="＋" icon-color="blue" eyebrow="Nova operação">
        <div class="audio-ops__form">
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
          <label>Limite opcional de caracteres
            <input v-model.number="generation.character_budget" type="number" min="1" placeholder="automático">
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

      <OrdoChartCard title="Operações recentes" description="Atualização automática a cada 4 segundos enquanto houver trabalho na fila." icon="↻" icon-color="purple" eyebrow="Acompanhamento">
        <div v-if="activeWorkerJobs.length" class="audio-ops__worker-jobs">
          <div class="audio-ops__worker-jobs-headline"><strong>Jobs ativos no worker</strong><span>{{ formatNumber(activeWorkerJobs.length) }}</span></div>
          <small v-for="workerJob in activeWorkerJobs" :key="workerJob.active_job_id">{{ workerJob.class_name }} · {{ workerJob.active_job_id }} · {{ workerJob.claimed ? 'em execução' : 'na fila' }}</small>
        </div>
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
              <span v-if="operation.failed_items">{{ formatNumber(operation.failed_items) }} falhas</span>
            </div>
            <p v-if="operation.error_message" class="audio-ops__operation-error">{{ operation.error_message }}</p>
            <button v-if="['queued', 'running'].includes(operation.status)" type="button" class="audio-ops__link" @click="refreshOperation(operation)">Atualizar agora</button>
          </article>
        </div>
      </OrdoChartCard>
    </div>

    <OrdoChartCard title="Catálogo de clips" description="Busque pelo texto, filtre por LOC e identifique clips gerados por prompts antigos. O player usa URL assinada do storage." icon="⌕" icon-color="green" eyebrow="Revisão individual">
      <div class="audio-ops__filters">
        <label class="audio-ops__filter-wide">Texto
          <input v-model="clipSearch" type="search" placeholder="ex.: Pai nosso…" @keyup.enter="applyClipFilters">
        </label>
        <label>LOC
          <select v-model="clipBookFilter">
            <option value="">Todos</option>
            <option v-for="book in prayerBooks" :key="book.code" :value="book.code">{{ book.code }}</option>
          </select>
        </label>
        <label>Perfil
          <select v-model="clipProfileFilter">
            <option value="all">Todos</option>
            <option value="current">Atual</option>
            <option value="stale">Prompt antigo</option>
            <option value="legacy">Sem fingerprint</option>
          </select>
        </label>
        <label>Provedor
          <select v-model="clipProviderFilter">
            <option value="">Todos</option>
            <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
          </select>
        </label>
        <label>Voz
          <select v-model="clipVoiceFilter">
            <option value="">Todas</option>
            <option v-for="voice in voiceOptions" :key="voice" :value="voice">{{ voice }}</option>
          </select>
        </label>
        <button type="button" class="ordo-button ordo-button--primary" :disabled="clipsLoading" @click="applyClipFilters">{{ clipsLoading ? 'Buscando…' : 'Buscar' }}</button>
      </div>

      <div v-if="clipsError" class="audio-ops__alert audio-ops__alert--error">{{ clipsError }}</div>
      <div v-if="clipsLoading && !clips.length" class="audio-ops__empty">Lendo clips…</div>
      <div v-else-if="!clips.length" class="audio-ops__empty">Nenhum clip corresponde aos filtros.</div>
      <div v-else class="audio-ops__clips">
        <article v-for="clip in clips" :key="clip.id" class="audio-ops__clip">
          <div class="audio-ops__clip-copy">
            <div class="audio-ops__clip-headline">
              <span class="audio-ops__badge" :class="profileClass(clip.profile_status)">{{ profileLabel(clip.profile_status) }}</span>
              <span>{{ clip.provider }} · {{ clip.voice }} · {{ clip.language }}</span>
              <span>{{ formatNumber(clip.character_count) }} caracteres</span>
            </div>
            <p>{{ clip.text }}</p>
            <small>{{ clip.kind }} / {{ clip.line_type || 'linha' }} · {{ formatDuration(clip.duration) }} · criado {{ formatTimestamp(clip.created_at) }}</small>
            <div v-if="clip.usages?.length" class="audio-ops__usages">
              <span v-for="usage in clip.usages.slice(0, 4)" :key="`${usage.prayer_book_code}-${usage.source_name}-${usage.source_key}`">{{ usage.prayer_book_code }} / {{ usage.source_name }}</span>
              <span v-if="clip.usages.length > 4">+{{ clip.usages.length - 4 }} usos</span>
            </div>
            <small class="audio-ops__fingerprint">fingerprint {{ shortFingerprint(clip.configuration_fingerprint) }} · instruções {{ shortFingerprint(clip.instructions_sha256) }}</small>
          </div>
          <div class="audio-ops__clip-actions">
            <audio v-if="clip.audio_url" :src="clip.audio_url" controls preload="none" />
            <span v-else class="audio-ops__muted">URL indisponível</span>
            <div>
              <button type="button" class="audio-ops__link" :disabled="clipActionLoading[String(clip.id)]" @click="refreshClipUrl(clip)">nova URL</button>
              <button type="button" class="audio-ops__link audio-ops__link--danger" :disabled="clipActionLoading[String(clip.id)]" @click="regenerateClip(clip)">{{ clipActionLoading[String(clip.id)] ? 'enviando…' : 'regenerar' }}</button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="clipsPagination.total" class="audio-ops__pagination">
        <span>{{ formatNumber(clipsPagination.total) }} clips · página {{ currentPage }} de {{ totalPages }}</span>
        <div>
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="currentPage <= 1 || clipsLoading" @click="changeClipPage(-1)">← Anterior</button>
          <button type="button" class="ordo-button ordo-button--quiet" :disabled="currentPage >= totalPages || clipsLoading" @click="changeClipPage(1)">Próxima →</button>
        </div>
      </div>
    </OrdoChartCard>

    <div class="audio-ops__grid">
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

      <OrdoChartCard title="Perfil e índice" description="O fingerprint é calculado a partir da configuração do provedor e das instruções, sem expor o prompt no painel." icon="◎" icon-color="indigo" eyebrow="Rastreabilidade">
        <div v-if="currentProfiles.length" class="audio-ops__profiles">
          <div v-for="profile in currentProfiles" :key="`${profile.language}-${profile.configuration_fingerprint}`" class="audio-ops__profile">
            <div><strong>{{ profile.provider }} · {{ profile.voice }}</strong><span>{{ profile.language }} · {{ profile.model }}</span></div>
            <small>{{ shortFingerprint(profile.configuration_fingerprint) }} · {{ formatNumber(profile.clips) }} clips atuais</small>
          </div>
        </div>
        <div v-else class="audio-ops__empty">O perfil atual aparecerá após o primeiro catálogo indexado.</div>
        <button type="button" class="ordo-button ordo-button--quiet audio-ops__reindex" :disabled="reindexLoading || !prayerBooks.length" @click="reindexCatalog">{{ reindexLoading ? 'Indexando…' : `Reindexar usos de ${generation.prayer_book_code}` }}</button>
      </OrdoChartCard>
    </div>
  </section>
</template>

<style scoped>
.audio-ops { display: grid; gap: 18px; }
.audio-ops__intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.audio-ops__intro h2 { max-width: 660px; margin: 7px 0 6px; color: var(--moss-deep, #263a2b); font-family: 'Fraunces', Georgia, serif; font-size: clamp(25px, 3vw, 35px); font-weight: 600; letter-spacing: -.04em; line-height: 1; }
.audio-ops__intro p:not(.ordo-kicker) { max-width: 720px; margin: 0; color: #748176; font-size: 12px; line-height: 1.55; }
.audio-ops__intro-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 9px; }
.audio-ops__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.audio-ops__alert { padding: 10px 12px; border-radius: 10px; font-size: 11px; line-height: 1.45; }
.audio-ops__alert--error { border: 1px solid #edcfca; background: #fff4f1; color: #9d5d55; }
.audio-ops__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.audio-ops__form label, .audio-ops__filters label { display: grid; gap: 5px; color: #718073; font-size: 10px; font-weight: 800; }
.audio-ops__form input, .audio-ops__form select, .audio-ops__filters input, .audio-ops__filters select { width: 100%; box-sizing: border-box; min-width: 0; padding: 9px 10px; border: 1px solid #d8e2d6; border-radius: 9px; outline: 0; background: #fff; color: #2f4032; font: inherit; font-size: 11px; }
.audio-ops__offices { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; padding: 0; border: 0; }
.audio-ops__offices legend { width: 100%; margin-bottom: 2px; color: #718073; font-size: 10px; font-weight: 800; }
.audio-ops__check { display: inline-flex; align-items: center; gap: 6px; padding: 7px 9px; border: 1px solid #dce5da; border-radius: 9px; background: #f7faf5; color: #596b5b; font-size: 11px; }
.audio-ops__check input { accent-color: #496451; }
.audio-ops__estimate { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 17px; padding: 12px; border: 1px solid #e2e8df; border-radius: 12px; background: #f7faf5; }
.audio-ops__estimate span, .audio-ops__estimate strong { display: block; }
.audio-ops__estimate span { color: #8b988c; font-size: 9px; }
.audio-ops__estimate strong { margin-top: 4px; color: #304735; font-family: 'Fraunces', Georgia, serif; font-size: 18px; }
.audio-ops__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 17px; }
.audio-ops__operations { display: grid; gap: 9px; max-height: 335px; overflow: auto; padding-right: 2px; }
.audio-ops__worker-jobs { display: grid; gap: 5px; margin-bottom: 10px; padding: 10px; border: 1px solid #dbe6e7; border-radius: 11px; background: #f4f9f9; color: #668085; font-size: 9px; }
.audio-ops__worker-jobs-headline { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #416771; font-size: 10px; }
.audio-ops__worker-jobs small { overflow: hidden; color: #799197; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.audio-ops__operation { padding: 12px; border: 1px solid #e2e8df; border-radius: 12px; background: #fff; }
.audio-ops__operation-topline, .audio-ops__operation-meta, .audio-ops__clip-headline, .audio-ops__pagination { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.audio-ops__operation-topline strong { color: #304735; font-size: 12px; }
.audio-ops__operation small { display: block; margin-top: 5px; color: #929d92; font-size: 10px; }
.audio-ops__badge { display: inline-flex; align-items: center; padding: 4px 7px; border-radius: 99px; background: #eef2ed; color: #718073; font-size: 9px; font-weight: 800; white-space: nowrap; }
.audio-ops__badge--current, .audio-ops__badge--completed { background: #e5f0e5; color: #4d7159; }
.audio-ops__badge--running { background: #e4eff1; color: #457180; }
.audio-ops__badge--queued { background: #f6eadc; color: #af7147; }
.audio-ops__badge--stale { background: #f6eadc; color: #9b6b3e; }
.audio-ops__badge--legacy, .audio-ops__badge--failed { background: #f5e5e6; color: #a65c64; }
.audio-ops__progress { height: 5px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: #eaf0e8; }
.audio-ops__progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #58775e, #adc39b); transition: width 300ms ease; }
.audio-ops__operation-meta { margin-top: 6px; color: #8f9a90; font-size: 9px; }
.audio-ops__operation-error { margin: 7px 0 0; color: #a15f57; font-size: 10px; line-height: 1.4; }
.audio-ops__link { padding: 0; border: 0; background: transparent; color: #54745d; cursor: pointer; font: inherit; font-size: 10px; font-weight: 800; }
.audio-ops__link:disabled { cursor: not-allowed; opacity: .45; }
.audio-ops__link--danger { margin-left: 10px; color: #a15f57; }
.audio-ops__filters { display: grid; grid-template-columns: minmax(180px, 2fr) repeat(4, minmax(90px, 1fr)) auto; align-items: end; gap: 9px; margin-bottom: 15px; }
.audio-ops__filter-wide { min-width: 0; }
.audio-ops__empty { padding: 25px 8px; color: #8b978c; font-size: 11px; text-align: center; }
.audio-ops__clips { display: grid; gap: 8px; }
.audio-ops__clip { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); gap: 15px; padding: 13px; border: 1px solid #e2e8df; border-radius: 13px; background: #fff; }
.audio-ops__clip-copy { min-width: 0; }
.audio-ops__clip-headline { justify-content: flex-start; flex-wrap: wrap; color: #8d998e; font-size: 9px; }
.audio-ops__clip-copy p { margin: 9px 0 5px; color: #334536; font-size: 12px; line-height: 1.5; }
.audio-ops__clip-copy small { display: block; color: #929d92; font-size: 9px; line-height: 1.45; }
.audio-ops__usages { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.audio-ops__usages span { padding: 4px 6px; border-radius: 6px; background: #f1f5ef; color: #6d7d6e; font-size: 9px; }
.audio-ops__fingerprint { margin-top: 7px; color: #a0aaa0 !important; }
.audio-ops__clip-actions { display: grid; align-content: center; gap: 7px; min-width: 0; }
.audio-ops__clip-actions audio { width: 100%; max-width: 260px; height: 34px; }
.audio-ops__clip-actions > div { text-align: right; }
.audio-ops__muted { color: #a1aaa1; font-size: 10px; }
.audio-ops__pagination { margin-top: 15px; color: #879387; font-size: 10px; }
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
.audio-ops__reindex { width: 100%; margin-top: 13px; }
.ordo-button--danger { border-color: #ebc9c4; background: #fff4f1; color: #995d55; }

@media (max-width: 980px) {
  .audio-ops__filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .audio-ops__filter-wide { grid-column: span 2; }
  .audio-ops__filters > .ordo-button { grid-column: span 1; }
}

@media (max-width: 720px) {
  .audio-ops__intro, .audio-ops__grid { display: block; }
  .audio-ops__intro-actions { justify-content: flex-start; margin-top: 13px; }
  .audio-ops__grid > * + * { margin-top: 18px; }
  .audio-ops__estimate { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audio-ops__filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .audio-ops__filter-wide { grid-column: 1 / -1; }
  .audio-ops__filters > .ordo-button { grid-column: 1 / -1; }
  .audio-ops__clip { display: block; }
  .audio-ops__clip-actions { margin-top: 12px; }
  .audio-ops__clip-actions audio { max-width: none; }
  .audio-ops__clip-actions > div { text-align: left; }
  .audio-ops__pagination { display: block; }
  .audio-ops__pagination > div { margin-top: 9px; }
}

@media (max-width: 480px) {
  .audio-ops__form { grid-template-columns: 1fr; }
  .audio-ops__filters { display: block; }
  .audio-ops__filters > * + * { margin-top: 9px; }
  .audio-ops__actions { display: grid; grid-template-columns: 1fr; }
  .audio-ops__actions .ordo-button { width: 100%; }
  .audio-ops__profile { display: block; }
  .audio-ops__profile small { margin-top: 7px; text-align: left; }
}
</style>
