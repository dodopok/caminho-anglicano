<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTrendChart from './TrendChart.vue'
import OrdoUsageFeatureEvents from './UsageFeatureEvents.vue'
import OrdoUsageFunnelCard from './UsageFunnelCard.vue'
import { useQueryParam } from '../../composables/usePortalQuery'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { buildSeries, officeMeta } from '../../utils/series'
import {
  clientLabel,
  closingDays,
  dailyValues,
  datesIn,
  dayStates,
  FEATURE_FUNNEL,
  featureLabel,
  shareText,
  total,
  windowLabel
} from '../../utils/usage'
import type { UsageBreakdownResponse, UsageSeriesPoint } from '../../types/usage'

// One feature: its numbers against the window before, its daily series, who
// uses it (client, book, office), the events inside it and its funnel.
const props = defineProps<{ feature: string }>()

const api = useUsageApi()
const { core, window, previous, previousLabel, monthly, today, bookNames, appEvents, open } = useUsageContext()
const measure = useQueryParam<'vezes' | 'pessoas'>('medida', 'vezes', ['vezes', 'pessoas'])

const series = useWindowReport(range => api.series(range, { feature: props.feature }))
const seriesPrevious = useWindowReport((_, before) => before ? api.series(before, { feature: props.feature }) : Promise.resolve(null))
const byClient = useWindowReport(range => api.breakdown(range, 'client', { feature: props.feature }))
const byBook = useWindowReport(range => api.breakdown(range, 'book', { feature: props.feature }))
const prayed = ['office', 'completion'].includes(props.feature)
const completions = useWindowReport(range => prayed ? api.completions(range) : Promise.resolve(null))
// Opened by office, on the device (API-uso.md §4: `event=office_opened`).
const officeType = useWindowReport(range => prayed ? api.breakdown(range, 'office_type', { event: 'office_opened' }) : Promise.resolve(null))
const funnelKey = FEATURE_FUNNEL[props.feature]
const funnels = useWindowReport(range => funnelKey ? api.funnels(range) : Promise.resolve(null))
const funnelsPrevious = useWindowReport((_, before) => funnelKey && before ? api.funnels(before) : Promise.resolve(null))

const row = computed(() => core.top.data?.features.find(item => item.feature === props.feature) || null)
const rowBefore = computed(() => previous.value && core.topPrevious.data ? core.topPrevious.data.features.find(item => item.feature === props.feature) || { feature: props.feature, count: 0, errors: 0, user_days: 0 } : null)
const label = computed(() => featureLabel(props.feature))

const dates = computed(() => datesIn(window.value.start_date, window.value.end_date))
const lastClosed = computed(() => {
  const days = (core.active.data?.series || []).filter(point => point.dau || point.wau || point.mau)
  return days.length ? days[days.length - 1].date : null
})
const averageUsers = (points?: Array<{ date: string; users: number }> | null, until?: string | null) => {
  const list = (points || []).filter(point => !until || point.date <= until)
  const withData = list.filter(point => point.users > 0)
  return withData.length ? total(withData.map(point => point.users)) / withData.length : null
}
const usersPerDay = computed(() => averageUsers(series.data?.series, lastClosed.value))
const usersPerDayBefore = computed(() => averageUsers(seriesPrevious.data?.series))
const averageDau = computed(() => {
  const days = (core.active.data?.series || []).filter(point => point.dau > 0)
  return days.length ? total(days.map(point => point.dau)) / days.length : null
})

const funnel = computed(() => funnels.data?.funnels.find(item => item.key === funnelKey) || null)
const funnelBefore = computed(() => funnelsPrevious.data?.funnels.find(item => item.key === funnelKey) || null)

const fmt = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits })
const errorRate = (item: { count: number; errors: number } | null) => item && item.count ? item.errors / item.count * 100 : null

