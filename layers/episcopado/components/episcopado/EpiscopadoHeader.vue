<template>
  <header class="bg-white/95 backdrop-blur border-b border-stone-200 sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
      <NuxtLink to="/episcopado" class="flex items-center gap-2 shrink-0">
        <span class="font-serif text-xl sm:text-2xl font-semibold text-stone-800">Rede do Episcopado</span>
        <span class="text-[10px] uppercase tracking-wider font-semibold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">beta</span>
      </NuxtLink>
      <div v-if="nodes" class="flex-1 max-w-md ml-auto">
        <EpiscopadoSearch :nodes="nodes" shortcut @select="(n) => navigateTo(nodeRoute(n.id))" />
      </div>
      <NuxtLink to="/" class="text-sm text-stone-500 hover:text-stone-800 shrink-0" :class="{ 'ml-auto': !nodes }">← Início</NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { nodeRoute } from '../../lib/style'

defineProps<{ nodes?: GraphNode[] }>()
</script>
