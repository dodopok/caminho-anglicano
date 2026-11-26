<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { eventLabel, FUNNEL_LABELS, ratePercent } from '../../utils/usage'
import type { UsageFunnel, UsagePeriod } from '../../types/usage'

// One funnel: each step with its events and people-days, and, for the paths
// one person walks (office, Ordo+), how many of the days that started it
// reached the last step. That part reads the raw events, so it only covers
// the days still inside their 90 days (`rawWindow`).
const props = defineProps<{
  funnel: UsageFunnel
  rawWindow: UsagePeriod | null
}>()

const { formatNumber, formatPercent, formatDate } = useOrdoDashboardPresentation()

const meta = computed(() => FUNNEL_LABELS[props.funnel.key] || { title: props.funnel.key, description: '' })

const steps = computed<BarListItem[]>(() => {
  const first = props.funnel.steps[0]?.count || 0
  return props.funnel.steps.map((step, index) => ({
    key: step.event,
    label: `${index + 1}. ${eventLabel(step.event)}`,
    value: step.count,
    display: formatNumber(step.count),
    share: index > 0 && first ? `${formatPercent(Math.round(step.count / first * 1000) / 10)} do 1º passo` : undefined,
    hint: `${formatNumber(step.user_days)} pessoas-dia · ${step.event}`
  }))
})

const rate = computed(() => ratePercent(props.funnel.rate))
const windowLabel = computed(() => {
  const window = props.rawWindow
  if (!window) return null
  return `${formatDate(window.start_date)} – ${formatDate(window.end_date)}`
})
</script>

<template>
  <OrdoChartCard eyebrow="Funil" :title="meta.title" :description="meta.description">
    <OrdoBarList :items="steps" :thickness="8" empty-message="Nenhum passo registrado no período." />
    <template v-if="funnel.per_user" #footer>
      <span v-if="!rawWindow">A conversão por pessoa lê os eventos brutos, que ficam só 90 dias, e este período já saiu dessa janela.</span>
      <span v-else-if="!funnel.started">Ninguém começou este caminho entre {{ windowLabel }}.</span>
      <span v-else>
        <strong style="color: var(--op-ink)">{{ rate === null ? '—' : formatPercent(rate) }}</strong>
        dos dias em que alguém deu o 1º passo terminaram no último
        ({{ formatNumber(funnel.converted) }} de {{ formatNumber(funnel.started) }} pessoas-dia, {{ windowLabel }}).
      </span>
    </template>
    <template v-else #footer>
      <span>O link é aberto por outra pessoa, então aqui não há conversão por pessoa: só os passos.</span>
    </template>
  </OrdoChartCard>
</template>
