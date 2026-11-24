<script setup lang="ts">
import type { Comparison } from '../../utils/compare'

// How a number moved against the window just before. The arrow and the sign
// carry the direction; the colour only says whether that is good news.
defineProps<{
  delta: Comparison
  /** "30 dias anteriores" */
  label?: string
}>()

const ARROWS = {
  up: 'M12 19V5M5.5 11.5 12 5l6.5 6.5',
  down: 'M12 5v14M5.5 12.5 12 19l6.5-6.5',
  flat: 'M5 12h14'
} as const
</script>

<template>
  <span class="op-metric__delta">
    <span class="op-delta" :class="`op-delta--${delta.tone}`" :title="label ? `${label}: ${delta.previousText}` : delta.previousText">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ARROWS[delta.direction]" /></svg>
      {{ delta.text }}
    </span>
    <span v-if="label" class="op-metric__delta-vs">vs. {{ label }} <span class="op-metric__delta-was">({{ delta.previousText }})</span></span>
  </span>
</template>
