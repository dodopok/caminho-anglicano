<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoCustomRosaryQueue from './CustomRosaryQueue.vue'
import OrdoDataExplorerModal from './DataExplorerModal.vue'
import OrdoLifeRulesQueue from './LifeRulesQueue.vue'
import OrdoStatList from './StatList.vue'
import { useOrdoDashboardPresentation, type DashboardStatItem } from '../../composables/useOrdoDashboardPresentation'
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
import type { ExplorerColumn, ExplorerFilter, ExplorerRemotePagination, ExplorerRow, ExplorerValue } from '../../types/explorer'

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
  customRosaryExplorerRosaries: CustomRosaryPrayer[]
  customRosaryExplorerPagination?: CustomRosaryPagination | null
  customRosaryExplorerLoading: boolean
  customRosaryExplorerError?: string | null
  customRosaryExplorerSearch: string
  customRosaryExplorerSort: CustomRosarySortKey
  customRosaryExplorerSortDirection: CustomRosarySortDirection
  customRosaryExplorerCurrentPage: number
  customRosaryExplorerTotalPages: number
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
  'open-custom-rosary-explorer': []
  'update:customRosaryExplorerSearch': [value: string]
  'search-custom-rosary-explorer': []
  'change-custom-rosary-explorer-sort': [key: CustomRosarySortKey, direction: CustomRosarySortDirection]
  'change-custom-rosary-explorer-page': [direction: number]
  'open-rosary': [rosary: CustomRosaryPrayer, source: 'queue' | 'explorer']
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

type ExplorerName = 'notifications' | 'lifeRules' | 'lifeRuleExams' | 'adoptions' | 'moderation' | 'health' | 'customRosaries' | null

const activeExplorer = ref<ExplorerName>(null)

