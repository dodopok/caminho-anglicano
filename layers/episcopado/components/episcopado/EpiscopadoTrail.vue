<template>
  <nav aria-label="Trilha de navegação na rede" class="flex min-w-0 items-center gap-2 text-sm">
    <button
      type="button"
      class="inline-flex shrink-0 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-stone-700 hover:border-stone-400 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="!canGoBack"
      aria-label="Voltar ao nó anterior"
      @click="emit('back')"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
      Voltar
    </button>

    <ol v-if="items.length" class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5" :aria-label="`${items.length} nós visitados`">
      <li v-for="(item, i) in items" :key="item.id" class="flex shrink-0 items-center gap-1">
        <span v-if="i > 0" class="text-stone-300" aria-hidden="true">›</span>
        <button
          type="button"
          class="max-w-[11rem] truncate rounded-md px-2 py-1 text-left"
          :class="item.id === current ? 'bg-amber-100 font-medium text-amber-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'"
          :aria-current="item.id === current ? 'true' : undefined"
          :title="item.label"
          @click="emit('select', item.id)"
        >
          <span class="mr-1 inline-block h-2 w-2 rounded-full align-middle" :style="{ background: item.color }" aria-hidden="true" />{{ item.label }}
        </button>
      </li>
    </ol>
    <p v-else class="truncate text-stone-400">Os nós que você visitar aparecem aqui.</p>

    <button v-if="items.length > 1" type="button" class="shrink-0 text-xs text-stone-400 hover:text-stone-700 hover:underline" @click="emit('clear')">limpar</button>
  </nav>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { nodeColor } from '../../lib/style'

/** Trilha dos nós visitados nesta sessão, com botão de voltar (usa o histórico do navegador). */
const props = defineProps<{ trail: string[]; current: string | null; nodesById: Map<string, GraphNode>; canGoBack: boolean }>()
const emit = defineEmits<{ select: [id: string]; back: []; clear: [] }>()

const items = computed(() =>
  props.trail
    .map((id) => props.nodesById.get(id))
    .filter((n): n is GraphNode => !!n)
    .slice(-7)
    .map((n) => ({ id: n.id, label: n.label, color: nodeColor(n) }))
)
</script>
