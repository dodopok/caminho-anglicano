<template>
  <div class="episcopado relative flex h-[100dvh] min-h-[480px] flex-col overflow-hidden bg-ep-paper text-sm">
    <EpiscopadoHeader :nodes="graph.nodes" explorer :sticky="false" @select="(n) => select(n.id)" @open="(n) => openFicha(n.id)" @home="goHome" />

    <!-- Filtros -->
    <div class="relative z-20 flex h-11 flex-none items-center gap-3.5 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-ep-line bg-ep-paper-2 px-4 text-xs text-ep-body min-[700px]:px-5">
      <div class="ep-seg flex-none" role="group" aria-label="Abrangência da rede">
        <button type="button" :aria-pressed="filters.scope === 'brazil'" @click="filters.scope = 'brazil'">Brasil</button>
        <button type="button" :aria-pressed="filters.scope === 'all'" @click="filters.scope = 'all'">Rede inteira</button>
      </div>
      <div class="flex flex-none items-center gap-3.5" role="group" aria-label="Filtros">
        <button v-for="f in SWITCHES.slice(0, 2)" :key="f.label" type="button" role="switch" class="ep-switch" :aria-checked="f.get()" @click="f.toggle()">
          <span class="ep-switch-track" aria-hidden="true"><span class="ep-switch-knob" /></span>{{ f.label }}
        </button>
        <span class="mx-0.5 h-4 w-px bg-ep-line" aria-hidden="true" />
        <button v-for="f in SWITCHES.slice(2)" :key="f.label" type="button" role="switch" class="ep-switch" :aria-checked="f.get()" @click="f.toggle()">
          <span class="ep-switch-track" aria-hidden="true"><span class="ep-switch-knob" /></span>{{ f.label }}
        </button>
      </div>
      <label class="flex flex-none items-center gap-2">
        <span class="ep-mono-label">Até</span>
        <input v-model.number="yearInput" type="range" :min="yearRange.min" :max="yearRange.max" class="w-[90px] accent-ep-ink" aria-label="Mostrar a rede até o ano">
        <span class="w-[34px] font-ep-mono tabular-nums text-ep-ink">{{ year ?? 'hoje' }}</span>
      </label>
      <button v-if="filtersDirty" type="button" class="flex-none font-medium text-ep-garnet-ink underline underline-offset-[3px]" @click="resetFilters">Limpar filtros</button>
    </div>

    <!-- Área do grafo, com a coluna de ajuda (sem seleção) ou o painel do nó (com seleção) -->
    <div class="relative flex min-h-0 flex-1" :class="selectedNode ? 'flex-col min-[1000px]:flex-row' : 'flex-col min-[700px]:flex-row'">
      <!-- Como explorar (colapsável) -->
      <aside
        v-if="showHelp"
        class="order-last h-[45%] flex-none overflow-auto border-t border-ep-rule bg-ep-card px-5 py-[18px] min-[700px]:order-none min-[700px]:h-auto min-[700px]:w-[380px] min-[700px]:border-r min-[700px]:border-t-0 min-[700px]:border-ep-line min-[700px]:px-[22px] min-[700px]:py-5"
        aria-labelledby="como-explorar"
      >
        <div class="flex items-start gap-2">
          <h2 id="como-explorar" class="flex-1 font-ep-serif text-[26px] font-medium leading-[1.1] tracking-[-.01em] text-ep-ink">Como explorar</h2>
          <button type="button" class="ep-icon-btn h-7 w-7 text-[13px]" aria-label="Recolher" title="Recolher" @click="helpOpen = false">▴</button>
        </div>
        <ol class="mt-2.5 flex flex-col gap-1.5">
          <li v-for="(t, i) in STEPS" :key="i" class="flex gap-2 text-[13px] leading-[1.45] text-ep-body">
            <span class="font-semibold text-ep-garnet">{{ i + 1 }}.</span><span>{{ t }}</span>
          </li>
        </ol>
        <p class="mt-2.5 text-xs leading-normal text-ep-muted">A vista inicial mostra o núcleo brasileiro. Troque para “Rede inteira” para ver a sucessão histórica fora do país.</p>

        <h3 class="ep-eyebrow mt-4">Comece por aqui</h3>
        <ul class="mt-2 flex flex-wrap gap-1.5">
          <li v-for="s in starters" :key="s.id">
            <button type="button" class="ep-chip" @click="select(s.id)">
              <span class="h-2 w-2 rounded-full" :style="{ background: nodeColor(s) }" aria-hidden="true" />{{ s.label }}
            </button>
          </li>
        </ul>

        <template v-if="brazilian.length">
          <h3 class="ep-eyebrow mt-4">Jurisdições no Brasil</h3>
          <ul class="mt-2 flex flex-col gap-1">
            <li v-for="j in brazilian" :key="j.id" class="flex items-center gap-2.5 rounded-ep border border-ep-line-2 bg-ep-card px-2.5 py-2 transition-colors hover:border-ep-garnet-mid hover:bg-ep-garnet-soft">
              <button type="button" class="flex min-w-0 flex-1 items-center gap-2.5 text-left" @click="select(j.id)">
                <span class="h-[9px] w-[9px] flex-none rounded-full" :style="{ background: nodeColor(j) }" aria-hidden="true" />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-ep-ink">{{ j.label }}</span>
                  <span class="block truncate text-[11px] text-ep-muted">{{ j.search[0] !== j.label ? j.search[0] : (j.jurisdictionType ? JURISDICTION_TYPE_LABEL[j.jurisdictionType] : '') }}</span>
                </span>
              </button>
              <button type="button" class="flex-none whitespace-nowrap rounded-ep border border-ep-line bg-ep-card px-2 py-[3px] text-[11px] text-ep-body hover:border-ep-garnet hover:text-ep-garnet-ink" :aria-label="`Abrir a ficha de ${j.label}`" @click="openFicha(j.id)">ficha →</button>
            </li>
          </ul>
        </template>
        <p class="mt-3.5 text-[11px] text-ep-faint">
          {{ stats.people }} pessoas · {{ stats.jurisdictions }} jurisdições · {{ graph.edges.length }} ligações · {{ stats.sources }} fontes — base em construção
        </p>
      </aside>

      <!-- Grafo -->
      <div ref="graphWrap" class="relative min-h-[200px] min-w-0 flex-1">
        <div v-if="graphError" class="absolute inset-0 flex items-center justify-center p-6" role="alert">
          <div class="max-w-sm rounded-ep border border-ep-line bg-ep-card px-5 py-6 text-center">
            <p class="font-medium text-ep-red">Não foi possível carregar a rede.</p>
            <p class="mt-1 text-[13px] text-ep-body">{{ graphError.message }}</p>
            <button type="button" class="ep-btn ep-btn-primary mt-4" @click="refreshGraph()">Tentar de novo</button>
          </div>
        </div>
        <div v-else-if="!graph.nodes.length" class="absolute inset-0 flex items-center justify-center p-6 text-center text-ep-body">
          A base ainda está vazia. Volte em breve.
        </div>
        <ClientOnly v-else>
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
            :controls="false"
            @select="select"
            @open="openFicha"
            @reset-filters="resetFilters"
            @counts="(n, e) => (counts = [n, e])"
          />
          <template #fallback>
            <div class="flex h-full items-center justify-center text-sm text-ep-muted">Carregando o explorador…</div>
          </template>
        </ClientOnly>

        <button
          v-if="!selectedNode && !helpOpen"
          type="button"
          class="absolute left-4 top-4 flex h-[34px] max-w-[calc(100%-2rem)] items-center gap-2 overflow-hidden whitespace-nowrap rounded-ep border border-ep-rule bg-ep-card px-3 text-xs text-ep-ink-3 hover:border-ep-ink min-[700px]:left-5"
          :aria-expanded="false"
          @click="helpOpen = true"
        >Como explorar · Jurisdições no Brasil <span class="text-ep-faint" aria-hidden="true">▾</span></button>

        <p v-if="selected && !selectedNode" class="absolute inset-x-3 top-3 rounded-ep border border-ep-garnet-line bg-ep-garnet-soft px-3 py-2 text-center text-xs text-ep-garnet-ink">
          O nó “{{ selected }}” não existe na rede. <button type="button" class="font-medium underline" @click="select(null)">Limpar seleção</button>
        </p>
      </div>

      <!-- Painel do nó selecionado -->
      <aside
        v-if="selectedNode"
        class="flex h-[45%] flex-none flex-col overflow-hidden border-t border-ep-rule bg-ep-card min-[1000px]:h-auto min-[1000px]:w-[380px] min-[1000px]:border-l min-[1000px]:border-t-0 min-[1000px]:border-ep-line"
        aria-label="Mini-ficha do nó selecionado"
      >
        <EpiscopadoNodePanel
          :node="selectedNode"
          :graph="graph"
          :nodes-by-id="nodesById"
          :depth="depth"
          :counts="counts"
          @update:depth="(d) => (depth = d)"
          @select="select"
          @close="select(null)"
          @open="(section) => openFicha(selectedNode!.id, section)"
          @fit="graphRef?.fit(true)"
        />
      </aside>
    </div>

    <!-- Barra de estado: recomeçar, voltar, trilha, legenda, câmera -->
    <div class="relative z-20 flex h-11 flex-none items-center gap-2.5 border-t border-ep-line bg-ep-card pl-3 pr-3 min-[700px]:pl-5">
      <button type="button" class="ep-btn ep-btn-primary ep-btn-sm flex-none" title="Volta à vista inicial: sem seleção, sem trilha e com os filtros padrão" @click="goHome">↺ Recomeçar</button>
      <EpiscopadoTrail :trail="trail" :current="selected" :nodes-by-id="nodesById" :can-go-back="canGoBack" :compact="!!selectedNode" @select="select" @back="goBack" @clear="trail.splice(0)" />
      <div class="relative ml-auto flex flex-none items-center gap-1.5">
        <div v-if="legendOpen" id="legenda" class="absolute bottom-10 right-0 z-30 max-h-[calc(100dvh-140px)] w-max max-w-[calc(100vw-1.5rem)] overflow-auto rounded-ep border border-ep-rule bg-ep-card px-3.5 py-3">
          <EpiscopadoLegend />
        </div>
        <button
          type="button"
          class="ep-btn ep-btn-sm"
          :class="legendOpen ? 'ep-btn-primary' : 'ep-btn-secondary'"
          :aria-expanded="legendOpen"
          aria-controls="legenda"
          @click="legendOpen = !legendOpen"
        >Legenda</button>
        <div class="flex overflow-hidden rounded-ep border border-ep-rule">
          <button type="button" class="h-[30px] w-8 border-r border-ep-rule bg-ep-card text-[15px] text-ep-ink-3 hover:text-ep-ink" aria-label="Aproximar" title="Aproximar" @click="graphRef?.zoom(1 / 1.6)">+</button>
          <button type="button" class="h-[30px] w-8 border-r border-ep-rule bg-ep-card text-[15px] text-ep-ink-3 hover:text-ep-ink" aria-label="Afastar" title="Afastar" @click="graphRef?.zoom(1.6)">−</button>
          <button type="button" class="h-[30px] w-8 bg-ep-card text-sm text-ep-ink-3 hover:text-ep-ink" aria-label="Enquadrar a rede" title="Enquadrar" @click="graphRef?.fit(true)">⌖</button>
        </div>
      </div>
    </div>

    <!-- Ficha completa: folha sobre o grafo -->
    <Transition name="ep-sheet">
      <div
        v-if="fichaId"
        ref="sheet"
        class="absolute bottom-0 right-0 top-[100px] z-40 w-full overflow-auto bg-ep-card shadow-[-1px_0_0_rgba(21,19,15,.15),-12px_0_32px_rgba(21,19,15,.08)] min-[700px]:top-14 min-[1000px]:w-[min(680px,62%)]"
        role="dialog"
        :aria-label="fichaNode ? `Ficha de ${fichaNode.label}` : 'Ficha'"
      >
        <EpiscopadoPersonFicha v-if="fichaPerson" :person="fichaPerson" sheet @back="closeFicha" @close="closeFicha" />
        <EpiscopadoJurisdictionFicha v-else-if="fichaJurisdiction" :jurisdiction="fichaJurisdiction" sheet @back="closeFicha" @close="closeFicha" />
        <template v-else>
          <div class="sticky top-0 flex items-center gap-2 border-b border-ep-line bg-ep-card px-4 py-3">
            <button type="button" class="ep-btn ep-btn-secondary ep-btn-sm" @click="closeFicha">← Voltar à rede</button>
            <button type="button" class="ep-icon-btn ml-auto" aria-label="Fechar ficha (Esc)" @click="closeFicha">×</button>
          </div>
          <div v-if="fichaError" class="px-8 py-10 text-ep-body" role="alert">
            <p class="font-medium text-ep-red">Não foi possível carregar esta ficha.</p>
            <button type="button" class="ep-btn ep-btn-primary mt-4" @click="loadFicha()">Tentar de novo</button>
          </div>
          <div v-else class="space-y-3 px-8 py-8" role="status" aria-label="Carregando a ficha">
            <div class="h-3 w-24 animate-pulse rounded-ep bg-ep-line-2" />
            <div class="h-10 w-2/3 animate-pulse rounded-ep bg-ep-line-2" />
            <div class="h-3 w-full animate-pulse rounded-ep bg-ep-line-2" />
            <div class="h-3 w-5/6 animate-pulse rounded-ep bg-ep-line-2" />
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { JURISDICTION_TYPE_LABEL } from '../../lib/labels'
import { nodeColor } from '../../lib/style'
import type { JurisdictionView, PersonView } from '../../lib/views'
import { DEFAULT_FILTERS } from '../../composables/useEpiscopadoExplorer'

