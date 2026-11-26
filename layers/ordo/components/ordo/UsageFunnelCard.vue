<script setup lang="ts">
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import { useUsageContext } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { funnelView, windowLabel } from '../../utils/usage'
import type { UsageFunnel, UsagePeriod } from '../../types/usage'

// One funnel told in words, then its steps as bars, with where most people
// stop. A path one person walks (office, Ordo+) compares its rate in points;
// sharing compares its sends.
const props = withDefaults(defineProps<{
  funnel: UsageFunnel
  previous?: UsageFunnel | null
  rawWindow?: UsagePeriod | null
  eyebrow?: string
  title?: string
  showDrop?: boolean
  partial?: boolean
}>(), {
  previous: null,
  rawWindow: null,
  eyebrow: undefined,
  title: undefined,
  showDrop: true,
  partial: false
})

const { openTab } = useUsageContext()
const view = computed(() => funnelView(props.funnel))
const previousView = computed(() => props.previous ? funnelView(props.previous) : null)

const delta = computed(() => {
  if (!previousView.value || props.partial) return null
  if (view.value.perUser) {
    const now = view.value.rate
    const then = previousView.value.rate
    return now === null || then === null ? null : comparePeriods(now * 100, then * 100, { kind: 'rate' })
  }
  return comparePeriods(view.value.steps[1]?.value, previousView.value.steps[1]?.value)
})

const fmt = (value: number) => value.toLocaleString('pt-BR')
const wasText = computed(() => previousView.value?.rate === null || previousView.value?.rate === undefined
  ? ''
  : ` · era ${(previousView.value.rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% no período anterior`)
const eyebrowText = computed(() => props.eyebrow || (view.value.perUser ? 'Funil · por pessoa' : 'Funil · passos'))
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">{{ eyebrowText }}</p>
        <h3>{{ title || view.title }}</h3>
        <p v-if="!title && view.description">{{ view.description }}</p>
      </div>
      <span v-if="partial" class="op-pill op-pill--warn">parcial: só web</span>
      <OrdoDeltaChip v-else-if="delta" :delta="delta" />
    </div>
    <p class="op-say"><template v-for="(part, index) in view.say" :key="index"><b v-if="part.bold">{{ part.text }}</b><template v-else>{{ part.text }}</template></template></p>
    <ol class="op-funnel">
      <template v-for="(step, index) in view.steps" :key="index">
        <li class="op-funnel__step">
          <span class="op-funnel__n">{{ index + 1 }}</span>
          <span class="op-funnel__label">{{ step.label }}</span>
          <span class="op-funnel__value">{{ fmt(step.value) }}</span>
          <div class="op-funnel__bar" aria-hidden="true"><span :class="{ 'is-ok': step.ok }" :style="{ width: `${Math.max(step.width, step.value ? 3 : 0)}%` }">{{ step.width >= 12 || step.ok ? step.badge : '' }}</span></div>
        </li>
        <li v-if="showDrop && view.drop && view.drop.afterStep === index" class="op-funnel__step" aria-label="Onde se perde">
          <span />
          <span class="op-funnel__drop"><OrdoIcon name="chevron-down" :size="14" />{{ view.drop.text }}</span>
        </li>
      </template>
    </ol>
    <div class="op-panel__foot">
      <slot name="footer">
        <span v-if="funnel.key === 'share'">Sem conversão por pessoa: quem abre o link é outra pessoa.</span>
        <span v-else-if="funnel.key === 'paywall'">
          {{ view.rate === null ? '—' : `${(view.rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` }} · para assinaturas de verdade, veja
          <button type="button" class="op-link" @click="openTab('platform')">Negócio &amp; API</button>
        </span>
        <span v-else>Pessoas-dia{{ rawWindow ? ` · ${windowLabel(rawWindow)}` : '' }}{{ wasText }}</span>
      </slot>
    </div>
  </section>
</template>