const notificationStatusItems = computed(() => mapItems(props.dashboard.notifications?.delivery_status_counts))
const moderation = computed(() => props.dashboard.moderation?.custom_rosaries)
const lifeRuleExams = computed(() => props.dashboard.life_rules?.exams)
const formatOptionalNumber = (value: number | null | undefined) => value == null ? '—' : formatNumber(value)
const plural = (count: number, singular: string, pluralForm: string) => `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
const attention = (value: number | null | undefined) => (value || 0) > 0 ? { tone: 'attention' as const } : {}

// The queues answer "what needs a decision"; the intro says it in one line
// instead of a row of cards repeating the queue counts.
const pendingSummary = computed(() => {
  const rosaries = moderation.value?.pending_now
  const rules = props.dashboard.life_rules?.pending_rules ?? props.dashboard.moderation?.life_rules?.pending_now
  const oldestRosary = moderation.value?.oldest_pending_age_seconds
  const parts = [
    ...(rosaries == null ? [] : [`${plural(rosaries, 'rosário em revisão', 'rosários em revisão')}${rosaries && oldestRosary ? ` · mais antigo há ${formatDuration(oldestRosary)}` : ''}`]),
    ...(rules == null ? [] : [plural(rules, 'regra pendente', 'regras pendentes')])
  ]
  return parts.length ? parts.join(' · ') : 'fila atual + métricas do período'
})

const notificationStats = computed<DashboardStatItem[]>(() => {
  const notifications = props.dashboard.notifications
  return [
    { key: 'success', label: 'Taxa de sucesso', value: formatPercent(notifications?.success_rate), hint: `${formatNumber(notifications?.total_in_period)} logs no período` },
    { key: 'sent', label: 'Enviadas', value: formatNumber(notifications?.sent) },
    { key: 'failed', label: 'Falhas no período', value: formatNumber(notifications?.failed) }
  ]
})

const healthStats = computed<DashboardStatItem[]>(() => {
  const health = props.dashboard.health
  return [
    { key: 'fcm', label: 'Falhas de notificação', value: formatNumber(health?.notifications?.failures_last_24_hours), hint: 'nas últimas 24 horas', ...attention(health?.notifications?.failures_last_24_hours) },
    { key: 'stale', label: 'Sessões de áudio travadas', value: formatNumber(health?.audio_sessions?.stale_running), hint: `${formatNumber(health?.audio_sessions?.running)} rodando agora`, ...attention(health?.audio_sessions?.stale_running) },
    { key: 'audio-failed', label: 'Sessões de áudio falhas', value: formatNumber(health?.audio_sessions?.failed), hint: 'histórico' },
    { key: 'keys', label: 'Chaves de API expirando', value: formatNumber(health?.api_keys?.expiring_next_30_days), hint: 'nos próximos 30 dias', ...attention(health?.api_keys?.expiring_next_30_days) }
  ]
})

const lifeRuleStats = computed<DashboardStatItem[]>(() => {
  const rules = props.dashboard.life_rules
  return [
    { key: 'rules', label: 'Regras', value: formatNumber(rules?.total_rules), hint: `${formatNumber(rules?.public_rules)} públicas · ${formatNumber(rules?.approved_rules)} aprovadas` },
    { key: 'adoptions', label: 'Adoções históricas', value: formatNumber(rules?.total_adoptions) },
    ...(lifeRuleExams.value ? [
      { key: 'exams', label: 'Exames concluídos', value: formatOptionalNumber(lifeRuleExams.value.completed_in_period), hint: `${formatOptionalNumber(lifeRuleExams.value.users_with_completed_exams)} pessoas distintas no período` },
      ...(lifeRuleExams.value.average_score == null ? [] : [{ key: 'score', label: 'Score médio', value: formatDecimal(lifeRuleExams.value.average_score, 2), hint: 'exames concluídos no período' }])
    ] : [])
  ]
})

const topAdoptedRules = computed(() => (props.dashboard.life_rules?.top_adopted || []).slice(0, 3))
const topAdoptedMax = computed(() => Math.max(...topAdoptedRules.value.map(rule => Number(rule.adoptions || 0)), 1))

const customRosaryExplorerRemotePagination = computed<ExplorerRemotePagination>(() => ({
  currentPage: props.customRosaryExplorerCurrentPage,
  totalPages: props.customRosaryExplorerTotalPages,
  total: props.customRosaryExplorerPagination?.total ?? props.customRosaryExplorerRosaries.length
}))

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

const countMapRows = (category: string, values?: Record<string, number>): ExplorerRow[] =>
  mapItems(values).map(item => ({
    id: `${category}-${item.key}`,
    values: { category, item: item.label, code: item.key, value: item.value }
  }))

const lifeRuleExamColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Métrica', sortable: true },
  { key: 'code', label: 'Código', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const lifeRuleExamRows = computed<ExplorerRow[]>(() => [
  { id: 'completed', values: { category: 'Resumo', item: 'Exames concluídos', code: 'completed_in_period', value: lifeRuleExams.value?.completed_in_period ?? null } },
  { id: 'users', values: { category: 'Resumo', item: 'Usuários distintos com exame concluído', code: 'users_with_completed_exams', value: lifeRuleExams.value?.users_with_completed_exams ?? null } },
  ...(lifeRuleExams.value?.average_score == null ? [] : [{ id: 'average-score', values: { category: 'Resumo', item: 'Score médio', code: 'average_score', value: lifeRuleExams.value.average_score, value_kind: 'decimal' } }]),
  ...countMapRows('Período de conclusão', lifeRuleExams.value?.by_period),
  ...countMapRows('Banda de score', lifeRuleExams.value?.by_band)
])

const moderationColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Fila', sortable: true },
  { key: 'metric', label: 'Métrica', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const moderationRows = computed<ExplorerRow[]>(() => {
  const rosaries = props.dashboard.moderation?.custom_rosaries
  const rules = props.dashboard.moderation?.life_rules
  const shared = props.dashboard.custom_rosaries
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
    ].map(([metric, value, value_kind], index) => ({ id: `rule-${index}`, values: { category: 'Regras de vida', metric, value: value ?? null, value_kind: value_kind || 'number' } })),
    // These used to crowd the queue card; they describe the period, not the queue.
    ...[
      ['Criados no período', shared?.created_in_period],
      ['Públicos no período', shared?.public_in_period],
      ['Média de blocos', shared?.average_blocks, 'decimal'],
      ['Média de passos expandidos', shared?.average_expanded_steps, 'decimal'],
      ['Pessoas perto do limite', shared?.users_near_limit]
    ].map(([metric, value, value_kind], index) => ({ id: `shared-${index}`, values: { category: 'Rosários no período', metric, value: value ?? null, value_kind: value_kind || 'number' } })),
    ...mapItems(shared?.by_share_status).map(item => ({ id: `share-status-${item.key}`, values: { category: 'Rosários por status', metric: humanizeKey(item.key), value: item.value, value_kind: 'number' } }))
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
const customRosaryRows = computed<ExplorerRow[]>(() => props.customRosaryExplorerRosaries.map(item => ({
  id: item.id,
  searchable: `${item.title} ${item.description || ''} ${item.author?.name || ''} ${item.locale || ''} ${item.share_status || ''} ${item.strapi_slug || ''}`,
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

const onCustomRosaryExplorerRemoteSort = (key: string, direction: 'asc' | 'desc') => {
  if (customRosarySortKeys.includes(key as CustomRosarySortKey)) {
    emit('change-custom-rosary-explorer-sort', key as CustomRosarySortKey, direction)
  }
}

const openCustomRosaryExplorer = () => {
  activeExplorer.value = 'customRosaries'
  emit('open-custom-rosary-explorer')
}

// The queue modal stays mounted underneath the review. Closing the review used
// to drop the moderator back on the dashboard, so the fila had to be reopened
// and re-filtered for every single approval.
const openCustomRosaryFromExplorer = (row: ExplorerRow) => {
  const rosary = props.customRosaryExplorerRosaries.find(item => String(item.id) === String(row.id))
  if (!rosary) return

  emit('open-rosary', rosary, 'explorer')
}

const formatOperationsExplorerValue = (value: ExplorerValue, _key: string, row: ExplorerRow) => {
  if (value == null) return '—'
  if (row.values.value_kind === 'percentage') return formatPercent(typeof value === 'number' ? value : Number(value))
  if (row.values.value_kind === 'duration') return formatDuration(typeof value === 'number' ? value : Number(value))
  if (row.values.value_kind === 'timestamp') return formatTimestamp(value == null ? null : String(value))
  if (row.values.value_kind === 'decimal') return formatDecimal(typeof value === 'number' ? value : Number(value), 2)
  return formatExplorerValue(value, _key)
}
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Operação & moderação</p><h2>O que precisa de uma decisão humana.</h2></div><span class="ordo-scope-label">{{ pendingSummary }}</span></div>

    <div class="ordo-queue-grid">
      <OrdoCustomRosaryQueue :rosaries="customRosaries" :pagination="customRosaryPagination" :loading="customRosariesLoading" :error="customRosariesError" :status="customRosaryStatus" :current-page="customRosaryCurrentPage" :total-pages="customRosaryTotalPages" :summary="dashboard.custom_rosaries" @update:status="emit('update:customRosaryStatus', $event)" @change="emit('change-custom-rosary-status')" @change-page="emit('change-custom-rosary-page', $event)" @open="emit('open-rosary', $event, 'queue')" @open-all="openCustomRosaryExplorer" />
      <OrdoLifeRulesQueue :rules="lifeRules" :pagination="lifeRulesPagination" :loading="lifeRulesLoading" :error="lifeRulesError" :status="lifeRuleStatus" :search="lifeRuleSearch" :current-page="lifeRuleCurrentPage" :total-pages="lifeRuleTotalPages" @update:status="emit('update:lifeRuleStatus', $event)" @update:search="emit('update:lifeRuleSearch', $event)" @search="emit('search-life-rules')" @change-page="emit('change-life-rule-page', $event)" @open-all="activeExplorer = 'lifeRules'" />
    </div>

    <div v-if="moderation" class="ordo-table-card">
      <div class="ordo-table-card__header"><div><p class="ordo-kicker">Decisões no período</p><h2>Qualidade da moderação</h2></div><div class="ordo-table-card__header-actions"><span class="ordo-scope-label">{{ formatPercent(moderation.approval_rate) }} de aprovação</span><button type="button" class="ordo-card-action" @click="activeExplorer = 'moderation'">Abrir métricas ↗</button></div></div>
      <div class="ops-moderation">
        <div class="ordo-highlight-grid ops-moderation__metrics"><div><span>Aprovadas</span><strong>{{ formatNumber(moderation.approved_in_period) }}</strong></div><div><span>Rejeitadas</span><strong>{{ formatNumber(moderation.rejected_in_period) }}</strong></div><div><span>Reentradas</span><strong>{{ formatNumber(moderation.reentries_in_period) }}</strong></div><div><span>Tempo médio</span><strong>{{ formatDuration(moderation.average_response_time_seconds) }}</strong></div></div>
        <div v-if="selectedRosaryStatusItems.length" class="ops-moderation__status">
          <p class="ops-caption">Rosários por status</p>
          <div class="ordo-mini-bars"><div v-for="item in selectedRosaryStatusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-ochre" :style="{ width: `${(item.value / maxItemValue(selectedRosaryStatusItems)) * 100}%` }" /></i></div></div>
        </div>
      </div>
    </div>

    <p class="ordo-kicker ops-group-label">Sinais da plataforma</p>
    <div class="ops-signals">
      <OrdoChartCard v-if="dashboard.notifications" title="Notificações" description="Status agregados por hash; o token nunca aparece." icon="⌁" icon-color="pink" eyebrow="Entrega">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'notifications'">Detalhes ↗</button></template>
        <OrdoStatList :items="notificationStats" />
        <div v-if="notificationStatusItems.length" class="ordo-mini-bars ops-bars"><div v-for="item in notificationStatusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-pink" :style="{ width: `${(item.value / maxItemValue(notificationStatusItems)) * 100}%` }" /></i></div></div>
      </OrdoChartCard>

      <OrdoChartCard v-if="dashboard.health" title="Saúde operacional" description="Falhas, sessões travadas e chaves perto do vencimento." icon="✓" icon-color="green" eyebrow="Health">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'health'">Detalhes ↗</button></template>
        <OrdoStatList :items="healthStats" />
      </OrdoChartCard>

      <OrdoChartCard v-if="dashboard.life_rules" title="Regras de vida" description="Base total de regras e adoções; exames no período." icon="⌁" icon-color="purple" eyebrow="Adoção & exames">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'adoptions'">Ranking ↗</button></template>
        <OrdoStatList :items="lifeRuleStats" />
        <div v-if="topAdoptedRules.length" class="ops-bars">
          <p class="ops-caption">Mais adotadas</p>
          <div class="ordo-mini-bars"><div v-for="item in topAdoptedRules" :key="item.id || item.title"><span>{{ item.title }}</span><strong>{{ formatNumber(item.adoptions) }}</strong><i><b class="is-purple" :style="{ width: `${(Number(item.adoptions || 0) / topAdoptedMax) * 100}%` }" /></i></div></div>
        </div>
        <button v-if="lifeRuleExams" type="button" class="ordo-card-action ops-card-link" @click="activeExplorer = 'lifeRuleExams'">Exames por período e banda ↗</button>
      </OrdoChartCard>
    </div>
  </section>

  <OrdoDataExplorerModal v-if="activeExplorer === 'notifications'" title="Notificações" description="Resumo, tipos e status de entrega por plataforma; tokens individuais nunca são expostos." :columns="notificationColumns" :rows="notificationRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'lifeRules'" title="Regras de vida carregadas" description="Itens retornados para a página atual da fila, com todos os campos administrativos disponíveis nessa resposta." :columns="lifeRuleColumns" :rows="lifeRuleRows" :filters="lifeRuleFilters" default-sort-key="created_at" default-sort-direction="desc" search-placeholder="Buscar regra, autor ou descrição…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'lifeRuleExams'" title="Exames de Regras de Vida" description="Exames concluídos no período por completed_at, com usuários distintos, score médio e distribuições quando retornadas." :columns="lifeRuleExamColumns" :rows="lifeRuleExamRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'adoptions'" title="Adoção de regras de vida" description="Ranking completo de regras adotadas na base total." :columns="lifeRuleAdoptionColumns" :rows="lifeRuleAdoptionRows" default-sort-key="adoptions" search-placeholder="Buscar regra…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'moderation'" title="Métricas de moderação" description="Pendências atuais, decisões no período, reentradas, idade das filas e o volume de rosários do período." :columns="moderationColumns" :rows="moderationRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'health'" title="Saúde operacional" description="Detalhamento de falhas, sessões travadas e chaves próximas do vencimento." :columns="healthColumns" :rows="healthRows" default-sort-key="value" :format-value="formatOperationsExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'customRosaries'" title="Rosários compartilhados" description="Fila completa isolada da tabela principal. Clique no nome para abrir a revisão e aprovar ou rejeitar." :columns="customRosaryColumns" :rows="customRosaryRows" :remote="true" :remote-search="customRosaryExplorerSearch" :remote-sort-key="customRosaryExplorerSort" :remote-sort-direction="customRosaryExplorerSortDirection" :remote-pagination="customRosaryExplorerRemotePagination" :remote-loading="customRosaryExplorerLoading" :remote-error="customRosaryExplorerError" row-action-key="title" row-action-label="Abrir revisão de" search-placeholder="Buscar título, autor, descrição ou slug…" :format-value="formatOperationsExplorerValue" @update:remote-search="emit('update:customRosaryExplorerSearch', $event)" @remote-search="emit('search-custom-rosary-explorer')" @remote-sort="onCustomRosaryExplorerRemoteSort" @remote-page="emit('change-custom-rosary-explorer-page', $event)" @row-click="openCustomRosaryFromExplorer" @close="activeExplorer = null" />
</template>

<style scoped>
.ops-group-label { margin: 8px 0 -8px; }
.ops-caption { margin: 0 0 8px; color: #8b978b; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.ops-moderation { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: start; gap: 24px; padding: 0 24px 22px; }
.ops-moderation__metrics { margin: 0; }
.ops-moderation__status .ordo-mini-bars { margin-top: 0; gap: 9px; }
.ops-signals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; gap: 16px; }
.ops-signals > * { min-width: 0; }
.ops-bars { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e8eee6; }
.ops-bars.ordo-mini-bars { gap: 9px; }
.ops-bars .ordo-mini-bars { margin-top: 0; gap: 9px; }
.ops-card-link { margin-top: 14px; padding-left: 0; }

@media (max-width: 1180px) {
  .ops-signals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .ops-moderation { grid-template-columns: minmax(0, 1fr); gap: 16px; }
}

@media (max-width: 720px) {
  .ops-moderation { padding: 0 16px 16px; }
  .ops-signals { grid-template-columns: minmax(0, 1fr); }
}
</style>