definePageMeta({ layout: false })
useEpiscopadoFonts()

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

const graphRef = ref<{ fit: (animate?: boolean) => void; zoom: (factor: number) => void; resize: () => void } | null>(null)
const graphWrap = ref<HTMLElement | null>(null)
const sheet = ref<HTMLElement | null>(null)
const counts = ref<[number, number] | undefined>(undefined)
const legendOpen = ref(false)
/** "Como explorar" começa aberto, exceto em telas pequenas (ver onMounted). */
const helpOpen = useState('episcopado-help-open', () => true)

const STEPS = [
  'Busque um nome ou sigla, ou clique num ponto da rede.',
  'Passe o mouse para destacar as ligações diretas; duplo clique abre a ficha.',
  'Com um nó selecionado, “Vizinhança” limita a rede a quem está a 1–3 passos.',
  'Arraste o controle de ano para ver a rede em outra época.',
  'Voltar e a trilha percorrem os nós que você visitou; Recomeçar volta à vista inicial.'
]

// --- Estado na URL: nó (histórico), ficha aberta, profundidade, ano, abrangência e filtros ocultos.
const selected = computed(() => (typeof route.query.no === 'string' && route.query.no ? route.query.no : null))
const fichaId = computed(() => (typeof route.query.ficha === 'string' && /^[pj]:/.test(route.query.ficha) ? route.query.ficha : null))
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

