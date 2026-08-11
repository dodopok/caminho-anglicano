<script setup lang="ts">
interface ListItem {
  label: string
  value: number
  subtitle?: string
}

interface Props {
  items: ListItem[]
  max?: number
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  max: 10,
  emptyMessage: 'Ainda não há registros para este período.'
})

const displayItems = computed(() => props.items.slice(0, props.max))
const maxValue = computed(() => Math.max(...displayItems.value.map(item => item.value), 1))
</script>

<template>
  <div v-if="displayItems.length" class="ordo-top-list">
    <div v-for="(item, index) in displayItems" :key="`${item.label}-${index}`" class="ordo-top-list__item">
      <div class="ordo-top-list__rank" :class="{ 'ordo-top-list__rank--featured': index === 0 }">
        {{ String(index + 1).padStart(2, '0') }}
      </div>
      <div class="ordo-top-list__content">
        <div class="ordo-top-list__line">
          <span class="ordo-top-list__label">{{ item.label }}</span>
          <strong class="ordo-top-list__value">{{ item.value }}</strong>
        </div>
        <p v-if="item.subtitle" class="ordo-top-list__subtitle">{{ item.subtitle }}</p>
        <div class="ordo-top-list__track" aria-hidden="true">
          <span :style="{ width: `${(item.value / maxValue) * 100}%` }" />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="ordo-empty-inline">
    <span class="ordo-empty-inline__mark">∅</span>
    <span>{{ emptyMessage }}</span>
  </div>
</template>

<style scoped>
.ordo-top-list {
  display: grid;
  gap: 14px;
}

.ordo-top-list__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.ordo-top-list__rank {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #dfe5dc;
  border-radius: 11px;
  background: #f3f6f0;
  color: #899389;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.ordo-top-list__rank--featured {
  border-color: #c9934d;
  background: #f7ead9;
  color: #a36d37;
}

.ordo-top-list__content {
  flex: 1;
  min-width: 0;
}

.ordo-top-list__line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.ordo-top-list__label {
  overflow: hidden;
  color: #334538;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ordo-top-list__value {
  color: #48614f;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 18px;
  font-weight: 600;
}

.ordo-top-list__subtitle {
  margin: 3px 0 6px;
  overflow: hidden;
  color: #8a9489;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ordo-top-list__track {
  height: 5px;
  overflow: hidden;
  border-radius: 99px;
  background: #edf1eb;
}

.ordo-top-list__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #557961, #c9934d);
  transition: width 400ms ease;
}

.ordo-empty-inline {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 16px 0;
  color: #8b958b;
  font-size: 13px;
}

.ordo-empty-inline__mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #edf1eb;
  color: #758176;
  font-weight: 800;
}
</style>
