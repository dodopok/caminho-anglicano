<script setup lang="ts">
import type { DashboardStatItem } from '../../composables/useOrdoDashboardPresentation'

defineProps<{
  items: DashboardStatItem[]
  title?: string
}>()
</script>

<template>
  <div class="op-statlist">
    <p v-if="title" class="op-statlist__title">{{ title }}</p>
    <dl style="margin: 0">
      <div v-for="item in items" :key="item.key" class="op-statlist__row" :class="{ 'is-attention': item.tone === 'attention' }">
        <dt>
          <span><i v-if="item.tone === 'attention'" class="op-flag" aria-label="pede atenção">!</i>{{ item.label }}</span>
          <small v-if="item.hint">{{ item.hint }}</small>
        </dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </div>
</template>
