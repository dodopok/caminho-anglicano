<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoCountryMap from './CountryMap.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTrendChart from './TrendChart.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { buildSeries, SERIES_COLORS } from '../../utils/series'
import { periodShortLabel, type PeriodValue } from '../../utils/period'
import type { DashboardData, RetentionSegment, RetentionWindow } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period: PeriodValue
  monthly: boolean
}>()

const { formatNumber, formatPercent, formatDuration, humanizeKey, formatDate, languageLabel } = useOrdoDashboardPresentation()

const users = computed(() => props.dashboard.users || {})
const onboarding = computed(() => props.dashboard.onboarding || {})
const retention = computed(() => props.dashboard.retention || {})
const geography = computed(() => props.dashboard.geography)
const shortPeriod = computed(() => periodShortLabel(props.period))

const firstPrayer = computed(() => onboarding.value.time_to_first_prayer)

const arrivals = computed(() => buildSeries(users.value.daily_new_users || {}, props.period.start, props.period.end, { monthly: props.monthly }))
const arrivalsAverage = computed(() => {
  const points = arrivals.value.length
  return points ? arrivals.value.reduce((sum, point) => sum + point.value, 0) / points : 0
})

const funnel = computed(() => {
  const data = onboarding.value.funnel || {}
  const registered = data.registered || 0
  const steps = [
    { key: 'registered', label: 'Criaram a conta', value: registered },
    { key: 'onboarding_completed', label: 'Terminaram a configuração', value: data.onboarding_completed || 0 },
    { key: 'first_prayer', label: 'Rezaram o primeiro ofício', value: data.first_prayer || 0 },
    { key: 'prayed_seven_times', label: 'Chegaram a sete orações', value: data.prayed_seven_times || 0 }
  ]
  let biggest = { index: -1, loss: 0 }
  steps.forEach((step, index) => {
    if (!index) return
    const loss = steps[index - 1].value - step.value
    if (loss > biggest.loss) biggest = { index, loss }
  })
  return steps.map((step, index) => ({
    ...step,
    pct: registered ? step.value / registered * 100 : 0,
    rate: registered ? formatPercent(Math.round(step.value / registered * 1000) / 10) : '—',
    drop: index === biggest.index && biggest.loss > 0 ? `A maior perda: ${formatNumber(biggest.loss)} pessoas ficam entre “${steps[index - 1].label.toLowerCase()}” e este passo.` : ''
  }))
})

type RetentionView = 'weeks' | 'books' | 'modes'
const retentionView = ref<RetentionView>('weeks')

const HEAT = [
  { below: 8, bg: 'var(--op-seq-1)', ink: 'var(--op-ink)' },
  { below: 20, bg: 'var(--op-seq-2)', ink: 'var(--op-ink)' },
  { below: 32, bg: 'var(--op-seq-3)', ink: 'var(--op-ink)' },
  { below: 45, bg: 'var(--op-seq-4)', ink: '#fff' },
  { below: Infinity, bg: 'var(--op-seq-5)', ink: '#fff' }
]

interface HeatCell { label: string; detail: string; open: boolean; bg?: string; ink?: string }
const heatCell = (window?: RetentionWindow): HeatCell => {
  if (!window || window.eligible === 0) return { label: 'ainda não', detail: '', open: true }
  const rate = window.eligible_rate ?? window.rate
  if (rate == null) return { label: '—', detail: '', open: true }
  const tone = HEAT.find(step => rate < step.below) || HEAT[HEAT.length - 1]
  const base = window.eligible ?? null
  return {
    label: formatPercent(rate),
    detail: base != null ? `${formatNumber(window.users)} de ${formatNumber(base)}` : `${formatNumber(window.users)} pessoas`,
    open: false,
    bg: tone.bg,
    ink: tone.ink
  }
}

const weekRows = computed(() => (retention.value.cohorts || []).map(cohort => ({
  key: cohort.week_start,
  label: `Semana de ${formatDate(cohort.week_start)}`,
  code: null as string | null,
  users: cohort.users || 0,
  cells: [heatCell(cohort.d1), heatCell(cohort.d7), heatCell(cohort.d30)]
})))

const segmentRows = (segments: RetentionSegment[] | undefined, kind: 'book' | 'mode') => (segments || []).map(segment => ({
  key: `${kind}-${segment.prayer_book_code || segment.mode || 'none'}`,
  label: kind === 'book' ? (segment.prayer_book_name || 'Sem livro') : humanizeKey(segment.mode || 'basic'),
  code: kind === 'book' ? segment.prayer_book_code || null : null,
  users: segment.users || 0,
  cells: [heatCell(segment.d1), heatCell(segment.d7), heatCell(segment.d30)]
}))