/** Interruptores da barra de filtros (os dois primeiros filtram nós; os outros, tipos de ligação). */
const SWITCHES = [
  { label: 'Pessoas', get: () => filters.value.showPeople, toggle: () => (filters.value.showPeople = !filters.value.showPeople) },
  { label: 'Jurisdições', get: () => filters.value.showJurisdictions, toggle: () => (filters.value.showJurisdictions = !filters.value.showJurisdictions) },
  { label: 'Ordenações', get: () => filters.value.groups.ordinations, toggle: () => (filters.value.groups.ordinations = !filters.value.groups.ordinations) },
  { label: 'Vínculos', get: () => filters.value.groups.affiliations, toggle: () => (filters.value.groups.affiliations = !filters.value.groups.affiliations) },
  { label: 'Cismas e filiações', get: () => filters.value.groups.relations, toggle: () => (filters.value.groups.relations = !filters.value.groups.relations) }
]

const filtersDirty = computed(() => year.value !== null || JSON.stringify(filters.value) !== JSON.stringify(DEFAULT_FILTERS))

const nodesById = computed(() => new Map(graph.value.nodes.map((n) => [n.id, n])))
const selectedNode = computed(() => (selected.value ? nodesById.value.get(selected.value) ?? null : null))
const fichaNode = computed(() => (fichaId.value ? nodesById.value.get(fichaId.value) ?? null : null))
const showHelp = computed(() => !selectedNode.value && helpOpen.value)

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
    ...(fichaId.value ? { ficha: fichaId.value } : {}),
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

