<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoCustomRosaryQueue from './CustomRosaryQueue.vue'
import OrdoDataExplorerModal from './DataExplorerModal.vue'
import OrdoLifeRulesQueue from './LifeRulesQueue.vue'
import OrdoMetricCard from './MetricCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type {
  CustomRosaryPrayer,
  CustomRosaryPagination,
  CustomRosaryShareStatus,
  CustomRosarySortDirection,
  CustomRosarySortKey,
  DashboardData,
  LifeRule,
  LifeRulePagination,
  LifeRuleStatus
} from '../../types/dashboard'
import type { ExplorerColumn, ExplorerFilter, ExplorerRow, ExplorerValue } from '../../types/explorer'

const props = defineProps<{
  dashboard: DashboardData
  lifeRules: LifeRule[]
  lifeRulesPagination?: LifeRulePagination | null
  lifeRulesLoading: boolean
  lifeRulesError?: string | null
  lifeRuleStatus: LifeRuleStatus
  lifeRuleSearch: string
  lifeRuleCurrentPage: number
  lifeRuleTotalPages: number
  customRosaries: CustomRosaryPrayer[]
  customRosaryPagination?: CustomRosaryPagination | null
  customRosariesLoading: boolean
  customRosariesError?: string | null
  customRosaryStatus: Exclude<CustomRosaryShareStatus, 'private'>
  customRosarySearch: string
  customRosarySort: CustomRosarySortKey
  customRosarySortDirection: CustomRosarySortDirection
  customRosaryCurrentPage: number
  customRosaryTotalPages: number
  selectedRosaryStatusItems: Array<{ key: string; label: string; value: number }>
}>()

const emit = defineEmits<{
  'update:lifeRuleStatus': [value: LifeRuleStatus]
  'update:lifeRuleSearch': [value: string]
  'search-life-rules': []
  'change-life-rule-page': [direction: number]
  'update:customRosaryStatus': [value: Exclude<CustomRosaryShareStatus, 'private'>]
  'update:customRosarySearch': [value: string]
  'search-custom-rosaries': []
  'change-custom-rosary-sort': [key: CustomRosarySortKey, direction: CustomRosarySortDirection]
  'change-custom-rosary-status': []
  'change-custom-rosary-page': [direction: number]
  'open-rosary': [rosary: CustomRosaryPrayer]
}>()

const {
  asNumber,
  formatNumber,
  formatDecimal,
  formatPercent,
  formatDuration,
  formatTimestamp,
  formatExplorerValue,
  mapItems,
  maxItemValue,
  humanizeKey
} = useOrdoDashboardPresentation()

type ExplorerName = 'audio' | 'notifications' | 'lifeRules' | 'adoptions' | 'moderation' | 'health' | 'customRosaries' | null

const activeExplorer = ref<ExplorerName>(null)

const notificationStatusItems = computed(() => mapItems(props.dashboard.notifications?.delivery_status_counts))
const estimatedMissingCharacters = computed(() => Object.values(props.dashboard.audio?.estimated_missing_characters || {}).reduce((total, value) => total + value, 0))
const moderation = computed(() => props.dashboard.moderation?.custom_rosaries)
const customRosaryExplorerPagination = computed(() => ({
  currentPage: props.customRosaryCurrentPage,
  totalPages: props.customRosaryTotalPages,
  total: props.customRosaryPagination?.total ?? props.customRosaries.length
}))

const audioColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'prayer_book', label: 'Prayer book', sortable: true },
  { key: 'voice', label: 'Voz', sortable: true },
  { key: 'total_texts', label: 'Textos', sortable: true, align: 'right' },
  { key: 'texts_with_audio', label: 'Com áudio', sortable: true, align: 'right' },
  { key: 'coverage_percentage', label: 'Cobertura', sortable: true, align: 'right' },
  { key: 'missing_characters', label: 'Caracteres faltantes', sortable: true, align: 'right' }
]
const audioRows = computed<ExplorerRow[]>(() => [
  ...(props.dashboard.audio?.by_voice || []).map(item => ({
    id: `all-${item.voice}`,
    values: { category: 'Total por voz', prayer_book: 'Todos', voice: item.voice, total_texts: asNumber(item.total_texts), texts_with_audio: asNumber(item.texts_with_audio), coverage_percentage: asNumber(item.coverage_percentage), missing_characters: asNumber(item.missing_characters) }
  })),
  ...(props.dashboard.audio?.by_prayer_book || []).flatMap(book => (book.by_voice?.length ? book.by_voice : [{ voice: 'Todas', total_texts: book.total_texts, texts_with_audio: book.texts_with_audio, coverage_percentage: book.coverage_percentage, missing_characters: undefined }]).map(item => ({
    id: `${book.code || book.prayer_book_id}-${item.voice}`,
    values: { category: 'Por prayer book', prayer_book: book.code || String(book.prayer_book_id), voice: item.voice, total_texts: asNumber(item.total_texts), texts_with_audio: asNumber(item.texts_with_audio), coverage_percentage: asNumber(item.coverage_percentage), missing_characters: asNumber(item.missing_characters) }
  })))
])

const notificationColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'platform', label: 'Plataforma', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const notificationRows = computed<ExplorerRow[]>(() => [
  { id: 'total', values: { category: 'Resumo', item: 'Total no período', platform: 'Todos', value: asNumber(props.dashboard.notifications?.total_in_period) } },
  { id: 'sent', values: { category: 'Resumo', item: 'Enviadas', platform: 'Todos', value: asNumber(props.dashboard.notifications?.sent) } },
  { id: 'failed', values: { category: 'Resumo', item: 'Falhas', platform: 'Todos', value: asNumber(props.dashboard.notifications?.failed) } },
  { id: 'success', values: { category: 'Resumo', item: 'Taxa de sucesso', platform: 'Todos', value: asNumber(props.dashboard.notifications?.success_rate), value_kind: 'percentage' } },
  { id: 'last-day', values: { category: 'Resumo', item: 'Falhas nas últimas 24h', platform: 'Todos', value: asNumber(props.dashboard.notifications?.failures_last_24_hours) } },
  ...mapItems(props.dashboard.notifications?.by_type).map(item => ({ id: `type-${item.key}`, values: { category: 'Tipo', item: humanizeKey(item.key), platform: 'Todos', value: item.value } })),
  ...mapItems(props.dashboard.notifications?.delivery_status_counts).map(item => ({ id: `status-${item.key}`, values: { category: 'Status de entrega', item: humanizeKey(item.key), platform: 'Todos', value: item.value } })),
  ...Object.entries(props.dashboard.notifications?.delivery_status_by_platform || {}).flatMap(([platform, statuses]) => mapItems(statuses).map(item => ({ id: `${platform}-${item.key}`, values: { category: 'Status por plataforma', item: humanizeKey(item.key), platform, value: item.value } })))
])

const lifeRuleColumns: ExplorerColumn[] = [
  { key: 'id', label: 'ID', sortable: true, align: 'right' },
  { key: 'title', label: 'Regra', sortable: true },
  { key: 'owner', label: 'Autor', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'is_public', label: 'Pública', sortable: true },
  { key: 'approved', label: 'Aprovada', sortable: true },
  { key: 'adoption_count', label: 'Adoções', sortable: true, align: 'right' },
  { key: 'steps', label: 'Etapas', sortable: true, align: 'right' },
  { key: 'created_at', label: 'Criada em', sortable: true },
  { key: 'updated_at', label: 'Atualizada em', sortable: true },
  { key: 'pending_at', label: 'Pendente desde', sortable: true }
]
const lifeRuleFilters = computed<ExplorerFilter[]>(() => [{
  key: 'status',
  label: 'Status',
  options: [...new Set(props.lifeRules.map(item => item.approved ? 'approved' : 'pending'))].map(value => ({ value, label: humanizeKey(value) }))
}])
const lifeRuleRows = computed<ExplorerRow[]>(() => props.lifeRules.map(item => ({
  id: item.id,
  searchable: `${item.title} ${item.description || ''} ${item.owner?.name || ''}`,
  values: {
    id: item.id,
    title: item.title,
    owner: item.owner?.name || '—',
    status: item.approved ? 'approved' : 'pending',
    is_public: Boolean(item.is_public),
    approved: Boolean(item.approved),
    adoption_count: asNumber(item.adoption_count),
    steps: item.steps?.length || 0,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    pending_at: item.pending_since || null
  }
})))
const lifeRuleAdoptionColumns: ExplorerColumn[] = [
  { key: 'id', label: 'ID', sortable: true, align: 'right' },
  { key: 'title', label: 'Regra', sortable: true },
  { key: 'adoptions', label: 'Adoções', sortable: true, align: 'right' }
]
const lifeRuleAdoptionRows = computed<ExplorerRow[]>(() => (props.dashboard.life_rules?.top_adopted || []).map(item => ({
  id: item.id || item.title,
  values: { id: item.id || '—', title: item.title, adoptions: asNumber(item.adoptions) }
})))

const moderationColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Fila', sortable: true },
  { key: 'metric', label: 'Métrica', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const moderationRows = computed<ExplorerRow[]>(() => {
  const rosaries = props.dashboard.moderation?.custom_rosaries
  const rules = props.dashboard.moderation?.life_rules
  return [
    ...[
      ['Pendentes agora', rosaries?.pending_now],
      ['Mais antiga em', rosaries?.oldest_pending_at, 'timestamp'],
      ['Idade da mais antiga', rosaries?.oldest_pending_age_seconds, 'duration'],
      ['Aprovadas no período', rosaries?.approved_in_period],
      ['Rejeitadas no período', rosaries?.rejected_in_period],
      ['Taxa de aprovação', rosaries?.approval_rate, 'percentage'],
      ['Tempo médio de resposta', rosaries?.average_response_time_seconds, 'duration'],
      ['Reentradas no período', rosaries?.reentries_in_period],
      ['Reentradas totais', rosaries?.total_reentries],
      ['Aprovadas sem Strapi', rosaries?.approved_without_strapi]
    ].map(([metric, value, value_kind], index) => ({ id: `rosary-${index}`, values: { category: 'Rosários', metric, value: value ?? null, value_kind: value_kind || 'number' } })),
    ...[
      ['Pendentes agora', rules?.pending_now],
      ['Mais antiga em', rules?.oldest_pending_at, 'timestamp'],
      ['Idade da mais antiga', rules?.oldest_pending_age_seconds, 'duration']
    ].map(([metric, value, value_kind], index) => ({ id: `rule-${index}`, values: { category: 'Regras de vida', metric, value: value ?? null, value_kind: value_kind || 'number' } }))
  ]
})

const healthColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Área', sortable: true },
  { key: 'item', label: 'Indicador', sortable: true },
  { key: 'detail', label: 'Detalhe', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const healthRows = computed<ExplorerRow[]>(() => [
  ...mapItems(props.dashboard.health?.notifications?.failed_by_type).map(item => ({ id: `notification-${item.key}`, values: { category: 'Notificações', item: `Falhas · ${humanizeKey(item.key)}`, detail: 'Tipo', value: item.value } })),
  { id: 'audio-failed', values: { category: 'Áudio', item: 'Sessões falhas', detail: 'Histórico', value: asNumber(props.dashboard.health?.audio_sessions?.failed) } },
  { id: 'audio-running', values: { category: 'Áudio', item: 'Sessões rodando', detail: 'Agora', value: asNumber(props.dashboard.health?.audio_sessions?.running) } },
  { id: 'audio-stale', values: { category: 'Áudio', item: 'Sessões travadas', detail: 'Agora', value: asNumber(props.dashboard.health?.audio_sessions?.stale_running) } },
  ...(props.dashboard.health?.audio_sessions?.stale_running_sessions || []).map(session => ({ id: `stale-${session.id}`, values: { category: 'Áudio', item: `Sessão ${session.id}`, detail: session.prayer_book_code || 'Prayer book não informado', value: session.started_at || null, value_kind: 'timestamp' } })),
  { id: 'keys-expiring', values: { category: 'API keys', item: 'Expiram em 30 dias', detail: 'Base total', value: asNumber(props.dashboard.health?.api_keys?.expiring_next_30_days) } },
  ...(props.dashboard.health?.api_keys?.expiring_keys || []).map(key => ({ id: `expiring-${key.id}`, values: { category: 'API keys', item: key.name, detail: `ID ${key.id}`, value: key.expires_at || null, value_kind: 'timestamp' } }))
])

const customRosaryColumns: ExplorerColumn[] = [
  { key: 'title', label: 'Rosário', sortable: true },
  { key: 'author', label: 'Autor', sortable: true },
  { key: 'locale', label: 'Idioma', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'cycle_repeat', label: 'Ciclo', sortable: true, align: 'right' },
  { key: 'is_public', label: 'Público', sortable: true },
  { key: 'blocks', label: 'Blocos', sortable: false, align: 'right' },
  { key: 'expanded_steps', label: 'Passos expandidos', sortable: false, align: 'right' },
  { key: 'reentries', label: 'Reentradas', sortable: true, align: 'right' },
  { key: 'strapi_slug', label: 'Slug Strapi', sortable: true },
  { key: 'created_at', label: 'Criado em', sortable: true },
  { key: 'updated_at', label: 'Atualizado em', sortable: true },
  { key: 'reviewed_at', label: 'Revisado em', sortable: true }
]
const customRosaryRows = computed<ExplorerRow[]>(() => props.customRosaries.map(item => ({
  id: item.id,
  searchable: `${item.title} ${item.description || ''} ${item.author?.name || ''}`,
  values: {
    title: item.title,
    author: item.author?.name || '—',
    locale: item.locale || '—',
    status: item.share_status || '—',
    cycle_repeat: item.cycle_repeat || 0,
    is_public: Boolean(item.is_public),
    blocks: item.blocks?.length || 0,
    expanded_steps: item.expanded_steps_count ?? item.expanded_steps?.length ?? 0,
    reentries: item.moderation_reentry_count || 0,
    strapi_slug: item.strapi_slug || '—',
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    reviewed_at: item.reviewed_at || null
  }
})))

const customRosarySortKeys: CustomRosarySortKey[] = [
  'created_at',
  'updated_at',
  'title',
  'author',
  'locale',
  'status',
  'publication_status',
  'cycle_repeat',
  'is_public',
  'strapi_slug',
  'reviewed_at',
  'reentries'
]

const onCustomRosaryRemoteSort = (key: string, direction: 'asc' | 'desc') => {
  if (customRosarySortKeys.includes(key as CustomRosarySortKey)) {
    emit('change-custom-rosary-sort', key as CustomRosarySortKey, direction)
  }
}

const formatOperationsExplorerValue = (value: ExplorerValue, _key: string, row: ExplorerRow) => {
  if (row.values.value_kind === 'percentage') return formatPercent(typeof value === 'number' ? value : Number(value))
  if (row.values.value_kind === 'duration') return formatDuration(typeof value === 'number' ? value : Number(value))
  if (row.values.value_kind === 'timestamp') return formatTimestamp(value == null ? null : String(value))
  return formatExplorerValue(value, _key)
}
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Operação & moderação</p><h2>O que precisa de uma decisão humana.</h2></div><span class="ordo-scope-label">fila atual + métricas do período</span></div>

    <div class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard v-if="moderation" title="Rosários em revisão" :value="formatNumber(moderation.pending_now)" :subtitle="`${formatNumber(moderation.approved_without_strapi)} aprovados sem Strapi`" color="orange" icon="◌" eyebrow="Moderação" />
      <OrdoMetricCard v-if="dashboard.life_rules" title="Regras pendentes" :value="formatNumber(dashboard.life_rules.pending_rules)" :subtitle="`${formatNumber(dashboard.life_rules.total_adoptions)} adoções históricas`" color="purple" icon="⌁" eyebrow="Regras de vida" />
      <OrdoMetricCard v-if="dashboard.health?.notifications" title="Falhas nas últimas 24h" :value="formatNumber(dashboard.health.notifications.failures_last_24_hours)" subtitle="notificações FCM" color="pink" icon="!" eyebrow="Saúde" />
      <OrdoMetricCard v-if="dashboard.health?.audio_sessions" title="Áudio travado" :value="formatNumber(dashboard.health.audio_sessions.stale_running)" :subtitle="`${formatNumber(dashboard.health.audio_sessions.failed)} falhas históricas`" color="blue" icon="◷" eyebrow="Geração" />
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.audio" title="Cobertura de áudio" description="Vozes conhecidas: male_1, female_1 e male_2." icon="◷" icon-color="blue" eyebrow="Áudio"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'audio'">Ver por livro ↗</button></template><div class="ordo-stat-banner"><strong>{{ formatPercent(dashboard.audio.audio_coverage_percentage) }}</strong><span>{{ formatNumber(dashboard.audio.texts_with_audio) }} de {{ formatNumber(dashboard.audio.total_texts) }} textos</span></div><div class="ordo-highlight-grid"><div><span>Concluídas</span><strong>{{ formatNumber(dashboard.audio.completed_sessions) }}</strong></div><div><span>Rodando</span><strong>{{ formatNumber(dashboard.audio.running_sessions) }}</strong></div><div><span>Falhas</span><strong>{{ formatNumber(dashboard.audio.failed_sessions) }}</strong></div><div><span>Processados</span><strong>{{ formatNumber(dashboard.audio.total_texts_processed) }}</strong></div><div><span>Falhos</span><strong>{{ formatNumber(dashboard.audio.total_texts_failed) }}</strong></div><div><span>Custo estimado</span><strong>{{ dashboard.audio.estimated_missing_cost == null ? '—' : `US$ ${formatDecimal(dashboard.audio.estimated_missing_cost, 2)}` }}</strong></div></div><div class="ordo-note-box"><span>Caracteres faltantes</span><strong>{{ formatNumber(estimatedMissingCharacters) }}</strong><small>estimativa somada por voz<span v-if="dashboard.audio.cost_per_1000_characters != null"> · US$ {{ formatDecimal(dashboard.audio.cost_per_1000_characters, 2) }}/1.000 caracteres</span></small></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.notifications" title="Entrega de notificações" description="O token bruto nunca aparece no dashboard; status são agregados por hash." icon="⌁" icon-color="pink" eyebrow="Notificações"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'notifications'">Ver detalhes ↗</button></template><div class="ordo-highlight-grid"><div><span>Logs</span><strong>{{ formatNumber(dashboard.notifications.total_in_period) }}</strong></div><div><span>Enviadas</span><strong>{{ formatNumber(dashboard.notifications.sent) }}</strong></div><div><span>Falhas</span><strong>{{ formatNumber(dashboard.notifications.failed) }}</strong></div><div><span>Sucesso</span><strong>{{ formatPercent(dashboard.notifications.success_rate) }}</strong></div></div><div class="ordo-mini-bars"><div v-for="item in notificationStatusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-pink" :style="{ width: `${(item.value / maxItemValue(notificationStatusItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.life_rules" title="Regras mais adotadas" description="Ranking completo de adoções históricas recebido pelo backend." icon="⌁" icon-color="purple" eyebrow="Regras de vida"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'lifeRules'">Ver ranking ↗</button></template><div class="ordo-mini-bars"><div v-for="item in dashboard.life_rules.top_adopted || []" :key="item.id || item.title"><span>{{ item.title }}</span><strong>{{ formatNumber(item.adoptions) }}</strong><i><b class="is-purple" :style="{ width: `${(Number(item.adoptions || 0) / Math.max(...(dashboard.life_rules?.top_adopted || []).map(rule => Number(rule.adoptions || 0)), 1)) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.health" title="Saúde operacional" description="Falhas, sessões travadas e chaves próximas do vencimento." icon="✓" icon-color="green" eyebrow="Health"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'health'">Ver detalhes ↗</button></template><div class="ordo-highlight-grid"><div><span>Falhas FCM 24h</span><strong>{{ formatNumber(dashboard.health.notifications?.failures_last_24_hours) }}</strong></div><div><span>Áudio travado</span><strong>{{ formatNumber(dashboard.health.audio_sessions?.stale_running) }}</strong></div><div><span>Áudio rodando</span><strong>{{ formatNumber(dashboard.health.audio_sessions?.running) }}</strong></div><div><span>Keys expirando</span><strong>{{ formatNumber(dashboard.health.api_keys?.expiring_next_30_days) }}</strong></div></div></OrdoChartCard>
    </div>

    <div class="ordo-queue-grid">
      <OrdoLifeRulesQueue :rules="lifeRules" :pagination="lifeRulesPagination" :loading="lifeRulesLoading" :error="lifeRulesError" :status="lifeRuleStatus" :search="lifeRuleSearch" :current-page="lifeRuleCurrentPage" :total-pages="lifeRuleTotalPages" @update:status="emit('update:lifeRuleStatus', $event)" @update:search="emit('update:lifeRuleSearch', $event)" @search="emit('search-life-rules')" @change-page="emit('change-life-rule-page', $event)" @open-all="activeExplorer = 'lifeRules'" />
      <OrdoCustomRosaryQueue :rosaries="customRosaries" :pagination="customRosaryPagination" :loading="customRosariesLoading" :error="customRosariesError" :status="customRosaryStatus" :current-page="customRosaryCurrentPage" :total-pages="customRosaryTotalPages" :summary="dashboard.custom_rosaries" :status-items="selectedRosaryStatusItems" @update:status="emit('update:customRosaryStatus', $event)" @change="emit('change-custom-rosary-status')" @change-page="emit('change-custom-rosary-page', $event)" @open="emit('open-rosary', $event)" @open-all="activeExplorer = 'customRosaries'" />
    </div>

    <div v-if="moderation" class="ordo-table-card"><div class="ordo-table-card__header"><div><p class="ordo-kicker">Decisões no período</p><h2>Qualidade da moderação</h2></div><div class="ordo-table-card__header-actions"><span class="ordo-scope-label">{{ formatPercent(moderation.approval_rate) }} de aprovação</span><button type="button" class="ordo-card-action" @click="activeExplorer = 'moderation'">Abrir métricas ↗</button></div></div><div class="ordo-highlight-grid ordo-highlight-grid--wide ordo-table-card__metrics"><div><span>Aprovadas</span><strong>{{ formatNumber(moderation.approved_in_period) }}</strong></div><div><span>Rejeitadas</span><strong>{{ formatNumber(moderation.rejected_in_period) }}</strong></div><div><span>Reentradas</span><strong>{{ formatNumber(moderation.reentries_in_period) }}</strong></div><div><span>Tempo médio</span><strong>{{ formatDuration(moderation.average_response_time_seconds) }}</strong></div></div></div>
  </section>

  <OrdoDataExplorerModal v-if="activeExplorer === 'audio'" title="Cobertura de áudio" description="Detalhamento por prayer book e voz, incluindo textos processados e caracteres faltantes." :columns="audioColumns" :rows="audioRows" search-placeholder="Buscar prayer book ou voz…" default-sort-key="missing_characters" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'notifications'" title="Notificações" description="Resumo, tipos e status de entrega por plataforma; tokens individuais nunca são expostos." :columns="notificationColumns" :rows="notificationRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'lifeRules'" title="Regras de vida carregadas" description="Itens retornados para a página atual da fila, com todos os campos administrativos disponíveis nessa resposta." :columns="lifeRuleColumns" :rows="lifeRuleRows" :filters="lifeRuleFilters" default-sort-key="created_at" default-sort-direction="desc" search-placeholder="Buscar regra, autor ou descrição…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'adoptions'" title="Adoção de regras de vida" description="Ranking completo de regras adotadas na base total." :columns="lifeRuleAdoptionColumns" :rows="lifeRuleAdoptionRows" default-sort-key="adoptions" search-placeholder="Buscar regra…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'moderation'" title="Métricas de moderação" description="Pendências atuais, decisões no período, reentradas e idade das filas." :columns="moderationColumns" :rows="moderationRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'health'" title="Saúde operacional" description="Detalhamento de falhas, sessões travadas e chaves próximas do vencimento." :columns="healthColumns" :rows="healthRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'customRosaries'" title="Rosários compartilhados" description="Fila completa consultada pela API, sem carregar centenas de rosários de uma vez." :columns="customRosaryColumns" :rows="customRosaryRows" :remote="true" :remote-search="customRosarySearch" :remote-sort-key="customRosarySort" :remote-sort-direction="customRosarySortDirection" :remote-pagination="customRosaryExplorerPagination" :remote-loading="customRosariesLoading" search-placeholder="Buscar título, autor, descrição ou slug…" :format-value="formatOperationsExplorerValue" @update:remote-search="emit('update:customRosarySearch', $event)" @remote-search="emit('search-custom-rosaries')" @remote-sort="onCustomRosaryRemoteSort" @remote-page="emit('change-custom-rosary-page', $event)" @close="activeExplorer = null" />
</template>
