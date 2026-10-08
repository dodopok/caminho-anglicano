<template>
  <nav aria-label="Trilha de navegação na rede" class="flex min-w-0 flex-1 items-center gap-2.5">
    <button type="button" class="ep-btn ep-btn-secondary ep-btn-sm" :disabled="!canGoBack" aria-label="Voltar ao nó anterior" @click="emit('back')">← Voltar</button>
    <span class="h-[18px] w-px flex-none bg-ep-rule" aria-hidden="true" />

    <div class="flex h-[30px] min-w-0 flex-1 items-center gap-1 overflow-x-auto" :class="{ 'max-[699px]:hidden': compact }">
      <ol v-if="items.length" class="flex items-center gap-1" :aria-label="`${items.length} nós visitados`">
        <li v-for="(item, i) in items" :key="item.id" class="flex shrink-0 items-center gap-1">
          <span v-if="i > 0" class="text-ep-rule" aria-hidden="true">›</span>
          <button
            type="button"
            class="flex max-w-[11rem] items-center gap-1.5 border-b px-1.5 py-1 text-xs"
            :class="item.id === current ? 'border-ep-ink font-medium text-ep-ink' : 'border-transparent text-ep-body hover:text-ep-ink'"
            :aria-current="item.id === current ? 'true' : undefined"
            :title="item.label"
            @click="emit('select', item.id)"
          >
            <span class="h-[7px] w-[7px] flex-none rounded-full" :style="{ background: item.color }" aria-hidden="true" />
            <span class="truncate">{{ item.label }}</span>
          </button>
        </li>
      </ol>
      <p v-else class="whitespace-nowrap px-2 text-xs text-ep-faint">Os nós que você visitar aparecem aqui.</p>
      <button v-if="items.length > 1" type="button" class="ml-1 shrink-0 text-[11px] text-ep-faint underline-offset-2 hover:text-ep-ink hover:underline" @click="emit('clear')">limpar</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { nodeColor } from '../../lib/style'

/** Trilha dos nós visitados nesta sessão, com botão de voltar (usa o histórico do navegador). */
const props = defineProps<{ trail: string[]; current: string | null; nodesById: Map<string, GraphNode>; canGoBack: boolean; /** No celular, esconde a lista (sobra espaço para os outros controles). */ compact?: boolean }>()
const emit = defineEmits<{ select: [id: string]; back: []; clear: [] }>()

const items = computed(() =>
  props.trail
    .map((id) => props.nodesById.get(id))
    .filter((n): n is GraphNode => !!n)
    .slice(-7)
    .map((n) => ({ id: n.id, label: n.label, color: nodeColor(n) }))
)
</script>
