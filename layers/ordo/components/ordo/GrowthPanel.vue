<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDataExplorerModal from './DataExplorerModal.vue'
import OrdoLineChart from './LineChart.vue'
import OrdoMetricCard from './MetricCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData, DashboardPeriod } from '../../types/dashboard'
import type { ExplorerColumn, ExplorerFilter, ExplorerRow, ExplorerValue } from '../../types/explorer'

const props = defineProps<{
  dashboard: DashboardData
  period?: DashboardPeriod | null
  startDate: string
  endDate: string
  allTime: boolean
}>()

const {
  asNumber,
  formatNumber,
  formatDecimal,
  formatPercent,
  formatDate,
  mapItems,
  maxItemValue,
  createDateRange,
  createMonthRange,
  aggregateCountMapByMonth,
  formatChartLabel,
  formatMonthLabel,
  formatExplorerValue
} = useOrdoDashboardPresentation()

type ExplorerName = 'newUsers' | 'onboarding' | 'retention' | 'geography' | null

const activeExplorer = ref<ExplorerName>(null)
const chartBuckets = computed(() => props.allTime
  ? createMonthRange(props.startDate, props.endDate)
  : createDateRange(props.startDate, props.endDate))
const dailyNewUsers = computed(() => {
  const values = props.allTime
    ? aggregateCountMapByMonth(props.dashboard.users?.daily_new_users)
    : props.dashboard.users?.daily_new_users || {}
  return chartBuckets.value.map(date => asNumber(values[date]))
})
const dailyNewUserLabels = computed(() => chartBuckets.value.map(props.allTime ? formatMonthLabel : formatChartLabel))
const onboardingChoiceItems = computed(() => mapItems(props.dashboard.onboarding?.choices?.prayer_books))
const languageItems = computed(() => mapItems(props.dashboard.geography?.by_language))
const countryItems = computed(() => mapItems(props.dashboard.geography?.by_country))
const retentionRows = computed(() => props.dashboard.retention?.cohorts || [])
const activeCohort = computed(() => retentionRows.value[retentionRows.value.length - 1])

const onboardingSteps = computed(() => {
  const funnel = props.dashboard.onboarding?.funnel
  if (!funnel) return []

  return [
    { label: 'Registrados', value: asNumber(funnel.registered), rate: funnel.rates?.registered },
    { label: 'Onboarding concluído', value: asNumber(funnel.onboarding_completed), rate: funnel.rates?.onboarding_completed },
    { label: 'Primeiro ofício', value: asNumber(funnel.first_prayer), rate: funnel.rates?.first_prayer },
    { label: 'Sete orações', value: asNumber(funnel.prayed_seven_times), rate: funnel.rates?.prayed_seven_times }
  ]
})

const newUserColumns: ExplorerColumn[] = [
  { key: 'date', label: 'Data', sortable: true },
  { key: 'new_users', label: 'Novos usuários', sortable: true, align: 'right' }
]
const newUserRows = computed<ExplorerRow[]>(() => Object.entries(props.dashboard.users?.daily_new_users || {}).map(([date, value]) => ({
  id: date,
  values: { date, new_users: asNumber(value) }
})))

const retentionColumns: ExplorerColumn[] = [
  { key: 'week_start', label: 'Semana', sortable: true },
  { key: 'users', label: 'Pessoas', sortable: true, align: 'right' },
  { key: 'd1_users', label: 'D1 pessoas', sortable: true, align: 'right' },
  { key: 'd1_rate', label: 'D1', sortable: true, align: 'right' },
  { key: 'd7_users', label: 'D7 pessoas', sortable: true, align: 'right' },
  { key: 'd7_rate', label: 'D7', sortable: true, align: 'right' },
  { key: 'd30_users', label: 'D30 pessoas', sortable: true, align: 'right' },
  { key: 'd30_rate', label: 'D30', sortable: true, align: 'right' }
]
const retentionExplorerRows = computed<ExplorerRow[]>(() => retentionRows.value.map(cohort => ({
  id: cohort.week_start,
  values: {
    week_start: cohort.week_start,
    users: asNumber(cohort.users),
    d1_users: asNumber(cohort.d1?.users),
    d1_rate: asNumber(cohort.d1?.rate),
    d7_users: asNumber(cohort.d7?.users),
    d7_rate: asNumber(cohort.d7?.rate),
    d30_users: asNumber(cohort.d30?.users),
    d30_rate: asNumber(cohort.d30?.rate)
  }
})))

const countMapRows = (category: string, values?: Record<string, number>): ExplorerRow[] =>
  mapItems(values).map(item => ({
    id: `${category}-${item.key}`,
    values: { category, item: item.label, code: item.key, value: item.value }
  }))

const onboardingColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Escolha', sortable: true },
  { key: 'code', label: 'Código', sortable: true },
  { key: 'value', label: 'Usuários', sortable: true, align: 'right' }
]
const onboardingFilters: ExplorerFilter[] = [
  {
    key: 'category',
    label: 'Grupo',
    options: [
      { value: 'Modo', label: 'Modo' },
      { value: 'Prayer book', label: 'Prayer book' },
      { value: 'Bíblia', label: 'Bíblia' },
      { value: 'Idioma', label: 'Idioma' }
    ]
  }
]
const onboardingRows = computed<ExplorerRow[]>(() => [
  ...countMapRows('Modo', props.dashboard.onboarding?.choices?.modes),
  ...countMapRows('Prayer book', props.dashboard.onboarding?.choices?.prayer_books),
  ...countMapRows('Bíblia', props.dashboard.onboarding?.choices?.bible_versions),
  ...countMapRows('Idioma', props.dashboard.onboarding?.choices?.languages)
])

const geographyColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'code', label: 'Código', sortable: true },
  { key: 'value', label: 'Valor', sortable: true, align: 'right' }
]
const geographyFilters: ExplorerFilter[] = [
  {
    key: 'category',
    label: 'Grupo',
    options: [
      { value: 'Resumo', label: 'Resumo' },
      { value: 'País', label: 'País' },
      { value: 'Idioma', label: 'Idioma' }
    ]
  }
]
const geographyRows = computed<ExplorerRow[]>(() => [
  { id: 'summary-total', values: { category: 'Resumo', item: 'Usuários totais', code: 'total_users', value: asNumber(props.dashboard.geography?.total_users) } },
  { id: 'summary-explicit', values: { category: 'Resumo', item: 'País explícito', code: 'explicit_country_users', value: asNumber(props.dashboard.geography?.explicit_country_users) } },
  { id: 'summary-coverage', values: { category: 'Resumo', item: 'Cobertura de país', code: 'country_coverage_percentage', value: asNumber(props.dashboard.geography?.country_coverage_percentage), value_kind: 'percentage' } },
  { id: 'summary-default-timezone', values: { category: 'Resumo', item: 'Timezone padrão', code: 'default_timezone_users', value: asNumber(props.dashboard.geography?.default_timezone_users) } },
  { id: 'summary-derived', values: { category: 'Resumo', item: 'País derivado', code: 'derived_country_users', value: asNumber(props.dashboard.geography?.derived_country_users) } },
  { id: 'summary-ambiguous', values: { category: 'Resumo', item: 'Timezone ambíguo/desconhecido', code: 'ambiguous_or_unknown_timezone_users', value: asNumber(props.dashboard.geography?.ambiguous_or_unknown_timezone_users) } },
  ...countMapRows('País', props.dashboard.geography?.by_country),
  ...countMapRows('Idioma', props.dashboard.geography?.by_language)
])

