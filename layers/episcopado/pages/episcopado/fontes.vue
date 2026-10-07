<template>
  <div class="episcopado min-h-screen bg-stone-50">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main class="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header>
        <p class="text-xs font-semibold uppercase tracking-wide text-stone-500">Bibliografia</p>
        <h1 class="mt-1 font-serif text-4xl font-semibold text-stone-900 sm:text-5xl">Fontes</h1>
        <p class="mt-3 max-w-2xl text-stone-600">
          Toda afirmação da rede aponta para uma destas fontes, com o trecho literal que a sustenta. Abra uma fonte para ver tudo o que ela sustenta.
        </p>
      </header>

      <div v-if="error" class="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center" role="alert">
        <p class="font-medium text-red-900">Não foi possível carregar a bibliografia.</p>
        <button type="button" class="ep-btn ep-btn-primary mt-4" @click="refresh()">Tentar de novo</button>
      </div>

      <template v-else>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative flex-1">
            <span class="sr-only">Filtrar fontes</span>
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
            <input v-model="query" type="search" placeholder="Filtrar por título, autor ou publicador…" class="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-200">
          </label>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Nível da fonte">
            <button v-for="l in LEVELS" :key="l" type="button" class="chip" :class="{ active: level === l }" :aria-pressed="level === l" @click="level = level === l ? null : l">{{ SOURCE_LEVEL_LABEL[l].replace('Fonte ', '') }}</button>
          </div>
          <select v-model="type" class="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700" aria-label="Tipo da fonte">
            <option :value="null">Todos os tipos</option>
            <option v-for="t in types" :key="t" :value="t">{{ SOURCE_TYPE_LABEL[t] }}</option>
          </select>
        </div>

        <p class="mt-3 text-xs text-stone-500" aria-live="polite">
          {{ filtered.length }} de {{ sources.length }} fontes
          <template v-if="stats.primary"> · {{ stats.primary }} primárias</template>
          <template v-if="stats.unused"> · {{ stats.unused }} ainda sem uso</template>
        </p>

        <p v-if="!filtered.length" class="mt-6 rounded-2xl border border-stone-200 bg-white px-5 py-10 text-center text-stone-600">
          Nenhuma fonte com esses filtros.
          <button type="button" class="ml-1 font-medium text-amber-800 underline" @click="clear">Limpar</button>
        </p>

        <ul v-else class="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          <li v-for="s in filtered" :key="s.id" class="flex gap-4 px-4 py-3 sm:px-5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span class="rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700">{{ SOURCE_TYPE_LABEL[s.type] }}</span>
                <span class="rounded px-1.5 py-0.5 font-medium" :class="LEVEL_CLASS[s.level]">{{ SOURCE_LEVEL_LABEL[s.level].replace('Fonte ', '') }}</span>
                <span v-if="s.published" class="text-stone-500">{{ formatDate(s.published) }}</span>
                <span v-if="s.language" class="text-stone-400 uppercase">{{ s.language }}</span>
              </div>
              <p class="mt-1 font-medium leading-snug text-stone-900">
                <NuxtLink :to="sourceRoute(s.id)" class="hover:text-amber-800 hover:underline decoration-amber-300 underline-offset-2">{{ s.title }}</NuxtLink>
              </p>
              <p v-if="s.author || s.publisher" class="mt-0.5 text-xs text-stone-500">{{ [s.author, s.publisher].filter(Boolean).join(' · ') }}</p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-stone-500">
              <span class="font-medium text-stone-800 tabular-nums">{{ s.claims }} {{ s.claims === 1 ? 'afirmação' : 'afirmações' }}</span>
              <span class="tabular-nums">{{ s.entities }} {{ s.entities === 1 ? 'ficha' : 'fichas' }}</span>
              <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="text-amber-800 hover:underline">abrir ↗<span class="sr-only"> (nova aba)</span></a>
            </div>
          </li>
        </ul>
      </template>
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { SOURCE_LEVEL_LABEL, SOURCE_TYPE_LABEL, formatDate } from '../../lib/labels'
import type { TSource } from '../../lib/schemas'
import { sourceRoute } from '../../lib/style'
import { normalizeName } from '../../lib/text'
import type { SourceListItem } from '../../lib/views'

definePageMeta({ layout: false })

useSeoMeta({
  title: 'Fontes - Rede do Episcopado Histórico',
  description: 'Bibliografia completa da Rede do Episcopado Histórico: documentos, notícias, livros e testemunhos que sustentam cada afirmação.',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const router = useRouter()
const { data: graph } = await useEpiscopadoGraph()
const { data: sources, error, refresh } = await useFetch<SourceListItem[]>('/api/episcopado/fontes', { key: 'episcopado-fontes', default: () => [] })

const LEVELS = ['primary', 'secondary', 'tertiary'] as const
const LEVEL_CLASS = { primary: 'bg-emerald-50 text-emerald-800', secondary: 'bg-sky-50 text-sky-800', tertiary: 'bg-stone-100 text-stone-600' } as const

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const level = ref<TSource['level'] | null>(LEVELS.includes(route.query.nivel as TSource['level']) ? (route.query.nivel as TSource['level']) : null)
const type = ref<TSource['type'] | null>(typeof route.query.tipo === 'string' ? (route.query.tipo as TSource['type']) : null)

const types = computed(() => [...new Set(sources.value.map((s) => s.type))].sort((a, b) => SOURCE_TYPE_LABEL[a].localeCompare(SOURCE_TYPE_LABEL[b], 'pt-BR')))

const filtered = computed(() => {
  const q = normalizeName(query.value)
  return sources.value.filter((s) => {
    if (level.value && s.level !== level.value) return false
    if (type.value && s.type !== type.value) return false
    if (!q) return true
    return normalizeName([s.title, s.author ?? '', s.publisher ?? '', s.id].join(' ')).includes(q)
  })
})

const stats = computed(() => ({
  primary: sources.value.filter((s) => s.level === 'primary').length,
  unused: sources.value.filter((s) => s.claims === 0).length
}))

function clear() {
  query.value = ''
  level.value = null
  type.value = null
}

// Filtros na URL, para compartilhar.
watch([query, level, type], () => {
  router.replace({ query: { ...(query.value ? { q: query.value } : {}), ...(level.value ? { nivel: level.value } : {}), ...(type.value ? { tipo: type.value } : {}) } })
})
</script>

<style scoped>
.chip {
  @apply rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:border-stone-400;
}
.chip.active {
  @apply border-amber-300 bg-amber-50 text-amber-900;
}
</style>
