<script setup lang="ts">
// A ranking of people. Names and public IDs only: e-mails never reach it.
interface ListItem {
  label: string
  value: number
  subtitle?: string
  display?: string
}

interface Props {
  items: ListItem[]
  max?: number
  emptyMessage?: string
  unit?: string
}

const props = withDefaults(defineProps<Props>(), {
  max: 10,
  emptyMessage: 'Ainda não há registros para este período.',
  unit: ''
})

const displayItems = computed(() => props.items.slice(0, props.max))
const initials = (label: string) => label
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase() || '')
  .join('') || '?'
const valueText = (item: ListItem) => item.display
  ?? `${item.value.toLocaleString('pt-BR')}${props.unit ? ` ${props.unit}` : ''}`
</script>

<template>
  <ol v-if="displayItems.length" class="op-ranklist">
    <li v-for="(item, index) in displayItems" :key="`${item.label}-${index}`">
      <span class="op-ranklist__n">{{ index + 1 }}</span>
      <span class="op-initials" aria-hidden="true">{{ initials(item.label) }}</span>
      <span class="op-ranklist__copy">
        <strong>{{ item.label }}</strong>
        <span v-if="item.subtitle">{{ item.subtitle }}</span>
      </span>
      <span class="op-ranklist__value">{{ valueText(item) }}</span>
    </li>
  </ol>
  <p v-else class="op-empty">{{ emptyMessage }}</p>
</template>
