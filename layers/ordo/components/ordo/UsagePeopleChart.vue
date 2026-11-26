<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoTrendChart from './TrendChart.vue'
import { useQueryParam } from '../../composables/usePortalQuery'
import { errorText } from '../../composables/useReport'
import { useUsageContext } from '../../composables/useUsageContext'
import { buildSeries } from '../../utils/series'
import { closingDays, dailyValues, datesIn, dayStates, latestActiveDay, telemetryGaps, telemetryStart, windowLabel } from '../../utils/usage'

// People day by day, with the same days of the window before as a dashed
// line. Days before the telemetry existed are striped, not drawn as zero;
// the last days the nightly rollup may still rewrite are shaded.
const props = withDefaults(defineProps<{ title?: string; compact?: boolean }>(), {
  title: 'Quem abriu o Ordo, dia a dia',
  compact: false
})

const { core, window, previous, monthly, today } = useUsageContext()
const activeWindow = useQueryParam<'dia' | 'semana' | 'mes'>('ativos', 'dia', ['dia', 'semana', 'mes'])
const KEY = { dia: 'dau', semana: 'wau', mes: 'mau' } as const

const dates = computed(() => datesIn(window.value.start_date, window.value.end_date))
const values = computed(() => dailyValues(core.active.data?.series, window.value, point => point[KEY[activeWindow.value]] || 0))
const previousValues = computed(() => previous.value && core.activePrevious.data
  ? dailyValues(core.activePrevious.data.series, previous.value, point => point[KEY[activeWindow.value]] || 0)
  : null)
const hasData = computed(() => Boolean(latestActiveDay(core.active.data?.series || [])))
const states = computed(() => dayStates(core.status.data))
// With the status, the previous window has data when any of its days does.
const previousHasData = computed(() => {
  const window = previous.value
  if (window && states.value.size) {
    const days = datesIn(window.start_date, window.end_date)
    if (days.every(day => states.value.has(day))) return days.some(day => ['closed', 'closing'].includes(states.value.get(day) || ''))
  }
  return Boolean(latestActiveDay(core.activePrevious.data?.series || []))
})
const gaps = computed(() => telemetryGaps(dates.value, values.value, { startedOn: telemetryStart(core.status.data), previousHasData: previousHasData.value, states: states.value }))
const hasGaps = computed(() => gaps.value.some(Boolean))
const comparisonMissing = computed(() => Boolean(previous.value) && core.activePrevious.settled && !previousHasData.value && hasData.value)

const points = computed(() => buildSeries(
  dates.value.map((date, index) => ({ date, value: values.value[index] })),
  window.value.start_date,
  window.value.end_date,
  { monthly: monthly.value, average: true }
))
// Day against day only makes sense day by day.
const previousLine = computed(() => !monthly.value && previousValues.value && previousHasData.value ? previousValues.value : null)
const closing = computed(() => monthly.value ? 0 : closingDays(dates.value, today(), states.value))

// Which weekday carries the most people, to say it in the foot.
const sundayPeak = computed(() => {
  const sums = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }))
  dates.value.forEach((date, index) => {
    if (gaps.value[index] || !values.value[index]) return
    const day = new Date(`${date}T12:00:00`).getDay()
    sums[day].total += values.value[index]
    sums[day].days += 1
  })
  const averages = sums.map(item => item.days ? item.total / item.days : 0)
  return averages[0] > 0 && averages[0] === Math.max(...averages)
})

const description = computed(() => {
  if (hasGaps.value) return 'O período pedido começa antes da telemetria existir: esses dias aparecem riscados, não como zero.'
  if (monthly.value) return 'Média diária de cada mês.'
  return 'Pessoas distintas em cada dia. A linha tracejada é o mesmo dia do período anterior.'
})
const windowTitle = computed(() => ({ dia: 'pessoas', semana: 'pessoas em 7 dias', mes: 'pessoas em 30 dias' })[activeWindow.value])
defineExpose({ hasGaps })
</script>

<template>
  <OrdoChartCard :loading="core.active.loading && !core.active.data" :skeleton-height="230" eyebrow="Pessoas" :title="props.title" :description="compact ? undefined : description">
    <template #actions>
      <span v-if="comparisonMissing && !compact" class="op-pill op-pill--warn">comparação indisponível: o período anterior não tem dados</span>
      <div v-if="!compact" class="op-seg op-seg--small" role="group" aria-label="Janela de pessoas ativas">
        <button type="button" :class="{ 'is-on': activeWindow === 'dia' }" :aria-pressed="activeWindow === 'dia'" @click="activeWindow = 'dia'">Dia</button>
        <button type="button" :class="{ 'is-on': activeWindow === 'semana' }" :aria-pressed="activeWindow === 'semana'" @click="activeWindow = 'semana'">7 dias</button>
        <button type="button" :class="{ 'is-on': activeWindow === 'mes' }" :aria-pressed="activeWindow === 'mes'" @click="activeWindow = 'mes'">30 dias</button>
      </div>
    </template>
    <OrdoTrendChart
      v-if="hasData"
      :points="points"
      :previous="previousLine"
      :gaps="monthly ? null : gaps"
      gap-label="antes da telemetria · sem dados"
      :closing="closing"
      :height="compact ? 150 : 230"
      :unit="windowTitle"
      previous-label="período anterior"
      aria-label="Pessoas ativas no período"
    />
    <p v-else class="op-empty">{{ errorText(core.active.error) || 'Nenhuma pessoa ativa registrada no período.' }}</p>
    <template v-if="hasData" #footer>
      <span class="op-legend">
        <span><i class="op-legend-line" />{{ compact ? 'este período' : windowLabel(window) }}</span>
        <span v-if="previousLine"><i class="op-legend-line op-legend-line--prev" />{{ compact ? 'anterior' : windowLabel(previous) }}</span>
        <span v-if="hasGaps && !compact"><i class="op-swatch op-usage__swatch-gap" />sem telemetria</span>
        <span v-if="closing && !compact"><i class="op-swatch op-usage__swatch-closing" />últimos {{ closing }} dias: podem mudar até o próximo resumo</span>
      </span>
      <span v-if="!compact && hasGaps">Médias e “vs. anterior” usam só os dias com dados.</span>
      <span v-else-if="!compact && sundayPeak">Domingos puxam o pico: o domingo é o dia com mais gente.</span>
    </template>
  </OrdoChartCard>
</template>
