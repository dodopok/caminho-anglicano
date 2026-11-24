<script setup lang="ts">
import OrdoScopeTag from './ScopeTag.vue'
import type { DashboardScope } from '../../types/dashboard'

// A titled card. `icon` and `iconColor` are accepted for older callers and no
// longer drawn: the eyebrow and the title say what the card is about.
interface Props {
  title: string
  description?: string
  eyebrow?: string
  scope?: DashboardScope | null
  scopeLabel?: string
  icon?: string
  iconColor?: string
  headingLevel?: 'h2' | 'h3'
  /** The card's section is still loading: the title stays, the body is a skeleton. */
  loading?: boolean
  skeletonHeight?: number
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  eyebrow: undefined,
  scope: undefined,
  scopeLabel: undefined,
  icon: undefined,
  iconColor: undefined,
  headingLevel: 'h3',
  loading: false,
  skeletonHeight: 180
})
</script>

<template>
  <section class="op-card op-panel" :aria-busy="loading || undefined">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p v-if="eyebrow" class="op-eyebrow">{{ eyebrow }}</p>
        <component :is="headingLevel">{{ title }}</component>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="scope || $slots.actions" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <OrdoScopeTag v-if="scope" :scope="scope" :label="scopeLabel" />
        <slot v-if="!loading" name="actions" />
      </div>
    </div>
    <div v-if="loading" class="op-panel__skeleton" aria-hidden="true">
      <span class="op-skeleton" :style="{ height: `${skeletonHeight}px` }" />
    </div>
    <slot v-else />
    <div v-if="$slots.footer && !loading" class="op-panel__foot">
      <slot name="footer" />
    </div>
  </section>
</template>
