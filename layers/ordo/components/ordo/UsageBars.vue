<script setup lang="ts">
// A compact bar list: the label, the bar and the share with its count, in
// three columns, for the Público cards (platform, language, versions).
export interface UsageBar {
  key: string
  label: string
  value: number
  share: string
  display?: string
  hint?: string
  color?: string
  faint?: boolean
}

const props = withDefaults(defineProps<{
  items: UsageBar[]
  limit?: number
  narrowLabel?: boolean
  emptyMessage?: string
}>(), { limit: 8, narrowLabel: false, emptyMessage: 'Nada registrado neste período.' })

const visible = computed(() => props.items.slice(0, props.limit))
const top = computed(() => Math.max(...visible.value.map(item => item.value), 1))
</script>

<template>
  <ul v-if="visible.length" class="op-usage__bars" :class="{ 'is-narrow': narrowLabel }">
    <li v-for="item in visible" :key="item.key">
      <b :class="{ 'op-faint': item.faint }">{{ item.label }} <small v-if="item.hint" class="op-faint">{{ item.hint }}</small></b>
      <div class="op-track" aria-hidden="true"><span :style="{ width: `${Math.max(item.value / top * 100, item.value ? 1 : 0)}%`, background: item.color || 'var(--op-action)' }" /></div>
      <span><strong>{{ item.share }}</strong><template v-if="item.display"> · {{ item.display }}</template></span>
    </li>
  </ul>
  <p v-else class="op-empty">{{ emptyMessage }}</p>
</template>
