<template>
  <div class="min-h-screen bg-stone-50">
    <EpiscopadoHeader />

    <section class="bg-gradient-to-b from-amber-50 to-stone-50 border-b border-stone-200">
      <div class="max-w-4xl mx-auto px-4 pt-10 pb-8 text-center">
        <h1 class="font-serif text-4xl sm:text-5xl font-semibold text-stone-900">Rede do Episcopado Histórico</h1>
        <p class="mt-3 text-stone-600 max-w-2xl mx-auto">
          Quem ordenou quem, de onde vieram as jurisdições anglicanas no Brasil e como cada linha se liga à sucessão
          histórica, com fonte para cada afirmação.
        </p>
        <div class="mt-6 max-w-2xl mx-auto text-left">
          <EpiscopadoSearch :nodes="graph.nodes" size="lg" shortcut placeholder="Busque um clérigo ou jurisdição (ex.: Uchôa, IEAB)…" @select="(n) => select(n.id)" />
        </div>
        <p class="mt-3 text-xs text-stone-500">
          {{ stats.people }} pessoas · {{ stats.jurisdictions }} jurisdições · {{ graph.edges.length }} ligações — base em construção
        </p>
      </div>
    </section>

    <main class="max-w-6xl mx-auto px-4 py-6">
      <!-- Controles -->
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-700 mb-3">
        <label class="inline-flex items-center gap-1.5"><input v-model="showPeople" type="checkbox" class="accent-amber-700"> Pessoas</label>
        <label class="inline-flex items-center gap-1.5"><input v-model="showJurisdictions" type="checkbox" class="accent-amber-700"> Jurisdições</label>
        <span class="text-stone-300" aria-hidden="true">|</span>
        <label class="inline-flex items-center gap-1.5"><input v-model="groups.ordinations" type="checkbox" class="accent-amber-700"> Ordenações</label>
        <label class="inline-flex items-center gap-1.5"><input v-model="groups.affiliations" type="checkbox" class="accent-amber-700"> Vínculos</label>
        <label class="inline-flex items-center gap-1.5"><input v-model="groups.relations" type="checkbox" class="accent-amber-700"> Cismas e filiações</label>
        <span class="text-stone-300" aria-hidden="true">|</span>
        <label class="inline-flex items-center gap-2">
          Até
          <input v-model.number="yearInput" type="range" :min="yearRange.min" :max="yearRange.max" class="w-28 accent-amber-700" aria-label="Mostrar a rede até o ano">
          <span class="tabular-nums w-10">{{ year ?? 'hoje' }}</span>
        </label>
      </div>

      <div class="grid lg:grid-cols-[1fr_20rem] gap-4">
        <div class="relative h-[65vh] min-h-[420px] bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <ClientOnly>
            <EpiscopadoGraph
              v-if="graph.nodes.length"
              :graph="graph"
              :selected="selected"
              :depth="selected ? depth : 0"
              :year="year"
              :groups="groups"
              :show-people="showPeople"
              :show-jurisdictions="showJurisdictions"
              @select="select"
            />
          </ClientOnly>
          <div class="absolute top-3 left-3 bg-white/90 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 space-y-1 max-w-[12rem] pointer-events-none">
            <p v-for="l in NODE_LEGEND" :key="l.label" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: l.color }" />{{ l.label }}
            </p>
          </div>
        </div>

        <!-- Painel do nó selecionado -->
        <aside class="bg-white border border-stone-200 rounded-2xl p-4 text-sm lg:max-h-[65vh] lg:overflow-auto">
          <template v-if="selectedNode">
            <p class="text-xs uppercase tracking-wide text-stone-500">{{ kindLabel(selectedNode) }}</p>
            <h2 class="text-lg font-semibold text-stone-900 mt-0.5">{{ selectedNode.label }}</h2>
            <div class="flex items-center gap-2 mt-3">
              <NuxtLink :to="nodeRoute(selectedNode.id)" class="inline-flex px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 font-medium">Abrir ficha</NuxtLink>
              <label class="inline-flex items-center gap-1.5 text-stone-600">
                Vizinhança
                <select v-model.number="depth" class="border border-stone-300 rounded px-1 py-0.5">
                  <option :value="1">1 passo</option>
                  <option :value="2">2 passos</option>
                  <option :value="3">3 passos</option>
                  <option :value="0">rede toda</option>
                </select>
              </label>
            </div>
            <div v-for="group in neighborGroups" :key="group.label" class="mt-4">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">{{ group.label }}</h3>
              <ul class="space-y-0.5">
                <li v-for="item in group.items" :key="item.id + item.detail">
                  <button type="button" class="text-left text-stone-800 hover:text-amber-800 hover:underline" @click="select(item.id)">{{ item.label }}</button>
                  <span v-if="item.detail" class="text-stone-500"> · {{ item.detail }}</span>
                </li>
              </ul>
            </div>
          </template>
          <template v-else>
            <h2 class="font-semibold text-stone-900">Como explorar</h2>
            <ul class="mt-2 space-y-1.5 text-stone-600 list-disc pl-4">
              <li>Busque um nome ou sigla, ou clique num ponto da rede.</li>
              <li>Passe o mouse para destacar as ligações diretas.</li>
              <li>Use “Vizinhança” para ver só quem está a 1–3 passos.</li>
              <li>Arraste o controle de ano para ver a rede em outra época.</li>
            </ul>
            <div class="mt-4 space-y-1 text-xs text-stone-600">
              <p v-for="l in EDGE_LEGEND" :key="l.label" class="flex items-center gap-2">
                <span class="w-5 h-0.5 shrink-0" :style="{ background: l.color }" />{{ l.label }}
              </p>
            </div>
          </template>
        </aside>
      </div>

      <!-- Diretório de jurisdições brasileiras (também é a navegação principal no celular) -->
      <section class="mt-10">
        <h2 class="font-serif text-2xl font-semibold text-stone-900 mb-3">Jurisdições no Brasil</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="j in brazilian"
            :key="j.id"
            :to="nodeRoute(j.id)"
            class="block bg-white border border-stone-200 rounded-xl px-4 py-3 hover:border-amber-400 hover:shadow-sm transition"
          >
            <p class="font-medium text-stone-900">{{ j.label }}</p>
            <p class="text-xs text-stone-500 truncate">{{ j.search[0] !== j.label ? j.search[0] : '' }}</p>
          </NuxtLink>
        </div>
      </section>
    </main>

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { EDGE_LABEL, JURISDICTION_TYPE_LABEL, ORDER_LABEL, ROLE_LABEL } from '../../lib/labels'
import { EDGE_LEGEND, NODE_LEGEND, nodeRoute, type EdgeGroup } from '../../lib/style'

