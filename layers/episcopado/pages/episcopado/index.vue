<template>
  <div class="episcopado min-h-screen bg-stone-50">
    <EpiscopadoHeader />

    <section class="border-b border-stone-200 bg-gradient-to-b from-amber-50 to-stone-50">
      <div class="mx-auto max-w-4xl px-4 pb-5 pt-6 text-center sm:pb-8 sm:pt-10">
        <h1 class="font-serif text-3xl font-semibold text-stone-900 sm:text-5xl">Rede do Episcopado Histórico</h1>
        <p class="mx-auto mt-2 max-w-2xl text-sm text-stone-600 sm:mt-3 sm:text-base">
          Quem ordenou quem, de onde vieram as jurisdições anglicanas no Brasil e como cada linha se liga à sucessão
          histórica — com fonte para cada afirmação.
        </p>
        <div class="mx-auto mt-5 max-w-2xl text-left sm:mt-6">
          <EpiscopadoSearch
            :nodes="graph.nodes"
            size="lg"
            shortcut
            placeholder="Busque um clérigo ou jurisdição (ex.: Uchôa, IEAB)…"
            @select="(n) => select(n.id)"
            @open="(n) => navigateTo(nodeRoute(n.id))"
          />
          <p class="mt-1.5 hidden text-right text-[11px] text-stone-400 sm:block"><kbd class="rounded border border-stone-200 px-1">Enter</kbd> seleciona na rede · <kbd class="rounded border border-stone-200 px-1">Shift+Enter</kbd> abre a ficha</p>
        </div>
        <p class="mt-2 text-xs text-stone-500">
          {{ stats.people }} pessoas · {{ stats.jurisdictions }} jurisdições · {{ graph.edges.length }} ligações · {{ stats.sources }} fontes — base em construção
        </p>
      </div>
    </section>

    <main class="mx-auto max-w-6xl px-4 py-5">
      <!-- Erro ao carregar -->
      <div v-if="graphError" class="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center" role="alert">
        <p class="font-medium text-red-900">Não foi possível carregar a rede.</p>
        <p class="mt-1 text-sm text-red-800">{{ graphError.message }}</p>
        <button type="button" class="ep-btn ep-btn-primary mt-4" @click="refreshGraph()">Tentar de novo</button>
      </div>
      <div v-else-if="!graph.nodes.length" class="rounded-2xl border border-stone-200 bg-white px-5 py-10 text-center text-stone-600">
        A base ainda está vazia. Volte em breve.
      </div>

      <template v-else>
        <!-- Filtros -->
        <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <div class="inline-flex rounded-lg border border-stone-200 bg-white p-0.5" role="group" aria-label="Abrangência da rede">
            <button type="button" class="scope-btn" :class="{ active: filters.scope === 'brazil' }" :aria-pressed="filters.scope === 'brazil'" @click="filters.scope = 'brazil'">Brasil</button>
            <button type="button" class="scope-btn" :class="{ active: filters.scope === 'all' }" :aria-pressed="filters.scope === 'all'" @click="filters.scope = 'all'">Rede inteira</button>
          </div>

          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtros">
            <button type="button" class="chip" :class="{ active: filters.showPeople }" :aria-pressed="filters.showPeople" @click="filters.showPeople = !filters.showPeople">Pessoas</button>
            <button type="button" class="chip" :class="{ active: filters.showJurisdictions }" :aria-pressed="filters.showJurisdictions" @click="filters.showJurisdictions = !filters.showJurisdictions">Jurisdições</button>
            <span class="mx-0.5 self-center text-stone-300" aria-hidden="true">|</span>
            <button type="button" class="chip" :class="{ active: filters.groups.ordinations }" :aria-pressed="filters.groups.ordinations" @click="filters.groups.ordinations = !filters.groups.ordinations">Ordenações</button>
            <button type="button" class="chip" :class="{ active: filters.groups.affiliations }" :aria-pressed="filters.groups.affiliations" @click="filters.groups.affiliations = !filters.groups.affiliations">Vínculos</button>
            <button type="button" class="chip" :class="{ active: filters.groups.relations }" :aria-pressed="filters.groups.relations" @click="filters.groups.relations = !filters.groups.relations">Cismas e filiações</button>
          </div>

          <label class="ml-auto inline-flex items-center gap-2 text-stone-600">
            <span class="whitespace-nowrap">Até</span>
            <input v-model.number="yearInput" type="range" :min="yearRange.min" :max="yearRange.max" class="w-28 accent-amber-700 sm:w-36" aria-label="Mostrar a rede até o ano">
            <span class="w-10 tabular-nums text-stone-800">{{ year ?? 'hoje' }}</span>
          </label>
        </div>

        <!-- Trilha -->
        <div class="mb-3">
          <EpiscopadoTrail :trail="trail" :current="selected" :nodes-by-id="nodesById" :can-go-back="canGoBack" @select="select" @back="goBack" @clear="trail.splice(0)" />
        </div>

        <!-- Grafo + painel -->
        <div :class="fullscreen ? 'fixed inset-0 z-40 flex flex-col bg-stone-50' : ''">
          <div v-if="fullscreen" class="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2">
            <p class="font-serif text-lg font-semibold text-stone-800">Rede do Episcopado</p>
            <div class="ml-auto hidden w-72 sm:block">
              <EpiscopadoSearch :nodes="graph.nodes" placeholder="Buscar…" @select="(n) => select(n.id)" @open="(n) => navigateTo(nodeRoute(n.id))" />
            </div>
            <button type="button" class="ep-btn ep-btn-secondary" @click="fullscreen = false">Sair da tela cheia</button>
          </div>

          <div class="relative grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" :class="fullscreen ? 'min-h-0 flex-1 p-3' : ''">
            <div ref="graphWrap" class="relative overflow-hidden rounded-2xl border border-stone-200 bg-white scroll-mt-16" :class="fullscreen ? 'h-full' : 'h-[60vh] min-h-[420px]'">
              <ClientOnly>
                <EpiscopadoGraph
                  ref="graphRef"
                  :graph="graph"
                  :selected="selected"
                  :depth="selected ? depth : 0"
                  :year="year"
                  :groups="filters.groups"
                  :show-people="filters.showPeople"
                  :show-jurisdictions="filters.showJurisdictions"
                  :scope="filters.scope"
                  @select="select"
                  @open="(id) => navigateTo(nodeRoute(id))"
                  @reset-filters="resetFilters"
                />
                <template #fallback>
                  <div class="flex h-full items-center justify-center text-sm text-stone-500">Carregando o explorador…</div>
                </template>
              </ClientOnly>
              <button
                type="button"
                class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white/95 text-stone-600 shadow-sm hover:text-stone-900"
                :aria-label="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
                :title="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
                @click="fullscreen = !fullscreen"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path v-if="!fullscreen" d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" stroke-linecap="round" stroke-linejoin="round" />
                  <path v-else d="M8 3v5H3M12 3v5h5M17 12h-5v5M3 12h5v5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <p v-if="selected && !selectedNode" class="absolute inset-x-3 top-14 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 ring-1 ring-amber-200">
                O nó “{{ selected }}” não existe na rede. <button type="button" class="font-medium underline" @click="select(null)">Limpar seleção</button>
              </p>
            </div>

            <!-- Painel do nó selecionado -->
            <aside
              v-if="selectedNode"
              class="z-40 flex max-h-[58vh] flex-col overflow-hidden border-stone-200 bg-white shadow-2xl lg:static lg:z-auto lg:rounded-2xl lg:border lg:shadow-none"
              :class="fullscreen ? 'fixed inset-x-0 bottom-0 rounded-t-2xl border-t lg:h-full lg:max-h-none' : 'fixed inset-x-0 bottom-0 rounded-t-2xl border-t lg:max-h-[60vh] lg:min-h-[420px]'"
              aria-label="Mini-ficha do nó selecionado"
            >
              <EpiscopadoNodePanel
                :node="selectedNode"
                :graph="graph"
                :nodes-by-id="nodesById"
                :depth="depth"
                @update:depth="(d) => (depth = d)"
                @select="select"
                @close="select(null)"
              />
            </aside>
            <aside v-else class="hidden rounded-2xl border border-stone-200 bg-white p-5 text-sm lg:block" :class="fullscreen ? 'h-full overflow-auto' : 'max-h-[60vh] overflow-auto'">
              <h2 class="font-serif text-xl font-semibold text-stone-900">Como explorar</h2>
              <ul class="mt-3 space-y-2 text-stone-600">
                <li class="flex gap-2"><span class="text-amber-700">1.</span> Busque um nome ou sigla, ou clique num ponto da rede.</li>
                <li class="flex gap-2"><span class="text-amber-700">2.</span> Passe o mouse para destacar as ligações diretas; duplo clique abre a ficha.</li>
                <li class="flex gap-2"><span class="text-amber-700">3.</span> Com um nó selecionado, “Vizinhança” mostra só quem está a 1–3 passos.</li>
                <li class="flex gap-2"><span class="text-amber-700">4.</span> Arraste o controle de ano para ver a rede em outra época.</li>
                <li class="flex gap-2"><span class="text-amber-700">5.</span> Voltar e avançar do navegador percorrem os nós que você visitou.</li>
              </ul>
              <p class="mt-4 text-xs text-stone-500">A vista inicial mostra o núcleo brasileiro. Troque para “Rede inteira” para ver a sucessão histórica fora do país.</p>
              <h3 class="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-500">Comece por aqui</h3>
              <ul class="mt-2 flex flex-wrap gap-1.5">
                <li v-for="s in starters" :key="s.id">
                  <button type="button" class="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-700 hover:border-amber-400 hover:text-amber-900" @click="select(s.id)">{{ s.label }}</button>
                </li>
              </ul>
            </aside>
          </div>
        </div>

        <div class="mt-3">
          <EpiscopadoLegend />
        </div>
      </template>

      <!-- Diretório de jurisdições brasileiras (também é a navegação principal no celular) -->
      <section v-if="brazilian.length" class="mt-10" aria-labelledby="jurisdicoes-br">
        <h2 id="jurisdicoes-br" class="mb-3 font-serif text-2xl font-semibold text-stone-900">Jurisdições no Brasil</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="j in brazilian"
            :key="j.id"
            :to="nodeRoute(j.id)"
            class="group block rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:border-amber-400 hover:shadow-sm"
          >
            <p class="flex items-center gap-2 font-medium text-stone-900">
              <span class="h-2.5 w-2.5 rounded-full" :style="{ background: nodeColor(j) }" aria-hidden="true" />
              {{ j.label }}
            </p>
            <p class="min-w-0 truncate text-xs text-stone-500">{{ j.search[0] !== j.label ? j.search[0] : (j.jurisdictionType ? JURISDICTION_TYPE_LABEL[j.jurisdictionType] : '') }}</p>
          </NuxtLink>
        </div>
      </section>
    </main>

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { JURISDICTION_TYPE_LABEL } from '../../lib/labels'
import { nodeColor, nodeRoute } from '../../lib/style'
import { DEFAULT_FILTERS } from '../../composables/useEpiscopadoExplorer'

