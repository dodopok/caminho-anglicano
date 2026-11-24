<script setup lang="ts">
import OrdoIcon, { type OrdoIconName } from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'

// Horizontal bars with the label and the number written out: the bar only
// shows proportion, it never carries the value on its own.
export interface BarListItem {
  key: string
  label: string
  value: number
  display?: string
  share?: string
  hint?: string
  color?: string
  tint?: string
  icon?: OrdoIconName
  code?: string | null
}

const props = withDefaults(defineProps<{
  items: BarListItem[]
  max?: number
  limit?: number
  thickness?: number
  emptyMessage?: string
}>(), {
  max: undefined,
  limit: 8,
  thickness: 8,
  emptyMessage: 'Nada registrado neste período.'
})

const visible = computed(() => props.items.slice(0, props.limit))
const top = computed(() => props.max ?? Math.max(...visible.value.map(item => item.value), 1))
const width = (item: BarListItem) => `${Math.max(item.value / top.value * 100, item.value > 0 ? 1.5 : 0)}%`
</script>

<template>
  <ul v-if="visible.length" class="op-barlist">
    <li v-for="item in visible" :key="item.key" class="op-barlist__row">
      <span v-if="item.icon" class="op-barlist__icon" :style="{ background: item.tint || 'var(--op-wash)', color: item.color || 'var(--op-action)' }">
        <OrdoIcon :name="item.icon" />
      </span>
      <div class="op-barlist__body">
        <div class="op-barlist__line">
          <span class="op-barlist__label">{{ item.label }} <OrdoLocBadge :code="item.code" /></span>
          <span class="op-barlist__value"><strong>{{ item.display ?? item.value.toLocaleString('pt-BR') }}</strong><template v-if="item.share"> · {{ item.share }}</template></span>
        </div>
        <div class="op-track" :style="{ height: `${thickness}px` }" aria-hidden="true">
          <span :style="{ width: width(item), background: item.color || 'var(--op-action)' }" />
        </div>
        <span v-if="item.hint" class="op-faint" style="font-size: 12px">{{ item.hint }}</span>
      </div>
    </li>
  </ul>
  <p v-else class="op-empty">{{ emptyMessage }}</p>
</template>
