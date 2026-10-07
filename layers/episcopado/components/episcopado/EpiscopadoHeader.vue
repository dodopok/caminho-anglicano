<template>
  <header class="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4">
      <NuxtLink to="/episcopado" class="flex shrink-0 items-center gap-2" aria-label="Rede do Episcopado, início">
        <span class="font-serif text-xl font-semibold text-stone-800 sm:text-2xl">Rede do Episcopado</span>
        <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">beta</span>
      </NuxtLink>

      <nav aria-label="Seções da rede" class="hidden items-center gap-1 text-sm md:flex">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-2.5 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          active-class="bg-stone-100 text-stone-900 font-medium"
        >{{ item.label }}</NuxtLink>
      </nav>

      <!-- No celular a busca vive no menu: espremida ao lado do título ela fica ilegível. -->
      <div v-if="nodes" class="ml-auto hidden min-w-0 flex-1 sm:block md:max-w-md">
        <EpiscopadoSearch :nodes="nodes" shortcut @select="(n) => navigateTo(nodeRoute(n.id))" />
      </div>

      <NuxtLink to="/" class="hidden shrink-0 text-sm text-stone-500 hover:text-stone-800 sm:inline" :class="{ 'ml-auto': !nodes }">← Início</NuxtLink>

      <button
        type="button"
        class="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 sm:ml-1 md:hidden"
        :class="{ 'sm:ml-auto': !nodes }"
        :aria-expanded="menuOpen"
        aria-controls="episcopado-menu"
        aria-label="Abrir menu"
        @click="menuOpen = !menuOpen"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path v-if="!menuOpen" fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          <path v-else fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <nav v-show="menuOpen" id="episcopado-menu" aria-label="Seções da rede (menu)" class="border-t border-stone-100 bg-white px-4 py-2 md:hidden">
      <div v-if="nodes" class="py-2 sm:hidden">
        <EpiscopadoSearch :nodes="nodes" @select="(n) => { menuOpen = false; navigateTo(nodeRoute(n.id)) }" />
      </div>
      <NuxtLink
        v-for="item in [...NAV, { to: '/', label: '← Início do site' }]"
        :key="item.to"
        :to="item.to"
        class="block rounded-md px-2.5 py-2 text-sm text-stone-700 hover:bg-stone-100"
        active-class="bg-stone-100 font-medium"
        @click="menuOpen = false"
      >{{ item.label }}</NuxtLink>
    </nav>
  </header>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { nodeRoute } from '../../lib/style'

defineProps<{ nodes?: GraphNode[] }>()

const NAV = [
  { to: '/episcopado', label: 'Explorar' },
  { to: '/episcopado/fontes', label: 'Fontes' }
]

const menuOpen = ref(false)
</script>
