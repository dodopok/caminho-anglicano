<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDataExplorerModal from './DataExplorerModal.vue'
import OrdoDoughnutChart from './DoughnutChart.vue'
import OrdoLineChart from './LineChart.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData } from '../../types/dashboard'
import type { ExplorerColumn, ExplorerFilter, ExplorerRow } from '../../types/explorer'

const props = defineProps<{
  dashboard: DashboardData
  startDate: string
  endDate: string
  allTime: boolean
}>()

const {
  asNumber,
  formatNumber,
  formatDuration,
  mapItems,
  maxItemValue,
  createDateRange,
  createMonthRange,
  aggregateDailyCountsByMonth,
  formatChartLabel,
  formatMonthLabel
} = useOrdoDashboardPresentation()

type ExplorerName = 'dailyCompletions' | 'prayerBooks' | 'hours' | 'completers' | 'journals' | 'sharedOffices' | 'weeklyPrayers' | 'favorites' | null

const activeExplorer = ref<ExplorerName>(null)

const chartBuckets = computed(() => props.allTime
  ? createMonthRange(props.startDate, props.endDate)
  : createDateRange(props.startDate, props.endDate))
const dailyCompletions = computed(() => {
  const dailyValues = props.dashboard.completions?.daily_completions || []
  if (props.allTime) {
    const values = aggregateDailyCountsByMonth(dailyValues)
    return chartBuckets.value.map(month => asNumber(values[month]))
  }

  const values = new Map(dailyValues.map(item => [item.date, item.count]))
  return chartBuckets.value.map(date => asNumber(values.get(date)))
})
const dailyCompletionLabels = computed(() => chartBuckets.value.map(props.allTime ? formatMonthLabel : formatChartLabel))
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

const dailyCompletionColumns: ExplorerColumn[] = [
  { key: 'date', label: 'Data', sortable: true },
  { key: 'count', label: 'Completions', sortable: true, align: 'right' }
]
const dailyCompletionRows = computed<ExplorerRow[]>(() => (props.dashboard.completions?.daily_completions || []).map(item => ({
  id: item.date,
  values: { date: item.date, count: asNumber(item.count) }
})))

const hourColumns: ExplorerColumn[] = [
  { key: 'hour', label: 'Hora local', sortable: true },
  { key: 'count', label: 'Completions', sortable: true, align: 'right' }
]
const hourRows = computed<ExplorerRow[]>(() => hourlyItems.value.map(item => ({
  id: item.key,
  values: { hour: item.label, count: item.value }
})))

const prayerBookColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'name', label: 'Prayer book', sortable: true },
  { key: 'code', label: 'Código', sortable: true },
  { key: 'users', label: 'Usuários', sortable: true, align: 'right' },
  { key: 'onboarding_users', label: 'Onboarding', sortable: true, align: 'right' },
  { key: 'lifetime_completions', label: 'Completions históricas', sortable: true, align: 'right' },
  { key: 'period_completions', label: 'Completions no período', sortable: true, align: 'right' },
  { key: 'bible_users', label: 'Usuários Bíblia', sortable: true, align: 'right' }
]
const prayerBookRows = computed<ExplorerRow[]>(() => {
  const books = new Map<string, { name: string; users: number; onboarding_users: number; lifetime_completions: number; period_completions: number }>()
  const ensure = (code: string, name: string) => {
    if (!books.has(code)) books.set(code, { name, users: 0, onboarding_users: 0, lifetime_completions: 0, period_completions: 0 })
    const item = books.get(code)!
    if (!item.name || item.name === code) item.name = name
    return item
  }

  for (const item of props.dashboard.prayer_books?.usage_by_prayer_book || []) ensure(item.code, item.name).users = asNumber(item.users)
  for (const item of props.dashboard.prayer_books?.onboarding_choices_by_prayer_book || []) ensure(item.code, item.name).onboarding_users = asNumber(item.users)
  for (const item of props.dashboard.prayer_books?.completion_usage_by_prayer_book || []) ensure(item.code, item.name).lifetime_completions = asNumber(item.completions)
  for (const item of props.dashboard.completions?.by_prayer_book || []) ensure(item.code, item.name).period_completions = asNumber(item.completions)

  return [...books.entries()].map(([code, item]) => ({
    id: code,
    searchable: `${code} ${item.name}`,
    values: { category: 'Prayer book', code, name: item.name, ...item }
  })).concat((props.dashboard.prayer_books?.bible_version_choices || []).map(item => ({
    id: `bible-${item.code}`,
    searchable: `${item.code} ${item.name}`,
    values: { category: 'Bíblia', code: item.code, name: item.name, users: undefined, onboarding_users: undefined, lifetime_completions: undefined, period_completions: undefined, bible_users: asNumber(item.users) }
  })))
})

