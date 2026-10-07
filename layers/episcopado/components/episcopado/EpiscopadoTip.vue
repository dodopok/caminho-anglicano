<template>
  <span class="relative inline-flex group" tabindex="0" :aria-describedby="id">
    <slot />
    <span
      :id="id"
      role="tooltip"
      class="pointer-events-none absolute z-40 hidden w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-lg bg-stone-900 px-3 py-2 text-xs font-normal leading-snug text-stone-50 shadow-lg group-hover:block group-focus-within:block"
      :class="placement === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5' : 'top-full left-1/2 -translate-x-1/2 mt-1.5'"
    >
      <span v-if="title" class="block font-semibold mb-0.5">{{ title }}</span>
      {{ text }}
    </span>
  </span>
</template>

<script setup lang="ts">
/** Tooltip acessível por mouse, toque (foco) e teclado; só CSS, sem JS. */
withDefaults(defineProps<{ text: string; title?: string; placement?: 'top' | 'bottom' }>(), { title: '', placement: 'top' })

const id = `dica-${useId()}`
</script>