/** Abre a ficha completa numa folha sobre o grafo (o nó também fica selecionado). */
function openFicha(id: string, section?: string) {
  if (!nodesById.value.has(id)) return
  pendingSection = section ?? null
  visit(id)
  router.push({ query: { ...buildQuery(), no: id, ficha: id } })
}

function closeFicha() {
  router.replace({ query: { ...buildQuery(), ficha: undefined } })
}

// Dentro da folha, nomes de pessoas e jurisdições abrem a ficha delas na própria folha.
provideEpiscopadoNodeLink((id) => ({ path: '/episcopado', query: { ...buildQuery(), no: id, ficha: id } }))

const canGoBack = ref(false)
function goBack() {
  if (import.meta.client && window.history.state?.back) router.back()
  else select(null)
}

function resetFilters() {
  filters.value = structuredClone(DEFAULT_FILTERS)
  yearInput.value = yearRange.value.max
}

/** Recomeçar: sem seleção, sem ficha, sem trilha, filtros e vizinhança padrão. */
function goHome() {
  resetFilters()
  trail.value.splice(0)
  depth.value = 2
  helpOpen.value = true
  legendOpen.value = false
  router.push({ query: {} })
}

watch(selected, (id) => {
  if (id) visit(id)
  if (!import.meta.client) return
  canGoBack.value = !!window.history.state?.back
}, { immediate: true })

