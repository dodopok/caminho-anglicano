<script setup lang="ts">
import type { DashboardStatItem } from '../../composables/useOrdoDashboardPresentation'

defineProps<{
  items: DashboardStatItem[]
  title?: string
}>()
</script>

<template>
  <div class="ordo-stat-list">
    <p v-if="title" class="ordo-stat-list__title">{{ title }}</p>
    <dl>
      <div v-for="item in items" :key="item.key" class="ordo-stat-list__row" :class="{ 'is-attention': item.tone === 'attention' }">
        <dt>
          <span class="ordo-stat-list__label"><i v-if="item.tone === 'attention'" class="ordo-stat-list__flag" aria-label="pede atenção">!</i>{{ item.label }}</span>
          <small v-if="item.hint">{{ item.hint }}</small>
        </dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.ordo-stat-list { min-width: 0; }
.ordo-stat-list__title { margin: 0 0 6px; color: #8b978b; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.ordo-stat-list dl { display: grid; margin: 0; }
.ordo-stat-list__row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; padding: 8px 0; border-top: 1px solid #e8eee6; }
.ordo-stat-list__row:first-child { border-top: 0; }
.ordo-stat-list dt { min-width: 0; }
.ordo-stat-list__label { display: inline-flex; align-items: center; gap: 6px; color: #4d5e50; font-size: 12px; font-weight: 600; }
.ordo-stat-list dt small { display: block; margin-top: 2px; overflow: hidden; color: #97a297; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.ordo-stat-list dd { flex: 0 0 auto; margin: 0; color: #233328; font-size: 15px; font-variant-numeric: tabular-nums; font-weight: 700; text-align: right; }
.ordo-stat-list__flag { display: inline-grid; width: 15px; height: 15px; place-items: center; border-radius: 50%; background: #f6e2d3; color: #a5552f; font-size: 10px; font-style: normal; font-weight: 800; }
.ordo-stat-list__row.is-attention .ordo-stat-list__label { color: #8f4f31; }
.ordo-stat-list__row.is-attention dd { color: #a5552f; }
</style>