const formatGrowthExplorerValue = (value: ExplorerValue, key: string, row: ExplorerRow) =>
  value == null ? '—' : row.values.value_kind === 'percentage' ? formatPercent(typeof value === 'number' ? value : Number(value)) : formatExplorerValue(value, key)
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Aquisição & hábito</p><h2>Onde uma pessoa começa — e decide continuar.</h2></div><span class="ordo-scope-label">coortes do período</span></div>

    <div v-if="dashboard.users" class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard title="Novas pessoas" :value="formatNumber(dashboard.users.new_users_in_period)" subtitle="criadas no período" color="blue" icon="＋" eyebrow="Entrada" />
      <OrdoMetricCard title="Ativas no período" :value="formatNumber(dashboard.users.active_users_in_period)" subtitle="com ao menos um ofício" color="green" icon="◉" eyebrow="Presença" />
      <OrdoMetricCard title="Streak atual médio" :value="`${formatDecimal(dashboard.users.avg_current_streak)} d`" :subtitle="`maior médio ${formatDecimal(dashboard.users.avg_longest_streak)} d`" color="orange" icon="⌁" eyebrow="Constância" />
      <OrdoMetricCard title="Tokens ativos" :value="formatNumber(dashboard.users.active_fcm_tokens)" subtitle="atualizados nos últimos 60 dias" color="purple" icon="⌑" eyebrow="Alcance" />
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.users" :title="allTime ? 'Chegadas ao longo dos meses' : 'Chegadas ao longo dos dias'" :description="allTime ? 'Histórico agrupado por mês para manter a leitura leve.' : 'Dias sem registro são preenchidos com zero para manter a linha contínua.'" icon="＋" icon-color="blue" eyebrow="Novos usuários">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'newUsers'">Ver dados ↗</button></template>
        <OrdoLineChart :labels="dailyNewUserLabels" :data="dailyNewUsers" label="Novos usuários" color="#457180" />
      </OrdoChartCard>
      <OrdoChartCard v-if="dashboard.onboarding" title="Funil de primeiros passos" description="Contagens cumulativas para os usuários criados no intervalo." icon="↓" icon-color="orange" eyebrow="Onboarding">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'onboarding'">Ver escolhas ↗</button></template>
        <div class="ordo-funnel">
          <div v-for="(step, index) in onboardingSteps" :key="step.label" class="ordo-funnel__step">
            <div class="ordo-funnel__label"><span>{{ String(index + 1).padStart(2, '0') }} · {{ step.label }}</span><strong>{{ formatNumber(step.value) }}</strong></div>
            <div class="ordo-bar-track"><span :style="{ width: `${(step.value / maxItemValue(onboardingSteps)) * 100}%` }" /></div>
            <small v-if="step.rate !== undefined">{{ formatPercent(step.rate) }} da entrada</small>
          </div>
        </div>
      </OrdoChartCard>
    </div>

    <div v-if="dashboard.retention" class="ordo-table-card">
      <div class="ordo-table-card__header"><div><p class="ordo-kicker">Retenção</p><h2>Coortes por semana de criação</h2></div><div class="ordo-table-card__header-actions"><span v-if="activeCohort" class="ordo-scope-label">última coorte: {{ formatDate(activeCohort.week_start) }}</span><button type="button" class="ordo-card-action" @click="activeExplorer = 'retention'">Abrir tabela ↗</button></div></div>
      <div class="ordo-table-wrap"><table><thead><tr><th>Semana</th><th>Pessoas</th><th>D1</th><th>D7</th><th>D30</th></tr></thead><tbody><tr v-for="cohort in retentionRows" :key="cohort.week_start"><td>{{ formatDate(cohort.week_start) }}</td><td>{{ formatNumber(cohort.users) }}</td><td><strong>{{ formatPercent(cohort.d1?.rate) }}</strong><span>{{ formatNumber(cohort.d1?.users) }} pessoas</span></td><td><strong>{{ formatPercent(cohort.d7?.rate) }}</strong><span>{{ formatNumber(cohort.d7?.users) }} pessoas</span></td><td><strong>{{ formatPercent(cohort.d30?.rate) }}</strong><span>{{ formatNumber(cohort.d30?.users) }} pessoas</span></td></tr></tbody></table></div>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.geography" title="Origem declarada" description="Cobertura explícita de país e idioma das preferências." icon="⌖" icon-color="green" eyebrow="Geografia">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'geography'">Ver tudo ↗</button></template>
        <div class="ordo-stat-banner"><strong>{{ formatPercent(dashboard.geography.country_coverage_percentage) }}</strong><span>de cobertura de país explícito</span></div>
        <div class="ordo-mini-bars"><div v-for="item in countryItems.slice(0, 5)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(countryItems)) * 100}%` }" /></i></div></div>
      </OrdoChartCard>
      <OrdoChartCard v-if="dashboard.prayer_books || dashboard.onboarding" title="Escolhas no onboarding" description="Preferências iniciais, separadas do uso real nas completions." icon="⌂" icon-color="purple" eyebrow="Preferências">
        <template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'onboarding'">Ver tudo ↗</button></template>
        <div class="ordo-mini-bars"><div v-for="item in onboardingChoiceItems.slice(0, 6)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(onboardingChoiceItems)) * 100}%` }" /></i></div><div v-for="item in languageItems.slice(0, 3)" :key="`lang-${item.key}`"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-ochre" :style="{ width: `${(item.value / maxItemValue(languageItems)) * 100}%` }" /></i></div></div>
      </OrdoChartCard>
    </div>
  </section>

  <OrdoDataExplorerModal
    v-if="activeExplorer === 'newUsers'"
    title="Novos usuários"
    description="Valores diários originais de daily_new_users; a linha principal pode agrupá-los por mês no modo histórico."
    :columns="newUserColumns"
    :rows="newUserRows"
    default-sort-key="date"
    default-sort-direction="asc"
    @close="activeExplorer = null"
  />
  <OrdoDataExplorerModal
    v-else-if="activeExplorer === 'onboarding'"
    title="Escolhas do onboarding"
    description="A API entrega modos, prayer books, versões bíblicas e idiomas; todos ficam pesquisáveis aqui."
    :columns="onboardingColumns"
    :rows="onboardingRows"
    :filters="onboardingFilters"
    search-placeholder="Buscar escolha ou código…"
    default-sort-key="value"
    :format-value="formatGrowthExplorerValue"
    @close="activeExplorer = null"
  />
  <OrdoDataExplorerModal
    v-else-if="activeExplorer === 'retention'"
    title="Retenção por coorte"
    description="Todas as coortes e taxas D1, D7 e D30 retornadas para o período."
    :columns="retentionColumns"
    :rows="retentionExplorerRows"
    default-sort-key="week_start"
    default-sort-direction="asc"
    :format-value="formatGrowthExplorerValue"
    @close="activeExplorer = null"
  />
  <OrdoDataExplorerModal
    v-else-if="activeExplorer === 'geography'"
    title="Geografia e idioma"
    description="Resumo de cobertura e a distribuição completa por país e idioma."
    :columns="geographyColumns"
    :rows="geographyRows"
    :filters="geographyFilters"
    search-placeholder="Buscar país, idioma ou código…"
    default-sort-key="value"
    :format-value="formatGrowthExplorerValue"
    @close="activeExplorer = null"
  />
</template>
