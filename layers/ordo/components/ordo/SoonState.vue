<script setup lang="ts">
import OrdoIcon from './Icon.vue'

// A place on the screen whose report the API in use does not have yet (it
// answered 404): a short "em breve", never an error. `compact` is the pill
// that stands beside a number or a title.
withDefaults(defineProps<{
  title?: string
  text?: string
  compact?: boolean
}>(), {
  title: 'Em breve',
  text: undefined,
  compact: false
})
</script>

<template>
  <span v-if="compact" class="op-soon" :title="text">{{ title }}</span>
  <div v-else class="op-soon-state" role="note">
    <OrdoIcon name="clock" :size="18" />
    <div>
      <strong>{{ title }}</strong>
      <span v-if="text">{{ text }}</span>
      <slot />
    </div>
  </div>
</template>