const retentionRows = computed(() => {
  if (retentionView.value === 'books') return segmentRows(retention.value.by_prayer_book, 'book')
  if (retentionView.value === 'modes') return segmentRows(retention.value.by_mode, 'mode')
  return weekRows.value
})
const segmentsAvailable = computed(() => Boolean(retention.value.by_prayer_book || retention.value.by_mode))

const modes = computed(() => {
  const map = onboarding.value.choices?.modes || {}
  const total = Object.values(map).reduce((sum, value) => sum + (value || 0), 0)
  return Object.entries(map)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([key, value], index) => ({ key, label: humanizeKey(key), value: value || 0, share: total ? Math.round((value || 0) / total * 100) : 0, color: SERIES_COLORS[index] || 'var(--op-ink-faint)' }))
})

const chosenBooks = computed<BarListItem[]>(() => {
  const named = props.dashboard.prayer_books?.onboarding_choices_by_prayer_book
  const list = named?.length
    ? named.map(item => ({ code: item.code, name: item.name, value: item.users || 0 }))
    : Object.entries(onboarding.value.choices?.prayer_books || {}).map(([code, value]) => ({ code, name: code, value: value || 0 }))
  const total = list.reduce((sum, item) => sum + item.value, 0)
  return list
    .sort((a, b) => b.value - a.value)
    .map(item => ({ key: item.code, label: item.name, code: item.name === item.code ? null : item.code, value: item.value, display: formatNumber(item.value), share: total ? formatPercent(Math.round(item.value / total * 1000) / 10) : undefined, color: 'var(--op-ink)' }))
})

