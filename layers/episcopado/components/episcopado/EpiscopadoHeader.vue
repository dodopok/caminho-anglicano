<template>
  <header class="z-30 border-b border-ep-line bg-ep-card" :class="sticky ? 'sticky top-0' : 'relative'">
    <div class="flex h-14 items-center gap-3 px-4 min-[700px]:gap-5 min-[700px]:px-5">
      <!-- Marca: no explorador, recomeça; nas outras páginas, leva ao explorador. -->
      <button v-if="explorer" type="button" class="flex h-14 shrink-0 items-center gap-2.5 text-left" title="Voltar ao início da rede" aria-label="Rede do Episcopado, recomeçar" @click="emit('home')">
        <EpiscopadoBrand />
      </button>
      <NuxtLink v-else to="/episcopado" class="flex h-14 shrink-0 items-center gap-2.5" aria-label="Rede do Episcopado, início">
        <EpiscopadoBrand />
      </NuxtLink>

      <nav aria-label="Seções da rede" class="ml-auto flex h-14 gap-3.5 min-[700px]:ml-0 min-[700px]:gap-[18px]">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="flex items-center border-b-2 px-0.5 text-sm"
          :class="isActive(item.to) ? 'border-ep-ink font-medium text-ep-ink' : 'border-transparent text-ep-body hover:text-ep-ink'"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >{{ item.label }}</NuxtLink>
      </nav>

      <div v-if="nodes" class="relative mx-auto hidden max-w-[520px] flex-1 min-[700px]:block">
        <EpiscopadoSearch :nodes="nodes" shortcut :hints="explorer" :placeholder="placeholder" @select="onSelect" @open="onOpen" />
      </div>
      <span v-else class="hidden flex-1 min-[700px]:block" />

      <NuxtLink to="/" class="hidden shrink-0 whitespace-nowrap text-[13px] text-ep-body hover:text-ep-ink min-[700px]:inline">← Início do site</NuxtLink>
    </div>

    <!-- Celular: a busca ganha uma linha própria. -->
    <div v-if="nodes" class="h-11 border-t border-ep-line px-3 py-1 min-[700px]:hidden">
      <EpiscopadoSearch :nodes="nodes" :placeholder="placeholder" @select="onSelect" @open="onOpen" />
    </div>
  </header>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { nodeRoute } from '../../lib/style'

/**
 * Cabeçalho da layer. No explorador (`explorer`), a busca seleciona na rede
 * (Enter) ou abre a ficha (Shift+Enter) e a marca recomeça a exploração;
 * nas outras páginas, a busca leva à ficha.
 */
const props = withDefaults(defineProps<{ nodes?: GraphNode[]; explorer?: boolean; sticky?: boolean }>(), { nodes: undefined, explorer: false, sticky: true })
const emit = defineEmits<{ select: [node: GraphNode]; open: [node: GraphNode]; home: [] }>()

const NAV = [
  { to: '/episcopado', label: 'Explorar' },
  { to: '/episcopado/fontes', label: 'Fontes' }
]

const placeholder = 'Busque um clérigo ou jurisdição (ex.: Uchôa, IEAB)…'
const route = useRoute()

/** "Explorar" vale para o explorador e as fichas; "Fontes" para a bibliografia e as fichas de fonte. */
function isActive(to: string) {
  const fontes = route.path.startsWith('/episcopado/fonte')
  return to === '/episcopado/fontes' ? fontes : !fontes
}

function onSelect(n: GraphNode) {
  if (props.explorer) emit('select', n)
  else navigateTo(nodeRoute(n.id))
}
function onOpen(n: GraphNode) {
  if (props.explorer) emit('open', n)
  else navigateTo(nodeRoute(n.id))
}
</script>
