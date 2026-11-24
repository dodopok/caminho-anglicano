<script setup lang="ts">
import OrdoScopeTag from './ScopeTag.vue'
import type { DashboardScope } from '../../types/dashboard'

// One number, what it counts, and whether it belongs to the period or to the
// whole base. `color`, `icon` and `eyebrow` stay accepted for older callers.
interface Props {
  title: string
  value: string | number
  subtitle?: string
  unit?: string
  scope?: DashboardScope | null
  scopeLabel?: string
  compact?: boolean
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
  color: undefined,
  icon: undefined,
  eyebrow: undefined
})
</script>

<template>
  <article class="op-card op-metric" :class="{ 'op-metric--compact': compact }">
    <div class="op-metric__top">
      <span class="op-metric__label">{{ title }}</span>
      <OrdoScopeTag v-if="scope" :scope="scope" :label="scopeLabel" />
    </div>
    <span class="op-metric__value">{{ value }}<small v-if="unit">{{ unit }}</small></span>
    <span v-if="subtitle" class="op-metric__sub">{{ subtitle }}</span>
    <slot />
  </article>
</template>
