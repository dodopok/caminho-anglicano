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
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  eyebrow: undefined,
  scope: undefined,
  scopeLabel: undefined,
  icon: undefined,
  iconColor: undefined,
  headingLevel: 'h3'
})
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p v-if="eyebrow" class="op-eyebrow">{{ eyebrow }}</p>
        <component :is="headingLevel">{{ title }}</component>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="scope || $slots.actions" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <OrdoScopeTag v-if="scope" :scope="scope" :label="scopeLabel" />
        <slot name="actions" />
      </div>
    </div>
    <slot />
    <div v-if="$slots.footer" class="op-panel__foot">
      <slot name="footer" />
    </div>
  </section>
</template>