definePageMeta({ layout: false })

useSeoMeta({
  title: 'Rede do Episcopado Histórico (beta) - Caminho Anglicano',
  description: 'Genealogia de clérigos e jurisdições anglicanas no Brasil: ordenações, sagrações, cismas e linhas de sucessão, com fontes.',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const router = useRouter()
const { data: graph, error: graphError, refresh: refreshGraph } = await useEpiscopadoGraph()
const { data: sources } = await useFetch<{ id: string }[]>('/api/episcopado/fontes', { key: 'episcopado-fontes', default: () => [] })
const { filters, trail, visit } = useEpiscopadoExplorer()

const graphRef = ref<{ fit: (animate?: boolean) => void; resize: () => void } | null>(null)
const graphWrap = ref<HTMLElement | null>(null)
const fullscreen = ref(false)

// --- Estado na URL: nó (histórico), profundidade, ano, abrangência e filtros ocultos.
const selected = computed(() => (typeof route.query.no === 'string' && route.query.no ? route.query.no : null))
const depth = ref(Number(route.query.prof ?? 2) || 2)
const yearRange = computed(() => {
  const years = graph.value.nodes.map((n) => n.startYear).filter((y): y is number => typeof y === 'number')
  return { min: years.length ? Math.min(...years) : 1780, max: new Date().getFullYear() }
})
const yearInput = ref<number>(Number(route.query.ano) || new Date().getFullYear())
const year = computed(() => (yearInput.value >= yearRange.value.max ? null : yearInput.value))

const HIDE_KEYS = {
  pessoas: (v: boolean) => (filters.value.showPeople = v),
  jurisdicoes: (v: boolean) => (filters.value.showJurisdictions = v),
  ordenacoes: (v: boolean) => (filters.value.groups.ordinations = v),
  vinculos: (v: boolean) => (filters.value.groups.affiliations = v),
  relacoes: (v: boolean) => (filters.value.groups.relations = v)
} as const

// A URL manda quando traz esses parâmetros (link compartilhado); senão vale o estado da sessão.
if (route.query.tudo === '1') filters.value.scope = 'all'
if (typeof route.query.ocultar === 'string') {
  for (const key of Object.keys(HIDE_KEYS) as (keyof typeof HIDE_KEYS)[]) HIDE_KEYS[key](!route.query.ocultar.split(',').includes(key))
}

const nodesById = computed(() => new Map(graph.value.nodes.map((n) => [n.id, n])))
const selectedNode = computed(() => (selected.value ? nodesById.value.get(selected.value) ?? null : null))

const stats = computed(() => ({
  people: graph.value.nodes.filter((n) => n.kind === 'person').length,
  jurisdictions: graph.value.nodes.filter((n) => n.kind === 'jurisdiction').length,
  sources: sources.value.length
}))

const brazilian = computed(() =>
  graph.value.nodes
    .filter((n) => n.kind === 'jurisdiction' && n.country === 'BR' && ['national_church', 'province', 'network'].includes(n.jurisdictionType ?? ''))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
)

/** Pontos de partida sugeridos: as jurisdições brasileiras mais ligadas. */
const starters = computed(() => {
  const degree = new Map<string, number>()
  for (const e of graph.value.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  return [...brazilian.value].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)).slice(0, 6)
})

function buildQuery() {
  const hidden = (Object.keys(HIDE_KEYS) as (keyof typeof HIDE_KEYS)[]).filter((k) => {
    const f = filters.value
    return { pessoas: !f.showPeople, jurisdicoes: !f.showJurisdictions, ordenacoes: !f.groups.ordinations, vinculos: !f.groups.affiliations, relacoes: !f.groups.relations }[k]
  })
  return {
    ...(selected.value ? { no: selected.value } : {}),
    ...(selected.value && depth.value !== 2 ? { prof: String(depth.value) } : {}),
    ...(year.value ? { ano: String(year.value) } : {}),
    ...(filters.value.scope === 'all' ? { tudo: '1' } : {}),
    ...(hidden.length ? { ocultar: hidden.join(',') } : {})
  }
}

/** Selecionar um nó entra no histórico do navegador (voltar/avançar percorrem a trilha). */
function select(id: string | null) {
  if (id === selected.value) return
  if (id) visit(id)
  router.push({ query: { ...buildQuery(), no: id ?? undefined } })
}

const canGoBack = ref(false)
function goBack() {
  if (import.meta.client && window.history.state?.back) router.back()
  else select(null)
}

function resetFilters() {
  filters.value = structuredClone(DEFAULT_FILTERS)
  yearInput.value = yearRange.value.max
}

watch(selected, (id) => {
  if (id) visit(id)
  if (!import.meta.client) return
  canGoBack.value = !!window.history.state?.back
  // No celular o painel vira uma folha inferior; garante que o grafo fique visível por trás.
  if (id && !fullscreen.value && window.innerWidth < 1024) graphWrap.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}, { immediate: true })

// Profundidade, ano e filtros não criam entradas no histórico: só atualizam a URL.
watch([depth, year, filters], () => router.replace({ query: buildQuery() }), { deep: true })

watch(fullscreen, (on) => {
  if (!import.meta.client) return
  document.body.style.overflow = on ? 'hidden' : ''
  setTimeout(() => {
    graphRef.value?.resize()
    graphRef.value?.fit(true)
  }, 50)
})

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (e.key === 'Escape') {
    if (fullscreen.value) fullscreen.value = false
    else if (selected.value) select(null)
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.scope-btn {
  @apply rounded-md px-3 py-1 text-stone-600 hover:text-stone-900;
}
.scope-btn.active {
  @apply bg-stone-800 text-white;
}
.chip {
  @apply rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-500 line-through decoration-stone-300 hover:border-stone-400;
}
.chip.active {
  @apply border-amber-300 bg-amber-50 text-amber-900 no-underline;
}
</style>
