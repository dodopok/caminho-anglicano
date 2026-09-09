<script setup lang="ts">
defineProps<{
  items: Array<{ label: string, to?: string }>
}>()
</script>

<template>
  <nav aria-label="Você está em">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-400">
      <template v-for="(item, index) in items" :key="item.label">
        <li v-if="index > 0" aria-hidden="true" class="text-slate-300">/</li>
        <li>
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            class="font-medium text-slate-500 hover:text-amber-700 transition-colors"
          >
            {{ item.label }}
          </NuxtLink>
          <span v-else class="font-semibold text-slate-700" aria-current="page">{{ item.label }}</span>
        </li>
      </template>
    </ol>
  </nav>
</template>