const prayerBookFilters: ExplorerFilter[] = [{
  key: 'category',
  label: 'Grupo',
  options: [{ value: 'Prayer book', label: 'Prayer books' }, { value: 'Bíblia', label: 'Versões bíblicas' }]
}]

const personColumns: ExplorerColumn[] = [
  { key: 'name', label: 'Pessoa', sortable: true },
  { key: 'id', label: 'ID', sortable: true, align: 'right' },
  { key: 'count', label: 'Quantidade', sortable: true, align: 'right' }
]
const completerRows = computed<ExplorerRow[]>(() => (props.dashboard.completions?.top_completers || []).map(item => ({
  id: item.id,
  values: { name: item.name || `Usuário ${item.id}`, id: item.id, count: asNumber(item.completions) }
})))
const journalColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'id', label: 'ID', sortable: true, align: 'right' },
  { key: 'count', label: 'Quantidade', sortable: true, align: 'right' }
]
const journalRows = computed<ExplorerRow[]>(() => [
  ...mapItems(props.dashboard.journals?.by_entry_type).map(item => ({ id: `entry-${item.key}`, values: { category: 'Tipo de entrada', item: item.label, id: item.key, count: item.value } })),
  ...mapItems(props.dashboard.journals?.by_office_type).map(item => ({ id: `office-${item.key}`, values: { category: 'Tipo de ofício', item: item.label, id: item.key, count: item.value } })),
  ...(props.dashboard.journals?.top_writers || []).map(item => ({ id: `writer-${item.id}`, values: { category: 'Pessoa', item: item.name, id: item.id, count: asNumber(item.journals) } }))
])

const sharedOfficeColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'count', label: 'Quantidade', sortable: true, align: 'right' }
]
const sharedOfficeRows = computed<ExplorerRow[]>(() => [
  ...mapItems(props.dashboard.shared_offices?.by_office_type).map(item => ({ id: `office-${item.key}`, values: { category: 'Tipo de ofício', item: item.label, count: item.value } })),
  ...mapItems(props.dashboard.shared_offices?.by_prayer_book).map(item => ({ id: `book-${item.key}`, values: { category: 'Prayer book', item: item.key, count: item.value } })),
  ...(props.dashboard.shared_offices?.daily_shares || []).map(item => ({ id: `day-${item.date}`, values: { category: 'Dia', item: item.date, count: asNumber(item.count) } }))
])

const weeklyPrayerColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'count', label: 'Quantidade', sortable: true, align: 'right' }
]
const weeklyPrayerRows = computed<ExplorerRow[]>(() => [
  { id: 'summary-requests', values: { category: 'Resumo', item: 'Pedidos criados', count: asNumber(props.dashboard.weekly_prayers?.prayer_requests_created) } },
  { id: 'summary-request-users', values: { category: 'Resumo', item: 'Pessoas que criaram pedidos', count: asNumber(props.dashboard.weekly_prayers?.prayer_request_users) } },
  { id: 'summary-generated', values: { category: 'Resumo', item: 'Orações geradas', count: asNumber(props.dashboard.weekly_prayers?.weekly_prayers_generated) } },
  { id: 'summary-users', values: { category: 'Resumo', item: 'Pessoas que geraram', count: asNumber(props.dashboard.weekly_prayers?.weekly_prayer_users) } },
  { id: 'summary-proxy', values: { category: 'Resumo', item: 'Proxy de uso da Perplexity', count: asNumber(props.dashboard.weekly_prayers?.perplexity_usage_proxy) } },
  ...mapItems(props.dashboard.weekly_prayers?.prayer_requests_by_week).map(item => ({ id: `requests-${item.key}`, values: { category: 'Pedidos por semana', item: item.key, count: item.value } })),
  ...mapItems(props.dashboard.weekly_prayers?.generated_by_week).map(item => ({ id: `generated-${item.key}`, values: { category: 'Geradas por semana', item: item.key, count: item.value } })),
  ...mapItems(props.dashboard.weekly_prayers?.generated_for_week).map(item => ({ id: `for-${item.key}`, values: { category: 'Geradas para semana', item: item.key, count: item.value } })),
  ...mapItems(props.dashboard.weekly_prayers?.generated_by_language).map(item => ({ id: `language-${item.key}`, values: { category: 'Idioma', item: item.label, count: item.value } })),
  ...mapItems(props.dashboard.weekly_prayers?.generated_by_prayer_book).map(item => ({ id: `book-${item.key}`, values: { category: 'Prayer book', item: item.key, count: item.value } })),
  ...(props.dashboard.weekly_prayers?.daily_generated || []).map(item => ({ id: `day-${item.date}`, values: { category: 'Geração diária', item: item.date, count: asNumber(item.count) } }))
])