// Profundidade, ano e filtros não criam entradas no histórico: só atualizam a URL.
watch([depth, year, filters], () => router.replace({ query: buildQuery() }), { deep: true })

// --- Ficha na folha: carrega a visão da pessoa ou jurisdição pela API.
const fichaData = ref<PersonView | JurisdictionView | null>(null)
const fichaError = ref(false)
let pendingSection: string | null = null
const fichaPerson = computed(() => (fichaData.value && fichaId.value?.startsWith('p:') && fichaData.value.id === fichaId.value.slice(2) && 'ordinations' in fichaData.value ? fichaData.value : null))
const fichaJurisdiction = computed(() => (fichaData.value && fichaId.value?.startsWith('j:') && fichaData.value.id === fichaId.value.slice(2) && 'relations' in fichaData.value ? fichaData.value : null))

async function loadFicha() {
  const id = fichaId.value
  if (!id) return
  fichaError.value = false
  try {
    const kind = id.startsWith('p:') ? 'pessoa' : 'jurisdicao'
    const data = await $fetch<PersonView | JurisdictionView | { redirect: string }>(`/api/episcopado/${kind}/${id.slice(2)}`)
    if (id !== fichaId.value) return
    if ('redirect' in data) {
      router.replace({ query: { ...buildQuery(), ficha: `${id.slice(0, 2)}${data.redirect}` } })
      return
    }
    fichaData.value = data
    await nextTick()
    if (pendingSection) document.getElementById(pendingSection)?.scrollIntoView({ block: 'start' })
    else sheet.value?.scrollTo({ top: 0 })
    pendingSection = null
  } catch {
    if (id === fichaId.value) fichaError.value = true
  }
}
watch(fichaId, () => {
  if (import.meta.client) loadFicha()
})

// --- O grafo ocupa só o espaço livre: quando a coluna ou o painel mudam esse espaço, o Sigma se redimensiona e reenquadra.
let resizeObserver: ResizeObserver | null = null
let refitTimer: ReturnType<typeof setTimeout> | null = null
let lastSize = ''
function onGraphResize() {
  const el = graphWrap.value
  if (!el) return
  const size = `${el.clientWidth}x${el.clientHeight}`
  if (size === lastSize) return
  const first = !lastSize
  lastSize = size
  graphRef.value?.resize()
  if (first) return
  // Espera a animação do layout local (≈550 ms) terminar antes de reenquadrar.
  if (refitTimer) clearTimeout(refitTimer)
  refitTimer = setTimeout(() => graphRef.value?.fit(true), 600)
}

const openCite = useEpiscopadoOpenCite()
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (e.key !== 'Escape') return
  // Um cartão de fonte aberto fecha primeiro (ele mesmo trata o Esc).
  if (openCite.value) return
  if (legendOpen.value) legendOpen.value = false
  else if (fichaId.value) closeFicha()
  else if (selected.value) select(null)
}

onMounted(() => {
  // Captura: roda antes do cartão de fonte fechar, para o mesmo Esc não fechar também a ficha.
  document.addEventListener('keydown', onKeydown, { capture: true })
  if (window.innerWidth < 700 || window.innerHeight < 700) helpOpen.value = false
  if (fichaId.value) loadFicha()
  if (typeof ResizeObserver !== 'undefined' && graphWrap.value) {
    resizeObserver = new ResizeObserver(onGraphResize)
    resizeObserver.observe(graphWrap.value)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, { capture: true })
  resizeObserver?.disconnect()
  if (refitTimer) clearTimeout(refitTimer)
})
</script>

<style scoped>
.ep-sheet-enter-active,
.ep-sheet-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}
.ep-sheet-enter-from,
.ep-sheet-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>
