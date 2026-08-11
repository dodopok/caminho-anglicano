<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoLineChart from './LineChart.vue'
import OrdoMetricCard from './MetricCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData, DashboardPeriod } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period?: DashboardPeriod | null
  startDate: string
  endDate: string
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
  formatChartLabel
} = useOrdoDashboardPresentation()

const dailyNewUsers = computed(() => {
  const values = props.dashboard.users?.daily_new_users || {}
  return createDateRange(props.startDate, props.endDate).map(date => asNumber(values[date]))
})
const dailyNewUserLabels = computed(() => createDateRange(props.startDate, props.endDate).map(formatChartLabel))
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
      <OrdoChartCard v-if="dashboard.users" title="Chegadas ao longo dos dias" description="Dias sem registro são preenchidos com zero para manter a linha contínua." icon="＋" icon-color="blue" eyebrow="Novos usuários">
        <OrdoLineChart :labels="dailyNewUserLabels" :data="dailyNewUsers" label="Novos usuários" color="#457180" />
      </OrdoChartCard>
      <OrdoChartCard v-if="dashboard.onboarding" title="Funil de primeiros passos" description="Contagens cumulativas para os usuários criados no intervalo." icon="↓" icon-color="orange" eyebrow="Onboarding">
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
      <div class="ordo-table-card__header"><div><p class="ordo-kicker">Retenção</p><h2>Coortes por semana de criação</h2></div><span v-if="activeCohort" class="ordo-scope-label">última coorte: {{ formatDate(activeCohort.week_start) }}</span></div>
      <div class="ordo-table-wrap"><table><thead><tr><th>Semana</th><th>Pessoas</th><th>D1</th><th>D7</th><th>D30</th></tr></thead><tbody><tr v-for="cohort in retentionRows" :key="cohort.week_start"><td>{{ formatDate(cohort.week_start) }}</td><td>{{ formatNumber(cohort.users) }}</td><td><strong>{{ formatPercent(cohort.d1?.rate) }}</strong><span>{{ formatNumber(cohort.d1?.users) }} pessoas</span></td><td><strong>{{ formatPercent(cohort.d7?.rate) }}</strong><span>{{ formatNumber(cohort.d7?.users) }} pessoas</span></td><td><strong>{{ formatPercent(cohort.d30?.rate) }}</strong><span>{{ formatNumber(cohort.d30?.users) }} pessoas</span></td></tr></tbody></table></div>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.geography" title="Origem declarada" description="Cobertura explícita de país e idioma das preferências." icon="⌖" icon-color="green" eyebrow="Geografia">
        <div class="ordo-stat-banner"><strong>{{ formatPercent(dashboard.geography.country_coverage_percentage) }}</strong><span>de cobertura de país explícito</span></div>
        <div class="ordo-mini-bars"><div v-for="item in countryItems.slice(0, 5)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(countryItems)) * 100}%` }" /></i></div></div>
      </OrdoChartCard>
      <OrdoChartCard v-if="dashboard.prayer_books || dashboard.onboarding" title="Escolhas no onboarding" description="Preferências iniciais, separadas do uso real nas completions." icon="⌂" icon-color="purple" eyebrow="Preferências">
        <div class="ordo-mini-bars"><div v-for="item in onboardingChoiceItems.slice(0, 6)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(onboardingChoiceItems)) * 100}%` }" /></i></div><div v-for="item in languageItems.slice(0, 3)" :key="`lang-${item.key}`"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-ochre" :style="{ width: `${(item.value / maxItemValue(languageItems)) * 100}%` }" /></i></div></div>
      </OrdoChartCard>
    </div>
  </section>
</template>