const kpis = computed(() => {
  const now = row.value
  const before = rowBefore.value
  const third = prayed
    ? {
        title: 'Rezados até o fim',
        value: funnel.value?.rate === null || funnel.value?.rate === undefined ? '—' : `${Math.round(funnel.value.rate * 100)}%`,
        delta: funnel.value?.rate != null && funnelBefore.value?.rate != null ? comparePeriods(funnel.value.rate * 100, funnelBefore.value.rate * 100, { kind: 'rate' }) : null,
        subtitle: `dos dias com ofício aberto${appEvents.value ? '' : ' · só web, por ora'}`
      }
    : {
        title: 'Pessoas-dia',
        value: fmt(now?.user_days),
        delta: before ? comparePeriods(now?.user_days ?? 0, before.user_days) : null,
        subtitle: 'soma das pessoas de cada dia'
      }
  const rate = errorRate(now)
  const rateBefore = errorRate(before)
  return [
    { title: 'Pedidos', value: fmt(now?.count ?? 0), delta: before ? comparePeriods(now?.count ?? 0, before.count) : null, subtitle: undefined },
    {
      title: 'Pessoas por dia',
      value: fmt(usersPerDay.value),
      delta: comparePeriods(usersPerDay.value === null ? null : Math.round(usersPerDay.value), usersPerDayBefore.value === null ? null : Math.round(usersPerDayBefore.value)),
      subtitle: usersPerDay.value !== null && averageDau.value ? `média · ${Math.round(usersPerDay.value / averageDau.value * 100)}% de quem abre o Ordo` : 'média'
    },
    third,
    {
      title: 'Erros',
      value: rate === null ? '—' : `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`,
      delta: rate !== null && rateBefore !== null ? comparePeriods(rate, rateBefore, { kind: 'rate', lowerIsBetter: true }) : null,
      subtitle: `${fmt(now?.errors ?? 0)} pedidos com erro`
    }
  ]
})

// --- Series -------------------------------------------------------------------

const read = (point: UsageSeriesPoint) => measure.value === 'pessoas' ? point.users : point.count
const points = computed(() => {
  const values = dailyValues<UsageSeriesPoint>(series.data?.series, window.value, read)
  return buildSeries(
  dates.value.map((date, index) => ({ date, value: values[index] })),
  window.value.start_date,
  window.value.end_date,
  { monthly: monthly.value, average: measure.value === 'pessoas' }
  )
})
const previousLine = computed(() => !monthly.value && previous.value && seriesPrevious.data && total(seriesPrevious.data.series.map(point => point.count)) > 0
  ? dailyValues<UsageSeriesPoint>(seriesPrevious.data.series, previous.value, read)
  : null)
const hasSeries = computed(() => total((series.data?.series || []).map(point => point.count)) > 0)
const seriesTitle = computed(() => {
  if (measure.value === 'vezes') return `Pedidos de ${label.value.toLowerCase()}`
  return props.feature === 'office' ? 'Pessoas que abriram um ofício' : `Pessoas que usaram ${label.value.toLowerCase()}`
})

// --- Who --------------------------------------------------------------------------

