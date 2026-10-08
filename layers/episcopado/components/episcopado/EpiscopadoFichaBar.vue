<template>
  <div class="sticky z-20 flex items-center gap-2 border-b border-ep-line bg-ep-card px-4 py-3" :class="sheet ? 'top-0' : 'top-[100px] min-[700px]:top-14'">
    <button v-if="sheet" type="button" class="ep-btn ep-btn-secondary ep-btn-sm flex-none" @click="emit('back')">← Voltar à rede</button>
    <NuxtLink v-else :to="graphLink" class="ep-btn ep-btn-secondary ep-btn-sm flex-none">← Ver na rede</NuxtLink>
    <span class="hidden flex-none whitespace-nowrap text-xs text-ep-faint min-[500px]:inline">{{ kind }}</span>
    <EpiscopadoToc class="ml-auto" :items="toc" />
    <button v-if="sheet" type="button" class="ep-icon-btn" aria-label="Fechar ficha (Esc)" title="Fechar (Esc)" @click="emit('close')">×</button>
  </div>
</template>

<script setup lang="ts">
import type { TocItem } from './EpiscopadoToc.vue'

/**
 * Barra fixa da ficha: volta à rede, diz o tipo da ficha e leva às seções.
 * Na folha sobre o grafo (`sheet`) também fecha; na página, leva ao explorador com o nó selecionado.
 */
defineProps<{ kind: string; toc: TocItem[]; sheet?: boolean; graphLink: string }>()
const emit = defineEmits<{ back: []; close: [] }>()
</script>