const favoriteColumns: ExplorerColumn[] = [
  { key: 'category', label: 'Grupo', sortable: true },
  { key: 'item', label: 'Item', sortable: true },
  { key: 'count', label: 'Favoritos', sortable: true, align: 'right' }
]
const favoriteRows = computed<ExplorerRow[]>(() => [
  ...mapItems(props.dashboard.favorites?.by_kind).map(item => ({ id: `kind-${item.key}`, values: { category: 'Tipo', item: item.label, count: item.value } })),
  ...(props.dashboard.favorites?.top_posts || []).map(item => ({ id: `post-${item.post_slug}`, searchable: item.post_slug, values: { category: 'Post', item: item.post_slug, count: asNumber(item.favorites) } }))
])

const categoryFilters = (options: Array<{ value: string; label: string }>): ExplorerFilter[] => [{ key: 'category', label: 'Grupo', options }]
const journalFilters = categoryFilters([{ value: 'Tipo de entrada', label: 'Tipo de entrada' }, { value: 'Tipo de ofício', label: 'Tipo de ofício' }, { value: 'Pessoa', label: 'Pessoa' }])
const sharedOfficeFilters = categoryFilters([{ value: 'Tipo de ofício', label: 'Tipo de ofício' }, { value: 'Prayer book', label: 'Prayer book' }, { value: 'Dia', label: 'Dia' }])
const weeklyPrayerFilters = categoryFilters([{ value: 'Resumo', label: 'Resumo' }, { value: 'Pedidos por semana', label: 'Pedidos por semana' }, { value: 'Geradas por semana', label: 'Geradas por semana' }, { value: 'Geradas para semana', label: 'Geradas para semana' }, { value: 'Idioma', label: 'Idioma' }, { value: 'Prayer book', label: 'Prayer book' }, { value: 'Geração diária', label: 'Geração diária' }])
const favoriteFilters = categoryFilters([{ value: 'Tipo', label: 'Tipo' }, { value: 'Post', label: 'Post' }])
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
      <OrdoChartCard v-if="dashboard.completions" title="Cadência de completions" :description="allTime ? 'Histórico agrupado por mês para manter a leitura leve.' : 'Atribuição por date_reference; dias ausentes são completados com zero.'" icon="✦" icon-color="green" :eyebrow="allTime ? 'Série mensal' : 'Série diária'"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'dailyCompletions'">Ver dados ↗</button></template><OrdoLineChart :labels="dailyCompletionLabels" :data="dailyCompletions" label="Completions" color="#496451" /></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.completions" title="Tipos de ofício" description="Distribuição do período selecionado." icon="◒" icon-color="purple" eyebrow="Distribuição"><OrdoDoughnutChart :labels="officeTypeItems.map(item => item.label)" :data="officeTypeItems.map(item => item.value)" /></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.prayer_books" title="Uso real por prayer book" description="Baseado na atribuição histórica das completions, não no onboarding." icon="▥" icon-color="orange" eyebrow="Prayer books"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'prayerBooks'">Ver tudo ↗</button></template><div class="ordo-mini-bars"><div v-for="item in prayerBookCompletionItems.slice(0, 7)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(prayerBookCompletionItems)) * 100}%` }" /></i></div><div class="ordo-note-box"><span>Sem atribuição</span><strong>{{ formatNumber(dashboard.prayer_books.unattributed_completions) }}</strong><small>Completions ainda sem prayer_book_id.</small></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.completions" title="Horário da oração" description="by_hour respeita o timezone individual do usuário." icon="◷" icon-color="blue" eyebrow="Hora local"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'hours'">Ver 24h ↗</button></template><div class="ordo-mini-bars"><div v-for="item in hourlyItems.slice(0, 8)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-blue" :style="{ width: `${(item.value / maxItemValue(hourlyItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.completions" title="Quem está rezando" description="Rankings agora identificam a pessoa por nome e ID, nunca por e-mail." icon="↗" icon-color="green" eyebrow="Top completers"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'completers'">Ver ranking ↗</button></template><OrdoTopList :items="topCompleters" empty-message="Sem completions no período." /></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.journals" title="Quem está escrevendo" description="Diários agrupados por date_reference." icon="✎" icon-color="purple" eyebrow="Top writers"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'journals'">Ver detalhes ↗</button></template><OrdoTopList :items="topWriters" empty-message="Sem diários no período." /></OrdoChartCard>
    </div>

    <div v-if="dashboard.shared_offices" class="ordo-grid-2">
      <OrdoChartCard title="Compartilhamentos" description="Distribuição por ofício, prayer book e data de compartilhamento." icon="↗" icon-color="blue" eyebrow="Circulação"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'sharedOffices'">Ver tudo ↗</button></template><div class="ordo-stat-banner"><strong>{{ formatNumber(dashboard.shared_offices.total_in_period) }}</strong><span>{{ formatNumber(dashboard.shared_offices.unique_users_sharing) }} pessoas distintas</span></div><div class="ordo-mini-bars"><div v-for="item in mapItems(dashboard.shared_offices.by_office_type)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-blue" :style="{ width: `${(item.value / maxItemValue(mapItems(dashboard.shared_offices?.by_office_type))) * 100}%` }" /></i></div></div></OrdoChartCard>
    </div>

    <div v-if="dashboard.favorites || dashboard.weekly_prayers" class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.favorites" title="Favoritos criados" description="O que foi guardado pelas pessoas no período." icon="◇" icon-color="pink" eyebrow="Favoritos"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'favorites'">Ver posts ↗</button></template><div class="ordo-stat-banner"><strong>{{ formatNumber(dashboard.favorites.created_in_period) }}</strong><span>{{ formatNumber(dashboard.favorites.users_with_favorites) }} pessoas com favoritos</span></div><div class="ordo-mini-bars"><div v-for="item in mapItems(dashboard.favorites.by_kind).slice(0, 5)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-pink" :style="{ width: `${(item.value / maxItemValue(mapItems(dashboard.favorites?.by_kind))) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.weekly_prayers" title="Orações semanais geradas" description="Proxy de uso da Perplexity = orações geradas, não custo confirmado." icon="∿" icon-color="orange" eyebrow="Weekly prayers"><template #actions><button type="button" class="ordo-card-action" @click="activeExplorer = 'weeklyPrayers'">Ver séries ↗</button></template><div class="ordo-highlight-grid"><div><span>Pedidos</span><strong>{{ formatNumber(dashboard.weekly_prayers.prayer_requests_created) }}</strong></div><div><span>Usuários</span><strong>{{ formatNumber(dashboard.weekly_prayers.weekly_prayer_users) }}</strong></div><div><span>Geradas</span><strong>{{ formatNumber(dashboard.weekly_prayers.weekly_prayers_generated) }}</strong></div><div><span>Proxy</span><strong>{{ formatNumber(dashboard.weekly_prayers.perplexity_usage_proxy) }}</strong></div></div><div class="ordo-note-box"><span>Idiomas mais gerados</span><strong>{{ Object.keys(dashboard.weekly_prayers.generated_by_language || {}).length }}</strong><small>categorias disponíveis no período</small></div></OrdoChartCard>
    </div>
  </section>

  <OrdoDataExplorerModal v-if="activeExplorer === 'dailyCompletions'" title="Completions por dia" description="A série completa retornada pelo backend, sem o recorte visual do gráfico." :columns="dailyCompletionColumns" :rows="dailyCompletionRows" default-sort-key="date" default-sort-direction="asc" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'prayerBooks'" title="Prayer books e versões bíblicas" description="Cruza as listas de usuários, escolhas no onboarding, completions históricas, completions do período e escolhas de Bíblia." :columns="prayerBookColumns" :rows="prayerBookRows" :filters="prayerBookFilters" search-placeholder="Buscar prayer book, Bíblia ou código…" default-sort-key="period_completions" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'hours'" title="Completions por hora" description="Todas as horas locais presentes em by_hour." :columns="hourColumns" :rows="hourRows" default-sort-key="count" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'completers'" title="Top completers" description="O ranking completo entregue pelo backend, com nome e ID público." :columns="personColumns" :rows="completerRows" default-sort-key="count" search-placeholder="Buscar pessoa ou ID…" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'journals'" title="Diários e escritores" description="Tipos de entrada, tipos de ofício e ranking completo de escritores." :columns="journalColumns" :rows="journalRows" :filters="journalFilters" default-sort-key="count" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'sharedOffices'" title="Compartilhamentos" description="Todas as agregações retornadas em shared_offices." :columns="sharedOfficeColumns" :rows="sharedOfficeRows" :filters="sharedOfficeFilters" default-sort-key="count" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'weeklyPrayers'" title="Orações semanais" description="Pedidos, gerações, idiomas, prayer books e série diária completa." :columns="weeklyPrayerColumns" :rows="weeklyPrayerRows" :filters="weeklyPrayerFilters" default-sort-key="count" @close="activeExplorer = null" />
  <OrdoDataExplorerModal v-else-if="activeExplorer === 'favorites'" title="Favoritos" description="Tipos e posts mais favoritados no período." :columns="favoriteColumns" :rows="favoriteRows" :filters="favoriteFilters" default-sort-key="count" search-placeholder="Buscar post ou tipo…" @close="activeExplorer = null" />
</template>
