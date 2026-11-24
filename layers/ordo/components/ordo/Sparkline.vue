<script setup lang="ts">
const props = withDefaults(defineProps<{
  values: number[]
  color?: string
  height?: number
}>(), {
  color: 'var(--op-action)',
  height: 30
})

const points = computed(() => {
  const values = props.values.filter(value => Number.isFinite(value))
  if (values.length < 2) return ''

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  return values
    .map((value, index) => `${(index / (values.length - 1) * 100).toFixed(2)},${(28 - (value - min) / span * 26).toFixed(2)}`)
    .join(' ')
})
</script>

<template>
  <svg v-if="points" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" :style="{ width: '100%', height: `${height}px`, overflow: 'visible' }">
    <polyline :points="points" fill="none" :stroke="color" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