const languages = computed<BarListItem[]>(() => {
  const map = onboarding.value.choices?.languages || geography.value?.by_language || {}
  return Object.entries(map)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([key, value]) => ({ key, label: languageLabel(key), value: value || 0, display: formatNumber(value), color: 'var(--op-s2)' }))
})
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <section class="op-grid" style="--op-min: 240px" aria-label="Resumo">
      <OrdoMetricCard title="Contas novas" :value="formatNumber(users.new_users_in_period)" scope="period" :scope-label="shortPeriod" subtitle="criadas no período" />
      <OrdoMetricCard title="Pessoas que rezaram" :value="formatNumber(users.active_users_in_period)" scope="period" :scope-label="shortPeriod" subtitle="ao menos um ofício no período" />
      <OrdoMetricCard
        title="Até a primeira oração"
        :value="firstPrayer?.median_seconds != null ? formatDuration(firstPrayer.median_seconds) : '—'"
        scope="period"
        :scope-label="shortPeriod"
        :subtitle="firstPrayer ? `metade reza antes disso · ${formatPercent(firstPrayer.within_1_hour_rate)} na primeira hora, ${formatPercent(firstPrayer.within_1_day_rate)} no primeiro dia` : 'Aparece quando a API publicar este número.'"
      />
      <OrdoMetricCard title="Aparelhos com lembretes" :value="formatNumber(users.active_fcm_tokens)" scope="lifetime" subtitle="usados nos últimos 60 dias" />
    </section>

    <section class="op-row">
      <OrdoChartCard class="op-grow-2" eyebrow="Chegada" :title="monthly ? 'Contas novas por mês' : 'Contas novas por dia'" :description="monthly ? 'Soma das contas criadas em cada mês.' : 'Dias sem nenhuma conta nova aparecem como zero.'">
        <template #actions>
          <div style="text-align: right">
            <strong class="op-display" style="font-size: 26px">{{ formatNumber(users.new_users_in_period) }}</strong>
            <span class="op-faint" style="display: block; font-size: 12.5px">média de {{ formatNumber(Math.round(arrivalsAverage)) }} por {{ monthly ? 'mês' : 'dia' }}</span>
          </div>
        </template>
        <OrdoTrendChart :points="arrivals" variant="bars" unit="contas" :height="210" aria-label="Contas novas no período" />
        <template v-if="!monthly" #footer><span>Barras mais escuras são domingos.</span></template>
      </OrdoChartCard>

      <OrdoChartCard class="op-grow-1" eyebrow="Primeiros passos" title="Do cadastro ao hábito" description="Quem chegou no período, passo a passo." scope="period" :scope-label="shortPeriod">
        <ol style="display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none">
          <li v-for="(step, index) in funnel" :key="step.key" style="display: flex; flex-direction: column; gap: 6px">
            <div class="op-barlist__line">
              <span class="op-barlist__label"><span class="op-display op-faint">{{ index + 1 }}</span>{{ step.label }}</span>
              <span class="op-barlist__value"><strong>{{ formatNumber(step.value) }}</strong> · {{ step.rate }}</span>
            </div>
            <div class="op-track" style="height: 20px; border-radius: 6px" aria-hidden="true">
              <span :style="{ width: `${step.pct}%`, borderRadius: '6px', background: index ? 'var(--op-action)' : 'var(--op-ink)' }" />
            </div>
            <span v-if="step.drop" style="color: var(--op-warn); font-size: 12.5px">{{ step.drop }}</span>
          </li>
        </ol>
        <template v-if="firstPrayer" #footer>
          <span>Quem reza, reza cedo: metade faz o primeiro ofício em até <strong style="color: var(--op-ink)">{{ formatDuration(firstPrayer.median_seconds) }}</strong>; três em cada quatro, em até {{ formatDuration(firstPrayer.p75_seconds) }}.</span>
        </template>
      </OrdoChartCard>
    </section>

    <OrdoChartCard eyebrow="Retorno" title="Quem volta a rezar" description="Parte de quem chegou que rezou de novo no dia seguinte, depois de uma semana e depois de um mês. Só conta quem já teve tempo para voltar.">
      <template #actions>
        <div class="op-seg op-seg--small" role="group" aria-label="Agrupar retorno">
          <button type="button" :class="{ 'is-on': retentionView === 'weeks' }" :aria-pressed="retentionView === 'weeks'" @click="retentionView = 'weeks'">Por semana</button>
          <button type="button" :class="{ 'is-on': retentionView === 'books' }" :aria-pressed="retentionView === 'books'" :disabled="!segmentsAvailable" @click="retentionView = 'books'">Por livro</button>
          <button type="button" :class="{ 'is-on': retentionView === 'modes' }" :aria-pressed="retentionView === 'modes'" :disabled="!segmentsAvailable" @click="retentionView = 'modes'">Por modo</button>
        </div>
      </template>
      <div class="op-table-wrap">
        <table class="op-table op-heat" style="min-width: 560px">
          <thead>
            <tr>
              <th scope="col">{{ retentionView === 'weeks' ? 'Chegaram' : retentionView === 'books' ? 'Livro escolhido' : 'Modo do app' }}</th>
              <th scope="col" class="is-num">Pessoas</th>
              <th scope="col" style="text-align: center">No dia seguinte</th>
              <th scope="col" style="text-align: center">Após 1 semana</th>
              <th scope="col" style="text-align: center">Após 1 mês</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in retentionRows" :key="row.key">
              <th scope="row" style="white-space: nowrap"><span style="display: inline-flex; align-items: center; gap: 8px">{{ row.label }} <OrdoLocBadge :code="row.code" /></span></th>
              <td class="is-num">{{ formatNumber(row.users) }}</td>
              <td v-for="(cell, index) in row.cells" :key="index" class="op-heat__cell" :class="{ 'is-open': cell.open }" :style="cell.open ? undefined : { background: cell.bg, color: cell.ink }">
                {{ cell.label }}<small v-if="cell.detail">{{ cell.detail }}</small>
              </td>
            </tr>
            <tr v-if="!retentionRows.length"><td colspan="5" class="op-faint">Ninguém chegou neste período.</td></tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <span>“Ainda não” quer dizer que ninguém do grupo teve tempo de voltar.</span>
        <span class="op-legend" aria-hidden="true">
          <span>0%</span>
          <span style="display: flex; gap: 2px"><i v-for="tone in HEAT" :key="tone.bg" class="op-swatch" style="width: 18px" :style="{ background: tone.bg }" /></span>
          <span>60%</span>
        </span>
      </template>
    </OrdoChartCard>

    <OrdoCountryMap v-if="geography" :geography="geography" />

    <section class="op-grid" style="--op-min: 320px">
      <OrdoChartCard eyebrow="Primeiro acesso" title="O que escolhem ao chegar" description="A escolha inicial, que pode mudar depois." scope="period" :scope-label="shortPeriod">
        <div v-if="modes.length" style="display: flex; flex-direction: column; gap: 8px">
          <span class="op-eyebrow">Modo do app</span>
          <div class="op-stack" aria-hidden="true">
            <span v-for="mode in modes" :key="mode.key" :style="{ flex: `${mode.value} 1 0`, background: mode.color }" />
          </div>
          <div class="op-legend">
            <span v-for="mode in modes" :key="mode.key"><i class="op-swatch" :style="{ background: mode.color }" />{{ mode.label }} <strong style="color: var(--op-ink)">{{ mode.share }}%</strong></span>
          </div>
        </div>
        <span class="op-eyebrow" style="margin-top: 6px">Livro de oração</span>
        <OrdoBarList :items="chosenBooks" :limit="6" :thickness="6" />
      </OrdoChartCard>
      <OrdoChartCard eyebrow="Idiomas" title="Em que língua rezam" description="O idioma do livro escolhido no primeiro acesso.">
        <OrdoBarList :items="languages" :limit="6" :thickness="6" />
      </OrdoChartCard>
    </section>
  </div>
</template>
