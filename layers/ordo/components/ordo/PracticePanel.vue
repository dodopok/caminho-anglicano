<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDoughnutChart from './DoughnutChart.vue'
import OrdoLineChart from './LineChart.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  startDate: string
  endDate: string
}>()

const {
  asNumber,
  formatNumber,
  formatDuration,
  mapItems,
  maxItemValue,
  createDateRange,
  formatChartLabel
} = useOrdoDashboardPresentation()

const dailyCompletions = computed(() => {
  const values = new Map((props.dashboard.completions?.daily_completions || []).map(item => [item.date, item.count]))
  return createDateRange(props.startDate, props.endDate).map(date => asNumber(values.get(date)))
})
const dailyCompletionLabels = computed(() => createDateRange(props.startDate, props.endDate).map(formatChartLabel))
const officeTypeItems = computed(() => mapItems(props.dashboard.completions?.by_office_type))
const hourlyItems = computed(() => Object.entries(props.dashboard.completions?.by_hour || {})
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([key, value]) => ({ key, label: `${key}h`, value: asNumber(value) })))
const prayerBookCompletionItems = computed(() => (props.dashboard.prayer_books?.completion_usage_by_prayer_book || []).map(item => ({
  key: item.code,
  label: item.name,
  value: asNumber(item.completions)
})))
const topCompleters = computed(() => (props.dashboard.completions?.top_completers || []).map(item => ({
  label: item.name || `Usuário ${item.id}`,
  value: asNumber(item.completions)
})))
const topWriters = computed(() => (props.dashboard.journals?.top_writers || []).map(item => ({
  label: item.name || `Usuário ${item.id}`,
  value: asNumber(item.journals)
})))
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Conteúdo & prática</p><h2>O mapa de uma oração vivida.</h2></div><span class="ordo-scope-label">fontes históricas preservadas</span></div>

    <div class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard v-if="dashboard.completions" title="Ofícios no período" :value="formatNumber(dashboard.completions.total_in_period)" :subtitle="`duração média ${formatDuration(dashboard.completions.avg_duration_seconds)}`" color="green" icon="✦" eyebrow="Ofícios" />
      <OrdoMetricCard v-if="dashboard.journals" title="Diários no período" :value="formatNumber(dashboard.journals.total_in_period)" :subtitle="`${formatNumber(dashboard.journals.users_with_journals)} pessoas escrevendo`" color="purple" icon="▤" eyebrow="Memória" />
      <OrdoMetricCard v-if="dashboard.shared_offices" title="Compartilhamentos" :value="formatNumber(dashboard.shared_offices.total_in_period)" :subtitle="`${formatNumber(dashboard.shared_offices.unique_users_sharing)} pessoas distintas`" color="blue" icon="↗" eyebrow="Circulação" />
      <OrdoMetricCard v-if="dashboard.weekly_prayers" title="Orações semanais" :value="formatNumber(dashboard.weekly_prayers.weekly_prayers_generated)" :subtitle="`${formatNumber(dashboard.weekly_prayers.prayer_requests_created)} pedidos criados`" color="orange" icon="∿" eyebrow="Assistência" />
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.completions" title="Cadência de completions" description="Atribuição por date_reference; dias ausentes são completados com zero." icon="✦" icon-color="green" eyebrow="Série diária"><OrdoLineChart :labels="dailyCompletionLabels" :data="dailyCompletions" label="Completions" color="#496451" /></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.completions" title="Tipos de ofício" description="Distribuição do período selecionado." icon="◒" icon-color="purple" eyebrow="Distribuição"><OrdoDoughnutChart :labels="officeTypeItems.map(item => item.label)" :data="officeTypeItems.map(item => item.value)" /></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.prayer_books" title="Uso real por prayer book" description="Baseado na atribuição histórica das completions, não no onboarding." icon="▥" icon-color="orange" eyebrow="Prayer books"><div class="ordo-mini-bars"><div v-for="item in prayerBookCompletionItems.slice(0, 7)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(prayerBookCompletionItems)) * 100}%` }" /></i></div><div class="ordo-note-box"><span>Sem atribuição</span><strong>{{ formatNumber(dashboard.prayer_books.unattributed_completions) }}</strong><small>Completions ainda sem prayer_book_id.</small></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.completions" title="Horário da oração" description="by_hour respeita o timezone individual do usuário." icon="◷" icon-color="blue" eyebrow="Hora local"><div class="ordo-mini-bars"><div v-for="item in hourlyItems.slice(0, 8)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-blue" :style="{ width: `${(item.value / maxItemValue(hourlyItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.completions" title="Quem está rezando" description="Rankings agora identificam a pessoa por nome e ID, nunca por e-mail." icon="↗" icon-color="green" eyebrow="Top completers"><OrdoTopList :items="topCompleters" empty-message="Sem completions no período." /></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.journals" title="Quem está escrevendo" description="Diários agrupados por date_reference." icon="✎" icon-color="purple" eyebrow="Top writers"><OrdoTopList :items="topWriters" empty-message="Sem diários no período." /></OrdoChartCard>
    </div>

    <div v-if="dashboard.favorites || dashboard.weekly_prayers" class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.favorites" title="Favoritos criados" description="O que foi guardado pelas pessoas no período." icon="◇" icon-color="pink" eyebrow="Favoritos"><div class="ordo-stat-banner"><strong>{{ formatNumber(dashboard.favorites.created_in_period) }}</strong><span>{{ formatNumber(dashboard.favorites.users_with_favorites) }} pessoas com favoritos</span></div><div class="ordo-mini-bars"><div v-for="item in mapItems(dashboard.favorites.by_kind).slice(0, 5)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-pink" :style="{ width: `${(item.value / maxItemValue(mapItems(dashboard.favorites?.by_kind))) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.weekly_prayers" title="Orações semanais geradas" description="Proxy de uso da Perplexity = orações geradas, não custo confirmado." icon="∿" icon-color="orange" eyebrow="Weekly prayers"><div class="ordo-highlight-grid"><div><span>Pedidos</span><strong>{{ formatNumber(dashboard.weekly_prayers.prayer_requests_created) }}</strong></div><div><span>Usuários</span><strong>{{ formatNumber(dashboard.weekly_prayers.weekly_prayer_users) }}</strong></div><div><span>Geradas</span><strong>{{ formatNumber(dashboard.weekly_prayers.weekly_prayers_generated) }}</strong></div><div><span>Proxy</span><strong>{{ formatNumber(dashboard.weekly_prayers.perplexity_usage_proxy) }}</strong></div></div><div class="ordo-note-box"><span>Idiomas mais gerados</span><strong>{{ Object.keys(dashboard.weekly_prayers.generated_by_language || {}).length }}</strong><small>categorias disponíveis no período</small></div></OrdoChartCard>
    </div>
  </section>
</template>
