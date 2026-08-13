<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDataExplorerModal from './DataExplorerModal.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData } from '../../types/dashboard'
import type { ExplorerColumn, ExplorerFilter, ExplorerRow } from '../../types/explorer'

const props = defineProps<{
  dashboard: DashboardData
}>()

const { asNumber, formatNumber, formatPercent, maxItemValue, formatChartLabel, formatExplorerValue, humanizeKey } = useOrdoDashboardPresentation()

type ExplorerName = 'premium' | 'api' | 'developers' | null

const activeExplorer = ref<ExplorerName>(null)

const apiEndpointItems = computed(() => (props.dashboard.api?.top_endpoints || []).map(item => ({
  key: item.endpoint,
  label: item.endpoint,
  value: asNumber(item.requests)
})))
const apiDailyItems = computed(() => (props.dashboard.api?.requests_by_day || []).map(item => ({
  key: item.date,
  label: formatChartLabel(item.date),
  value: asNumber(item.requests)
})))

const premiumColumns: ExplorerColumn[] = [
  { key: 'metric', label: 'Métrica', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' },
  { key: 'scope', label: 'Escopo', sortable: true }
]
const premiumRows = computed<ExplorerRow[]>(() => {
  const premium = props.dashboard.premium
  if (!premium) return []
  return [
    ['Ativos agora', premium.active_now, 'lifetime'],
    ['Novos no período', premium.new_in_period, 'period'],
    ['Expiram nos próximos 30 dias', premium.expiring_next_30_days, 'lifetime'],
    ['Expirados', premium.expired, 'lifetime'],
    ['Churn', premium.churn_rate, 'lifetime', 'percentage'],
    ['Renovações no período', premium.renewals_in_period, 'period'],
    ['Expirados no período', premium.expired_in_period, 'period'],
    ['Taxa de renovação', premium.renewal_rate, 'period', 'percentage']
  ].map(([metric, value, scope, value_kind], index) => ({
    id: `premium-${index}`,
    values: { metric, value: value ?? null, scope: humanizeKey(String(scope)), value_kind: value_kind || 'number' }
  }))
})

const apiColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'requests', label: 'Requests', sortable: true, align: 'right' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'detail', label: 'Detalhe', sortable: true }
]
const apiFilters: ExplorerFilter[] = [{
  key: 'category',
  label: 'Grupo',
  options: [
    { value: 'Resumo', label: 'Resumo' },
    { value: 'Dia', label: 'Dia' },
    { value: 'Endpoint', label: 'Endpoint' },
    { value: 'Chave', label: 'Chave' },
    { value: 'Limite', label: 'Limite' }
  ]
}]
const apiRows = computed<ExplorerRow[]>(() => [
  { id: 'total', values: { category: 'Resumo', item: 'Requests no período', requests: asNumber(props.dashboard.api?.requests_in_period), status: '—', detail: 'period' } },
  { id: 'active-keys', values: { category: 'Resumo', item: 'Chaves ativas', requests: asNumber(props.dashboard.api?.keys?.active), status: 'Ativa', detail: 'Base total' } },
  { id: 'inactive-keys', values: { category: 'Resumo', item: 'Chaves inativas', requests: asNumber(props.dashboard.api?.keys?.inactive), status: 'Inativa', detail: 'Base total' } },
  { id: 'expired-keys', values: { category: 'Resumo', item: 'Chaves expiradas', requests: asNumber(props.dashboard.api?.keys?.expired), status: 'Expirada', detail: 'Base total' } },
  ...apiDailyItems.value.map(item => ({ id: `day-${item.key}`, values: { category: 'Dia', item: item.key, requests: item.value, status: '—', detail: item.label } })),
  ...apiEndpointItems.value.map(item => ({ id: `endpoint-${item.key}`, values: { category: 'Endpoint', item: item.label, requests: item.value, status: '—', detail: 'top endpoint' } })),
  ...(props.dashboard.api?.top_keys || []).map(item => ({ id: `key-${item.id}`, values: { category: 'Chave', item: item.name, requests: asNumber(item.requests), status: item.active ? 'Ativa' : 'Inativa', detail: `ID ${item.id}` } })),
  ...(props.dashboard.api?.near_daily_limit || []).map(item => ({ id: `limit-${item.id}`, values: { category: 'Limite', item: item.name, requests: asNumber(item.requests_today), status: 'Próxima do limite', detail: `${formatNumber(item.daily_limit)} limite diário` } }))
])

const developerColumns: ExplorerColumn[] = [
  { key: 'name', label: 'Desenvolvedor', sortable: true },
  { key: 'id', label: 'ID', sortable: true, align: 'right' },
  { key: 'keys', label: 'Chaves', sortable: true, align: 'right' }
]
const developerRows = computed<ExplorerRow[]>(() => (props.dashboard.developers?.keys_by_developer || []).map(item => ({
  id: item.id,
  values: { name: item.name, id: item.id, keys: asNumber(item.keys) }
})))

