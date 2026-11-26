<script setup lang="ts">
import OrdoMetricCard from './MetricCard.vue'
import OrdoSummaryBand from './SummaryBand.vue'
import OrdoUsageFeatureRanking from './UsageFeatureRanking.vue'
import OrdoUsageMoves from './UsageMoves.vue'
import OrdoUsagePeopleChart from './UsagePeopleChart.vue'
import OrdoUsageSectionLinks from './UsageSectionLinks.vue'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import {
  activeNumbers,
  buildMoves,
  datesIn,
  dayStates,
  latestActiveDay,
  periodPhrase,
  shortDate,
  summarySentence,
  telemetryGaps,
  telemetryStart,
  total
} from '../../utils/usage'

// Resumo: the period in one sentence, four numbers against the window
// before, people day by day, what moved most and the features ranked.
const api = useUsageApi()
const { core, window, previous, previousLabel, period, appEvents } = useUsageContext()

const narrations = useWindowReport(range => api.series(range, { event: 'narration_started' }))
const narrationsPrevious = useWindowReport((_, before) => before ? api.series(before, { event: 'narration_started' }) : Promise.resolve(null))
const narrationsEnded = useWindowReport(range => api.series(range, { event: 'narration_ended' }))

const sum = (series?: Array<{ count: number }> | null) => series ? total(series.map(point => point.count || 0)) : null

const gaps = computed(() => {
  const dates = datesIn(window.value.start_date, window.value.end_date)
  const byDate = new Map((core.active.data?.series || []).map(point => [point.date, point.dau]))
  return telemetryGaps(dates, dates.map(date => byDate.get(date) || 0), {
    startedOn: telemetryStart(core.status.data),
    states: dayStates(core.status.data),
    previousHasData: Boolean(latestActiveDay(core.activePrevious.data?.series || []))
  })
})
const now = computed(() => activeNumbers(core.active.data?.series, window.value, gaps.value))
const before = computed(() => previous.value && core.activePrevious.data && latestActiveDay(core.activePrevious.data.series || [])
  ? activeNumbers(core.activePrevious.data.series, previous.value)
  : null)

const offices = computed(() => sum(core.offices.data?.series))
const officesBefore = computed(() => before.value ? sum(core.officesPrevious.data?.series) : null)
const narrationCount = computed(() => sum(narrations.data?.series))
const narrationBefore = computed(() => before.value ? sum(narrationsPrevious.data?.series) : null)
const narrationEnded = computed(() => sum(narrationsEnded.data?.series))

const moves = computed(() => before.value ? buildMoves(core.top.data?.features, core.topPrevious.data?.features) : [])
const sentence = computed(() => summarySentence({
  people: now.value.people,
  peoplePrevious: before.value?.people,
  offices: offices.value,
  officesPrevious: officesBefore.value,
  perDay: now.value.perDay,
  phrase: periodPhrase(period.value, window.value),
  previousLabel: previousLabel.value,
  moves: moves.value
}))

const fmt = (value: number | null | undefined, digits = 0) => value === null || value === undefined ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: digits })
const percent = (part: number | null, whole: number | null) => part !== null && whole ? Math.round(part / whole * 100) : null

const windowWords = { dia: 'no dia', semana: 'em 7 dias', mes: 'em 30 dias' } as const
const peopleSub = computed(() => now.value.latest ? `distintas ${windowWords[now.value.peopleWindow]}, até ${shortDate(now.value.latest.date)}` : undefined)
const perDaySub = computed(() => {
  const share = percent(now.value.perDay, now.value.latest?.mau ?? null)
  return share === null ? 'pessoas distintas por dia' : `${share}% das pessoas do mês voltam a cada dia`
})
const officesSub = computed(() => offices.value !== null && now.value.people ? `marcados como rezados · ${fmt(offices.value / now.value.people, 1)} por pessoa` : 'marcados como rezados')
const narrationSub = computed(() => {
  const heard = percent(narrationEnded.value, narrationCount.value)
  const web = appEvents.value ? '' : ' · só web, por ora'
  return heard === null ? `começadas no app e na web${web}` : `${heard}% ouvidas até o fim${web}`
})

const deltas = computed(() => ({
  people: before.value ? comparePeriods(now.value.people, before.value.people) : null,
  perDay: before.value ? comparePeriods(now.value.perDay === null ? null : Math.round(now.value.perDay), before.value.perDay === null ? null : Math.round(before.value.perDay)) : null,
  offices: comparePeriods(offices.value, officesBefore.value),
  narrations: comparePeriods(narrationCount.value, narrationBefore.value)
}))
</script>

<template>
  <OrdoSummaryBand :title="sentence.title" icon="activity" label="Resumo em palavras">
    <template v-for="(part, index) in sentence.parts" :key="index"><b v-if="part.bold">{{ part.text }}</b><template v-else>{{ part.text }}</template></template>
  </OrdoSummaryBand>

  <section class="op-tiles op-tiles--4 op-usage__kpis" aria-label="Números do período">
    <OrdoMetricCard title="Pessoas ativas" :value="fmt(now.people)" scope="period" :loading="core.active.loading && !core.active.data" :delta="deltas.people" :delta-label="previousLabel" :subtitle="peopleSub" />
    <OrdoMetricCard title="Por dia, em média" :value="fmt(now.perDay)" scope="period" :loading="core.active.loading && !core.active.data" :delta="deltas.perDay" :delta-label="previousLabel" :subtitle="perDaySub" />
    <OrdoMetricCard title="Ofícios rezados" :value="fmt(offices)" scope="period" :loading="core.offices.loading && !core.offices.data" :delta="deltas.offices" :delta-label="previousLabel" :subtitle="officesSub" />
    <OrdoMetricCard title="Narrações começadas" :value="fmt(narrationCount)" scope="period" :loading="narrations.loading && !narrations.data" :delta="deltas.narrations" :delta-label="previousLabel" :subtitle="narrationSub" />
  </section>

  <section class="op-row">
    <OrdoUsagePeopleChart class="op-grow-2" />
    <OrdoUsageMoves class="op-grow-1 op-only-wide" :moves="moves" :has-previous="Boolean(before)" />
  </section>

  <OrdoUsageFeatureRanking :limit="9" />

  <OrdoUsageSectionLinks class="op-only-wide" />
</template>
