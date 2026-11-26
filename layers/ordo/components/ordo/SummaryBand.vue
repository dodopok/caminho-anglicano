<script setup lang="ts">
import OrdoIcon, { type OrdoIconName } from './Icon.vue'

// The tab in one sentence, on top: what the period or the queue comes down to,
// with the one or two things to do about it. The tone only tints the band; the
// sentence says the news.
withDefaults(defineProps<{
  title: string
  tone?: 'info' | 'ok' | 'warn' | 'danger'
  icon?: OrdoIconName
  label?: string
}>(), {
  tone: 'info',
  icon: 'activity',
  label: 'Resumo'
})
</script>

<template>
  <section class="op-summary" :class="`op-summary--${tone}`" :aria-label="label">
    <span class="op-summary__mark"><OrdoIcon :name="icon" :size="26" /></span>
    <div class="op-summary__copy">
      <strong>{{ title }}</strong>
      <span v-if="$slots.default"><slot /></span>
    </div>
    <div v-if="$slots.actions" class="op-summary__actions">
      <slot name="actions" />
    </div>
  </section>
</template>