const formatPlatformExplorerValue = (value: unknown, key: string, row: ExplorerRow) => {
  if (row.values.value_kind === 'percentage') return formatPercent(typeof value === 'number' ? value : Number(value))
  return formatExplorerValue(value as string | number | boolean | null | undefined, key)
}
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Monetização & integrações</p><h2>Uma plataforma que continua respirando.</h2></div><span class="ordo-scope-label">estado atual + atividade do período</span></div>

    <div v-if="dashboard.premium" class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard title="Premium ativos agora" :value="formatNumber(dashboard.premium.active_now)" :subtitle="`${formatNumber(dashboard.premium.new_in_period)} novos no período`" color="orange" icon="◇" eyebrow="Premium" />
      <OrdoMetricCard title="Expiram em 30 dias" :value="formatNumber(dashboard.premium.expiring_next_30_days)" :subtitle="`${formatNumber(dashboard.premium.expired)} expirados na base`" color="pink" icon="⌁" eyebrow="Ciclo" />
      <OrdoMetricCard title="Churn histórico" :value="formatPercent(dashboard.premium.churn_rate)" subtitle="expirados / base premium total" color="purple" icon="↘" eyebrow="Retenção" />
      <OrdoMetricCard title="Renovação" :value="dashboard.premium.renewal_rate_available ? formatPercent(dashboard.premium.renewal_rate) : '—'" :subtitle="dashboard.premium.renewal_rate_available ? `${formatNumber(dashboard.premium.renewals_in_period)} renovações` : (dashboard.premium.renewal_rate_note || 'Ainda sem eventos suficientes')" color="green" icon="↻" eyebrow="Período" />
    </div>

    <div v-if="dashboard.premium && !dashboard.premium.renewal_rate_available" class="ordo-info-callout"><span>i</span><p><strong>Renovação ainda não é uma porcentagem confiável.</strong> A API marca explicitamente `renewal_rate` como nulo quando não existem eventos de renovação ou expiração no período.</p></div>

    <div v-if="dashboard.premium" class="ordo-grid-2">
      <OrdoChartCard title="Ciclo premium completo" description="Inclui os eventos que não cabem nos quatro cartões principais." icon="◇" icon-color="orange" eyebrow="Detalhamento"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'premium'">Ver métricas ↗</button></template><div class="ordo-highlight-grid"><div><span>Novos</span><strong>{{ formatNumber(dashboard.premium.new_in_period) }}</strong></div><div><span>Renovações</span><strong>{{ formatNumber(dashboard.premium.renewals_in_period) }}</strong></div><div><span>Expirados no período</span><strong>{{ formatNumber(dashboard.premium.expired_in_period) }}</strong></div><div><span>Disponível</span><strong>{{ dashboard.premium.renewal_rate_available ? 'Sim' : 'Não' }}</strong></div></div></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.api" title="Tráfego da API" description="Uso agregado por endpoint; o alerta considera o limite diário configurado." icon="⌘" icon-color="blue" eyebrow="API pública"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'api'">Ver tudo ↗</button></template><div class="ordo-stat-banner"><strong>{{ formatNumber(dashboard.api.requests_in_period) }}</strong><span>requests no período</span></div><div class="ordo-mini-bars"><div v-for="item in apiEndpointItems.slice(0, 6)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-blue" :style="{ width: `${(item.value / maxItemValue(apiEndpointItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.developers" title="Ecossistema de desenvolvedores" description="Chaves ativas, aprovadas e pendências de acesso." icon="⌘" icon-color="purple" eyebrow="Developers"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'developers'">Ver todos ↗</button></template><div class="ordo-highlight-grid"><div><span>Registrados</span><strong>{{ formatNumber(dashboard.developers.registered) }}</strong></div><div><span>Aprovados</span><strong>{{ formatNumber(dashboard.developers.approved) }}</strong></div><div><span>Com chaves</span><strong>{{ formatNumber(dashboard.developers.with_api_keys) }}</strong></div><div><span>Chaves totais</span><strong>{{ formatNumber(dashboard.developers.api_keys?.total) }}</strong></div></div><OrdoTopList :items="(dashboard.developers.keys_by_developer || []).map(item => ({ label: item.name, value: asNumber(item.keys) }))" :max="6" empty-message="Nenhum desenvolvedor com chave." /></OrdoChartCard>
    </div>

    <div v-if="dashboard.api" class="ordo-grid-2">
      <OrdoChartCard title="Requests por dia" description="Série esparsa de logs de uso." icon="↗" icon-color="green" eyebrow="Atividade"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'api'">Ver 31 dias ↗</button></template><div class="ordo-mini-bars"><div v-for="item in apiDailyItems.slice(-8)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(apiDailyItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard title="Chaves perto do limite" description="A API considera a partir de 80% do limite diário." icon="!" icon-color="orange" eyebrow="Atenção"><div v-if="dashboard.api.near_daily_limit?.length" class="ordo-alert-list"><div v-for="key in dashboard.api.near_daily_limit" :key="key.id"><span><strong>{{ key.name }}</strong><small>{{ formatNumber(key.requests_today) }} / {{ formatNumber(key.daily_limit) }} requests</small></span><b>{{ key.daily_limit ? formatPercent((asNumber(key.requests_today) / key.daily_limit) * 100) : '—' }}</b></div></div><div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">✓</span><span>Nenhuma chave perto do limite hoje.</span></div></OrdoChartCard>
    </div>
  </section>

  <OrdoDataExplorerModal v-if="activeExplorer === 'premium'" title="Métricas premium" description="Valores do ciclo atual, com o escopo de cada métrica preservado." :columns="premiumColumns" :rows="premiumRows" default-sort-key="metric" default-sort-direction="asc" :format-value="formatPlatformExplorerValue" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'api'" title="Uso da API" description="Requests por dia, endpoints, chaves e alertas de limite." :columns="apiColumns" :rows="apiRows" :filters="apiFilters" default-sort-key="requests" search-placeholder="Buscar endpoint, chave ou data…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'developers'" title="Desenvolvedores" description="Todos os desenvolvedores retornados em keys_by_developer, inclusive os que ainda não têm chaves." :columns="developerColumns" :rows="developerRows" default-sort-key="keys" search-placeholder="Buscar desenvolvedor ou ID…" @close="activeExplorer = null" />
</template>