const BOOK_LIMIT = 5
const allBooks = ref(false)
const breakdownItems = (response: UsageBreakdownResponse | null, kind: 'client' | 'book'): BarListItem[] => {
  const rows = response?.rows || []
  const sum = total(rows.map(item => item.count))
  return rows.map(item => ({
    key: item.value ?? '—',
    label: !item.value ? 'Não informado' : kind === 'client' ? clientLabel(item.value) : bookNames.value[item.value] || item.value,
    code: kind === 'book' && item.value && bookNames.value[item.value] ? item.value : null,
    value: item.count,
    display: fmt(item.count),
    share: sum ? `${(item.count / sum * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : undefined
  }))
}
const clientItems = computed(() => breakdownItems(byClient.data, 'client'))
const bookItems = computed(() => breakdownItems(byBook.data, 'book'))
const hiddenBooks = computed(() => {
  const rest = bookItems.value.slice(BOOK_LIMIT)
  const sum = total(bookItems.value.map(item => item.value))
  return { count: rest.length, share: shareText(total(rest.map(item => item.value)), sum) }
})

const officeItems = computed<BarListItem[]>(() => {
  const counts = completions.data?.data?.completions?.by_office_type || {}
  const sum = total(Object.values(counts).map(Number))
  return Object.entries(counts)
    .map(([office, count]) => ({ office, count: Number(count) }))
    .sort((a, b) => officeMeta(a.office).order - officeMeta(b.office).order)
    .map(({ office, count }) => {
      const meta = officeMeta(office)
      return { key: office, label: meta.label, value: count, display: fmt(count), share: shareText(count, sum), icon: meta.icon, color: meta.color, tint: meta.tint }
    })
})
const officeOpened = computed<BarListItem[]>(() => (officeType.data?.rows || []).map(item => ({
  key: item.value ?? '—',
  label: item.value ? officeMeta(item.value).label : 'Não informado',
  value: item.count,
  display: fmt(item.count)
})))
</script>

<template>
  <section class="op-tiles op-tiles--4" :aria-label="`Números de ${label}`">
    <OrdoMetricCard
      v-for="kpi in kpis"
      :key="kpi.title"
      compact
      :title="kpi.title"
      :value="kpi.value"
      :loading="core.top.loading && !core.top.data"
      :delta="kpi.delta"
      :delta-label="kpi.title === 'Pedidos' ? previousLabel : undefined"
      :subtitle="kpi.subtitle"
    />
  </section>

  <OrdoChartCard :loading="series.loading && !series.data" :skeleton-height="200" eyebrow="Série diária" :title="seriesTitle" :description="measure === 'pessoas' ? 'Pessoas distintas por dia; a linha tracejada é o período anterior.' : 'Pedidos por dia; a linha tracejada é o período anterior.'">
    <template #actions>
      <div class="op-seg op-seg--small" role="group" aria-label="Medida da série">
        <button type="button" :class="{ 'is-on': measure === 'vezes' }" :aria-pressed="measure === 'vezes'" @click="measure = 'vezes'">Vezes</button>
        <button type="button" :class="{ 'is-on': measure === 'pessoas' }" :aria-pressed="measure === 'pessoas'" @click="measure = 'pessoas'">Pessoas</button>
      </div>
    </template>
    <OrdoTrendChart
      v-if="hasSeries"
      :points="points"
      :previous="previousLine"
      :closing="monthly ? 0 : closingDays(dates, today(), dayStates(core.status.data))"
      :height="200"
      :unit="measure === 'pessoas' ? 'pessoas' : 'pedidos'"
      :aria-label="`Série diária: ${label}`"
    />
    <p v-else class="op-empty">{{ errorText(series.error) || 'Nada registrado neste período.' }}</p>
    <template v-if="hasSeries" #footer>
      <span class="op-legend">
        <span><i class="op-legend-line" />{{ windowLabel(window) }}</span>
        <span v-if="previousLine"><i class="op-legend-line op-legend-line--prev" />{{ windowLabel(previous) }}</span>
      </span>
      <span class="op-only-wide">Passe o mouse para ver cada dia e o dia equivalente do período anterior.</span>
    </template>
  </OrdoChartCard>

  <section class="op-grid" style="--op-min: 300px">
    <OrdoChartCard :loading="byClient.loading && !byClient.data" eyebrow="De onde" title="Por cliente">
      <OrdoBarList :items="clientItems" :limit="6" :thickness="6" :empty-message="errorText(byClient.error) || 'Nada registrado neste período.'" />
    </OrdoChartCard>
    <OrdoChartCard :loading="byBook.loading && !byBook.data" eyebrow="Em que livro" title="Por livro de oração">
      <OrdoBarList :items="bookItems" :limit="allBooks ? 50 : BOOK_LIMIT" :thickness="6" :empty-message="errorText(byBook.error) || 'Nenhum livro registrado neste período.'" />
      <template v-if="hiddenBooks.count" #footer>
        <span>+ {{ hiddenBooks.count }} {{ hiddenBooks.count === 1 ? 'livro' : 'livros' }} com {{ hiddenBooks.share }} · <button type="button" class="op-link" @click="allBooks = !allBooks">{{ allBooks ? 'ver menos' : 'ver todos' }}</button></span>
      </template>
    </OrdoChartCard>
    <OrdoChartCard v-if="prayed" :loading="completions.loading && !completions.data" eyebrow="Qual ofício" title="Por ofício rezado">
      <template #actions><span class="op-pill op-pill--quiet">de Prática &amp; conteúdo</span></template>
      <OrdoBarList :items="officeItems" :limit="8" :thickness="6" :empty-message="errorText(completions.error) || 'Nenhum ofício marcado como rezado no período.'" />
      <template v-if="officeOpened.length">
        <p class="op-eyebrow">Aberto por ofício, na telemetria</p>
        <OrdoBarList :items="officeOpened" :limit="8" :thickness="6" />
      </template>
      <template #footer>
        <span>Ofícios marcados como rezados (tabela de conclusões).<template v-if="officeType.soon"> Aberto por ofício, na telemetria:</template></span>
        <span v-if="officeType.soon" class="op-soon" title="O resumo noturno ainda não separa o ofício">em breve</span>
      </template>
    </OrdoChartCard>
  </section>

  <section class="op-row">
    <OrdoUsageFeatureEvents class="op-grow-2" :feature="feature" />
    <OrdoUsageFunnelCard
      v-if="funnel"
      class="op-grow-1"
      :funnel="funnel"
      :previous="funnelBefore"
      eyebrow="Funil"
      :title="funnel.key === 'office' ? 'Abrir → rezar' : undefined"
      :show-drop="false"
      :partial="funnel.key === 'paywall' && !appEvents"
    >
      <template #footer>
        <span>Pessoas-dia nos últimos 90 dias de eventos brutos<template v-if="!appEvents">; até o app 1.46 sair, só a web manda o passo 1</template>. <button type="button" class="op-link" @click="open('funis')">Ver todos os funis</button></span>
      </template>
    </OrdoUsageFunnelCard>
  </section>
</template>
