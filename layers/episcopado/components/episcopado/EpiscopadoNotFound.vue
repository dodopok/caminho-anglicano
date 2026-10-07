<template>
  <main class="mx-auto max-w-2xl px-4 py-16 text-center">
    <p class="text-xs font-semibold uppercase tracking-wide text-stone-500">{{ kind }}</p>
    <h1 class="mt-2 font-serif text-4xl font-semibold text-stone-900">Não encontramos “{{ id }}”</h1>
    <p class="mt-3 text-stone-600">
      Pode ser um link antigo ou um registro que ainda não entrou na base. Tente buscar pelo nome:
    </p>
    <div class="mx-auto mt-6 max-w-md text-left">
      <EpiscopadoSearch v-if="nodes" :nodes="nodes" size="lg" placeholder="Buscar pelo nome…" @select="(n) => navigateTo(nodeRoute(n.id))" />
    </div>
    <div v-if="suggestions.length" class="mt-6 text-left">
      <p class="text-sm font-medium text-stone-700">Talvez você procure:</p>
      <ul class="mt-2 space-y-1">
        <li v-for="s in suggestions" :key="s.id">
          <NuxtLink :to="nodeRoute(s.id)" class="ep-link">{{ s.label }}</NuxtLink>
        </li>
      </ul>
    </div>
    <div class="mt-8 flex flex-wrap justify-center gap-2">
      <NuxtLink to="/episcopado" class="ep-btn ep-btn-primary">Ir ao explorador</NuxtLink>
      <NuxtLink to="/episcopado/fontes" class="ep-btn ep-btn-secondary">Ver as fontes</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { searchNodes } from '../../lib/search'
import { nodeRoute } from '../../lib/style'

/** Estado "não encontrado" das fichas, com busca e sugestões parecidas com o id pedido. */
const props = defineProps<{ id: string; kind: string; nodes?: GraphNode[]; only?: 'person' | 'jurisdiction' }>()

const suggestions = computed(() => {
  if (!props.nodes) return []
  const query = props.id.replace(/-/g, ' ')
  return searchNodes(props.nodes.filter((n) => !props.only || n.kind === props.only), query, 5).map((r) => r.node)
})
</script>