definePageMeta({ layout: false })

useSeoMeta({
  title: 'Rede do Episcopado Histórico (beta) - Caminho Anglicano',
  description: 'Genealogia de clérigos e jurisdições anglicanas no Brasil: ordenações, sagrações, cismas e linhas de sucessão, com fontes.',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const router = useRouter()
const { data: graph } = await useEpiscopadoGraph()

const selected = ref<string | null>((route.query.no as string) || null)
const depth = ref(Number(route.query.prof ?? 2))
const showPeople = ref(true)
const showJurisdictions = ref(true)
const groups = reactive<Record<EdgeGroup, boolean>>({ ordinations: true, affiliations: true, relations: true })

const yearRange = computed(() => {
  const years = graph.value.nodes.map((n) => n.startYear).filter((y): y is number => typeof y === 'number')
  const max = new Date().getFullYear()
  return { min: years.length ? Math.min(...years) : 1780, max }
})
const yearInput = ref<number>(Number(route.query.ano) || new Date().getFullYear())
const year = computed(() => (yearInput.value >= yearRange.value.max ? null : yearInput.value))

const nodesById = computed(() => new Map(graph.value.nodes.map((n) => [n.id, n])))
const selectedNode = computed(() => (selected.value ? nodesById.value.get(selected.value) ?? null : null))

const stats = computed(() => ({
  people: graph.value.nodes.filter((n) => n.kind === 'person').length,
  jurisdictions: graph.value.nodes.filter((n) => n.kind === 'jurisdiction').length
}))

const brazilian = computed(() =>
  graph.value.nodes
    .filter((n) => n.kind === 'jurisdiction' && n.country === 'BR' && ['national_church', 'province', 'network'].includes(n.jurisdictionType ?? ''))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
)

function kindLabel(n: GraphNode): string {
  if (n.kind === 'jurisdiction') return n.jurisdictionType ? JURISDICTION_TYPE_LABEL[n.jurisdictionType] : 'Jurisdição'
  return n.order ? ORDER_LABEL[n.order] : 'Pessoa'
}

/** Ligações diretas do nó selecionado, agrupadas para o painel lateral. */
const neighborGroups = computed(() => {
  const id = selected.value
  if (!id) return []
  const groupsMap = new Map<string, { id: string; label: string; detail: string }[]>()
  const add = (group: string, otherId: string, detail: string) => {
    const other = nodesById.value.get(otherId)
    if (!other) return
    groupsMap.set(group, [...(groupsMap.get(group) ?? []), { id: otherId, label: other.label, detail }])
  }
  const role = (label?: string) => (label ? ROLE_LABEL[label as keyof typeof ROLE_LABEL] ?? label : '')
  for (const e of graph.value.edges) {
    const yearText = e.year ? String(e.year) : ''
    if (e.to === id) {
      if (e.kind === 'consecration') add('Sagrado por', e.from, yearText)
      else if (e.kind === 'co_consecration') add('Co-sagrantes', e.from, yearText)
      else if (e.kind === 'presbyteral_ordination' || e.kind === 'diaconal_ordination') add('Ordenado por', e.from, `${EDGE_LABEL[e.kind].toLowerCase()} ${yearText}`.trim())
      else if (e.kind === 'affiliation') add('Pessoas vinculadas', e.from, role(e.label))
      else add('Relações recebidas', e.from, `${EDGE_LABEL[e.kind].toLowerCase()} ${yearText}`.trim())
    } else if (e.from === id) {
      if (e.kind === 'consecration' || e.kind === 'co_consecration') add('Sagrou', e.to, `${e.kind === 'co_consecration' ? 'co-sagrante ' : ''}${yearText}`.trim())
      else if (e.kind === 'presbyteral_ordination' || e.kind === 'diaconal_ordination') add('Ordenou', e.to, `${EDGE_LABEL[e.kind].toLowerCase()} ${yearText}`.trim())
      else if (e.kind === 'affiliation') add('Vínculos', e.to, role(e.label))
      else add('Relações', e.to, `${EDGE_LABEL[e.kind]} ${yearText}`.trim())
    }
  }
  return [...groupsMap].map(([label, items]) => ({ label, items }))
})

function select(id: string | null) {
  selected.value = id
}

// Estado na URL para que qualquer visão seja compartilhável.
watch([selected, depth, year], () => {
  router.replace({
    query: {
      ...(selected.value ? { no: selected.value } : {}),
      ...(selected.value && depth.value !== 2 ? { prof: String(depth.value) } : {}),
      ...(year.value ? { ano: String(year.value) } : {})
    }
  })
})
</script>
