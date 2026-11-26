<script setup lang="ts">
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoScopeTag from './ScopeTag.vue'
import type { Comparison } from '../../utils/compare'
import type { DashboardScope } from '../../types/dashboard'

// One number, what it counts, and whether it belongs to the period or to the
// whole base. `delta` says how it moved against the window just before;
// `loading` draws the card's shape while its section is on its way, so a
// zero never stands in for "not loaded yet". `color`, `icon` and `eyebrow`
// stay accepted for older callers. The `badge` slot puts a status dot, pill or
// count in the top corner: colour lives there, never as a stripe on the card.
interface Props {
  title: string
  value: string | number
  subtitle?: string
  unit?: string
  scope?: DashboardScope | null
  scopeLabel?: string
  compact?: boolean
  loading?: boolean
  delta?: Comparison | null
  deltaLabel?: string
  deltaLoading?: boolean
  /** A word ("Fish Audio", "Fora do ar") instead of a number: drawn smaller. */
  word?: boolean
  color?: string
  icon?: string
  eyebrow?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  unit: undefined,
  scope: undefined,
  scopeLabel: undefined,
  compact: false,
  loading: false,
  delta: undefined,
  deltaLabel: undefined,
  deltaLoading: false,
  word: false,
  color: undefined,
  icon: undefined,
  eyebrow: undefined
})
</script>

<template>
  <article class="op-card op-metric" :class="{ 'op-metric--compact': compact }" :aria-busy="loading || undefined">
    <div class="op-metric__top">
      <span class="op-metric__label">{{ title }}</span>
      <span v-if="scope || $slots.badge" class="op-metric__badge">
        <OrdoScopeTag v-if="scope" :scope="scope" :label="scopeLabel" />
        <slot name="badge" />
      </span>
    </div>
    <template v-if="loading">
      <span class="op-skeleton op-metric__skeleton-value" aria-hidden="true" />
      <span class="op-skeleton op-metric__skeleton-line" aria-hidden="true" />
      <span class="op-sr-only">Carregando {{ title.toLowerCase() }}…</span>
    </template>
    <template v-else>
      <span class="op-metric__value" :class="{ 'is-word': word }">{{ value }}<small v-if="unit">{{ unit }}</small></span>
      <OrdoDeltaChip v-if="delta" :delta="delta" :label="deltaLabel" />
      <span v-else-if="deltaLoading" class="op-skeleton op-metric__skeleton-delta" aria-hidden="true" />
      <span v-if="subtitle" class="op-metric__sub">{{ subtitle }}</span>
      <slot />
    </template>
  </article>
</template>
