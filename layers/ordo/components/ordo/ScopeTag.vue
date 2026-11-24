<script setup lang="ts">
import type { DashboardScope } from '../../types/dashboard'

// Says whether a number belongs to the chosen period or to the whole base.
// The old panel mixed the two without telling them apart.
const props = defineProps<{
  scope?: DashboardScope | null
  label?: string
}>()

const DEFAULT_LABELS: Record<DashboardScope, string> = {
  period: 'No período',
  lifetime: 'Base total',
  window: 'Janela móvel',
  today: 'Hoje'
}

const resolvedScope = computed<DashboardScope>(() => props.scope || 'period')
const text = computed(() => props.label || DEFAULT_LABELS[resolvedScope.value])
</script>

<template>
  <span class="op-tag" :class="`op-tag--${resolvedScope}`"><i aria-hidden="true" />{{ text }}</span>
</template>
