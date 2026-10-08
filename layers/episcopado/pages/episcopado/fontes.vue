<template>
  <div class="episcopado flex min-h-screen flex-col bg-ep-paper">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 min-[700px]:py-8">
      <div class="overflow-hidden rounded-ep border border-ep-line bg-ep-card">
        <header class="flex flex-wrap items-end gap-3.5 border-b border-ep-line-2 px-5 pb-4 pt-6 min-[700px]:px-[26px]">
          <div class="min-w-[240px] flex-1">
            <p class="ep-eyebrow">Bibliografia</p>
            <h1 class="mt-1 font-ep-serif text-4xl font-semibold text-ep-ink">Fontes</h1>
            <p class="mt-1.5 max-w-[560px] text-sm text-ep-body">
              Toda afirmação da rede aponta para uma destas fontes, com o trecho literal que a sustenta. Abra uma fonte para ver tudo o que ela sustenta.
            </p>
          </div>
        </header>

        <div v-if="error" class="px-5 py-8 text-center" role="alert">
          <p class="font-medium text-ep-red">Não foi possível carregar a bibliografia.</p>
          <button type="button" class="ep-btn ep-btn-primary mt-4" @click="refresh()">Tentar de novo</button>
        </div>

        <template v-else>
          <div class="flex flex-col gap-2.5 border-b border-ep-line-2 px-5 py-3.5 min-[700px]:flex-row min-[700px]:items-center min-[700px]:px-[26px]">
            <label class="flex h-9 flex-1 items-center gap-2.5 rounded-ep border border-ep-rule bg-ep-paper px-3 transition-colors hover:border-ep-faint focus-within:!border-ep-ink focus-within:bg-ep-card">
              <span class="sr-only">Filtrar fontes</span>
              <svg class="h-4 w-4 flex-none text-ep-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
              <input v-model="query" type="search" placeholder="Filtrar por título, autor ou publicador…" class="w-full min-w-0 bg-transparent text-sm text-ep-ink outline-none placeholder:text-ep-faint">
            </label>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Nível da fonte">
              <button type="button" class="chip" :class="{ active: level === null }" :aria-pressed="level === null" @click="level = null">Todas</button>
              <button v-for="l in LEVELS" :key="l" type="button" class="chip" :class="{ active: level === l }" :aria-pressed="level === l" @click="level = level === l ? null : l">{{ LEVEL_PLURAL[l] }}</button>
            </div>
            <select v-model="type" class="h-9 rounded-ep border border-ep-rule bg-ep-card px-2.5 text-[13px] text-ep-ink-3" aria-label="Tipo da fonte">
              <option :value="null">Todos os tipos</option>
              <option v-for="t in types" :key="t" :value="t">{{ SOURCE_TYPE_LABEL[t] }}</option>
            </select>
          </div>

          <p class="border-b border-ep-line-2 px-5 py-2 text-xs text-ep-muted min-[700px]:px-[26px]" aria-live="polite">
            {{ filtered.length }} de {{ sources.length }} fontes
            <template v-if="stats.primary"> · {{ stats.primary }} primárias</template>
            <template v-if="stats.unused"> · {{ stats.unused }} ainda sem uso</template>
          </p>

          <p v-if="!filtered.length" class="px-5 py-10 text-center text-ep-body">
            Nenhuma fonte com esses filtros.
            <button type="button" class="ml-1 font-medium text-ep-garnet-ink underline underline-offset-[3px]" @click="clear">Limpar</button>
          </p>

          <ul v-else>
            <li v-for="s in filtered" :key="s.id" class="flex gap-4 border-b border-ep-line-2 px-5 py-3.5 last:border-b-0 min-[700px]:px-[26px]">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span class="rounded-ep bg-ep-line-2 px-1.5 py-0.5 font-medium text-ep-ink-3">{{ SOURCE_TYPE_LABEL[s.type] }}</span>
                  <span class="rounded-ep px-1.5 py-0.5 font-medium" :class="LEVEL_CLASS[s.level]">{{ SOURCE_LEVEL_LABEL[s.level].replace('Fonte ', '') }}</span>
                  <span v-if="s.published" class="text-ep-muted">{{ formatDate(s.published) }}</span>
                  <span v-if="s.language" class="font-ep-mono uppercase text-ep-faint">{{ s.language }}</span>
                </div>
                <p class="mt-1.5 text-[15px] font-medium leading-snug text-ep-ink">
                  <NuxtLink :to="sourceRoute(s.id)" class="decoration-ep-garnet-line underline-offset-2 hover:text-ep-garnet-ink hover:underline">{{ s.title }}</NuxtLink>
                </p>
                <p v-if="s.author || s.publisher" class="mt-0.5 text-xs text-ep-muted">{{ [s.author, s.publisher].filter(Boolean).join(' · ') }}</p>
              </div>
              <div class="flex flex-none flex-col items-end gap-0.5 text-right text-xs text-ep-muted">
                <span class="font-medium tabular-nums text-ep-ink">{{ s.claims }} {{ s.claims === 1 ? 'afirmação' : 'afirmações' }}</span>
                <span class="tabular-nums">{{ s.entities }} {{ s.entities === 1 ? 'ficha' : 'fichas' }}</span>
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener" class="text-ep-garnet-ink hover:underline">abrir ↗<span class="sr-only"> (nova aba)</span></a>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { SOURCE_LEVEL_LABEL, SOURCE_TYPE_LABEL, formatDate } from '../../lib/labels'
import type { TSource } from '../../lib/schemas'
import { LEVEL_CLASS, sourceRoute } from '../../lib/style'
import { normalizeName } from '../../lib/text'
import type { SourceListItem } from '../../lib/views'

definePageMeta({ layout: false })
useEpiscopadoFonts()

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
const LEVEL_PLURAL = { primary: 'Primárias', secondary: 'Secundárias', tertiary: 'Terciárias' } as const

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
  @apply rounded-ep border border-ep-line bg-ep-card px-3 py-1.5 text-xs text-ep-body hover:border-ep-faint;
}
.chip.active {
  @apply border-ep-garnet-mid bg-ep-garnet-soft text-ep-garnet-ink;
}
</style>
