<template>
  <div class="flex h-full flex-col text-[13px]">
    <!-- Cabeçalho fixo do painel -->
    <div class="border-b border-ep-line-2 px-[18px] pb-3.5 pt-[18px]">
      <div class="flex items-start gap-2.5">
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.08em]" :class="node.kind === 'person' ? 'text-ep-garnet-ink' : 'text-ep-teal'">
            <span class="inline-block h-2 w-2 rounded-full" :style="{ background: nodeColor(node) }" aria-hidden="true" />
            {{ kicker }}
          </p>
          <h2 class="mt-1 font-ep-serif text-[28px] font-semibold leading-[1.1] text-ep-ink">{{ node.label }}</h2>
          <p v-if="subtitle" class="mt-1 text-xs text-ep-muted">{{ subtitle }}</p>
        </div>
        <button type="button" class="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-ep bg-ep-line-2 text-base text-ep-body hover:text-ep-ink" aria-label="Fechar painel" @click="emit('close')">×</button>
      </div>
      <div class="mt-3.5 flex gap-2">
        <button type="button" class="ep-btn ep-btn-primary h-[38px] flex-1" @click="emit('open')">Abrir ficha completa <span aria-hidden="true">→</span></button>
        <button type="button" class="ep-icon-btn h-[38px] w-[38px]" title="Enquadrar" aria-label="Enquadrar a rede" @click="emit('fit')">⌖</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-ep-line-2 px-[18px] py-2.5 text-xs text-ep-body">
      <span id="vizinhanca-rotulo" title="Vizinhança: quem está a N passos do nó selecionado">Vizinhança</span>
      <div class="flex gap-0.5 rounded-ep border border-ep-line bg-ep-paper p-[3px]" role="group" aria-labelledby="vizinhanca-rotulo">
        <button
          v-for="d in DEPTHS"
          :key="d.value"
          type="button"
          class="whitespace-nowrap rounded-ep px-2 py-1 text-xs"
          :class="depth === d.value ? 'bg-ep-ink font-medium text-ep-paper' : 'text-ep-body hover:text-ep-ink'"
          :aria-pressed="depth === d.value"
          @click="emit('update:depth', d.value)"
        >{{ d.label }}</button>
      </div>
      <span v-if="counts" class="ml-auto whitespace-nowrap text-ep-faint" aria-live="polite">{{ counts[0] }} {{ counts[0] === 1 ? 'nó' : 'nós' }} · {{ counts[1] }} {{ counts[1] === 1 ? 'ligação' : 'ligações' }}</span>
    </div>

    <div class="min-h-0 flex-1 overflow-auto px-[18px] pb-[18px] pt-3">
      <!-- Carregando -->
      <div v-if="pending && !view" class="space-y-2" role="status" aria-label="Carregando a mini-ficha">
        <div class="h-3 w-5/6 animate-pulse rounded-ep bg-ep-line-2" />
        <div class="h-3 w-full animate-pulse rounded-ep bg-ep-line-2" />
        <div class="h-3 w-2/3 animate-pulse rounded-ep bg-ep-line-2" />
        <div class="mt-4 h-3 w-1/3 animate-pulse rounded-ep bg-ep-line-2" />
        <div class="h-3 w-4/5 animate-pulse rounded-ep bg-ep-line-2" />
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="rounded-ep bg-[#f3e3e1] px-3 py-2 text-ep-red">
        Não foi possível carregar a mini-ficha.
        <button type="button" class="ml-1 font-medium underline" @click="refresh()">Tentar de novo</button>
      </div>

      <!-- Pessoa -->
      <template v-else-if="person">
        <p v-if="person.biography" class="mt-1 leading-[1.55] text-ep-ink-3" :class="{ 'line-clamp-4': !bioOpen }">{{ person.biography }}</p>
        <button v-if="person.biography && person.biography.length > 220" type="button" class="mt-0.5 text-xs text-ep-muted underline underline-offset-[3px] hover:text-ep-ink" @click="bioOpen = !bioOpen">{{ bioOpen ? 'menos' : 'ler mais' }}</button>

        <section v-if="person.ordinations.length" class="mt-4">
          <h3 class="ep-eyebrow mb-1.5">Ordenações</h3>
          <ol class="space-y-1.5">
            <li v-for="(o, i) in person.ordinations" :key="i" class="flex items-start gap-2">
              <span class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-ep-card" :class="MARK[o.order]" aria-hidden="true">{{ ORDER_SHORT[o.order] }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-ep-ink">
                  <span class="font-medium">{{ ORDER_LABEL[o.order] }}</span>
                  <span v-if="o.date" class="text-ep-muted"> · {{ formatDate(o.date) }}</span>
                  <EpiscopadoStatus class="ml-1" :status="o.status" :show-confirmed="false" />
                  <EpiscopadoCites :cites="o.cites" />
                </p>
                <p class="mt-px text-xs text-ep-muted">
                  <template v-if="o.order === 'episcopate' && o.principalConsecrator">por <button type="button" class="ep-link" @click="emit('select', `p:${o.principalConsecrator.id}`)">{{ o.principalConsecrator.name }}</button></template>
                  <template v-else-if="o.order !== 'episcopate' && o.ordainedBy">por <button type="button" class="ep-link" @click="emit('select', `p:${o.ordainedBy.id}`)">{{ o.ordainedBy.name }}</button></template>
                  <template v-if="o.coConsecrators.length"> e {{ o.coConsecrators.length }} co-sagrante{{ o.coConsecrators.length > 1 ? 's' : '' }}</template>
                  <template v-if="o.jurisdiction"> · <button type="button" class="ep-link" @click="emit('select', `j:${o.jurisdiction.id}`)">{{ o.jurisdiction.acronym ?? o.jurisdiction.name }}</button></template>
                </p>
              </div>
            </li>
          </ol>
        </section>
        <p v-else class="mt-3.5 rounded-ep bg-ep-paper px-2.5 py-2 text-xs text-ep-muted">
          Nenhuma ordenação registrada ainda<template v-if="node.inferredOrder">, mas aparece como sagrante de outros bispos</template>.
        </p>

        <section v-if="person.affiliations.length" class="mt-4">
          <h3 class="ep-eyebrow mb-1.5">Trajetória</h3>
          <ul class="space-y-1">
            <li v-for="(a, i) in person.affiliations.slice(-4).reverse()" :key="i" class="text-ep-ink-3">
              <span class="font-medium text-ep-ink">{{ a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role] }}</span>
              ·
              <button type="button" class="ep-link" @click="emit('select', `j:${(a.diocese ?? a.jurisdiction).id}`)">{{ (a.diocese ?? a.jurisdiction).acronym ?? (a.diocese ?? a.jurisdiction).name }}</button>
              <span v-if="formatPeriod(a.start, a.end)" class="text-ep-muted"> {{ formatPeriod(a.start, a.end) }}</span>
            </li>
          </ul>
          <p v-if="person.affiliations.length > 4" class="mt-1 text-xs text-ep-faint">+ {{ person.affiliations.length - 4 }} na ficha</p>
        </section>

        <section v-if="person.ordained.length" class="mt-4">
          <h3 class="ep-eyebrow mb-1.5">Sagrou ou ordenou <span class="font-normal text-ep-faint">{{ person.ordained.length }}</span></h3>
          <ul class="flex flex-wrap gap-1">
            <li v-for="(o, i) in person.ordained.slice(0, 8)" :key="i">
              <button type="button" class="ep-chip !px-2 !py-[3px]" @click="emit('select', `p:${o.person.id}`)">
                {{ o.person.name }}<span v-if="o.date" class="text-ep-faint">· {{ o.date.slice(0, 4) }}</span>
              </button>
            </li>
            <li v-if="person.ordained.length > 8" class="self-center text-xs text-ep-faint">+ {{ person.ordained.length - 8 }}</li>
          </ul>
        </section>
      </template>

      <!-- Jurisdição -->
      <template v-else-if="jurisdiction">
        <p v-if="jurisdiction.description" class="mt-1 leading-[1.55] text-ep-ink-3" :class="{ 'line-clamp-4': !bioOpen }">{{ jurisdiction.description }}</p>
        <button v-if="jurisdiction.description && jurisdiction.description.length > 220" type="button" class="mt-0.5 text-xs text-ep-muted underline underline-offset-[3px] hover:text-ep-ink" @click="bioOpen = !bioOpen">{{ bioOpen ? 'menos' : 'ler mais' }}</button>

        <dl v-if="jurisdiction.founded?.date || jurisdiction.dissolved?.date" class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <template v-if="jurisdiction.founded?.date">
            <dt class="text-ep-muted">Fundação</dt><dd class="text-ep-ink">{{ formatDate(jurisdiction.founded.date) }}<EpiscopadoCites :cites="jurisdiction.founded.cites" /></dd>
          </template>
          <template v-if="jurisdiction.dissolved?.date">
            <dt class="text-ep-muted">Extinção</dt><dd class="text-ep-ink">{{ formatDate(jurisdiction.dissolved.date) }}<EpiscopadoCites :cites="jurisdiction.dissolved.cites" /></dd>
          </template>
        </dl>

        <section v-if="jurisdiction.relations.length || jurisdiction.inbound.length" class="mt-4">
          <h3 class="ep-eyebrow mb-1.5">Origem e relações</h3>
          <ul class="space-y-1 text-ep-ink-3">
            <li v-for="(r, i) in [...jurisdiction.relations, ...jurisdiction.inbound].slice(0, 6)" :key="i">
              <span class="text-ep-muted">{{ i < jurisdiction.relations.length ? RELATION_LABEL[r.type] : RELATION_INVERSE_LABEL[r.type] }}</span>
              {{ ' ' }}<button type="button" class="ep-link font-medium" @click="emit('select', `j:${r.other.id}`)">{{ r.other.acronym ?? r.other.name }}</button>
              <span v-if="r.date" class="text-ep-muted"> · {{ formatDate(r.date) }}</span>
              <EpiscopadoStatus class="ml-1" :status="r.status" :show-confirmed="false" />
            </li>
          </ul>
        </section>

        <section v-if="bishops.length" class="mt-4">
          <h3 class="ep-eyebrow mb-1.5">Bispos e primazes <span class="font-normal text-ep-faint">{{ bishops.length }}</span></h3>
          <ul class="space-y-1">
            <li v-for="(m, i) in bishops.slice(0, 8)" :key="i" class="text-ep-ink-3">
              <button type="button" class="ep-link font-medium" @click="emit('select', `p:${m.person.id}`)">{{ m.person.name }}</button>
              <span class="text-ep-muted"> · {{ ROLE_LABEL[m.role] }}<template v-if="formatPeriod(m.start, m.end)">, {{ formatPeriod(m.start, m.end) }}</template></span>
            </li>
            <li v-if="bishops.length > 8" class="text-xs text-ep-faint">+ {{ bishops.length - 8 }} na ficha</li>
          </ul>
        </section>
      </template>

      <!-- Fontes principais (pessoa ou jurisdição) -->
      <section v-if="view && view.footnotes.length" class="mt-4">
        <h3 class="ep-eyebrow mb-1.5">Fontes <span class="font-normal text-ep-faint">{{ view.footnotes.length }}</span></h3>
        <ul class="space-y-1">
          <li v-for="f in topSources" :key="f.source.id" class="flex gap-1.5 text-xs">
            <span class="shrink-0 font-semibold tabular-nums text-ep-garnet">[{{ f.n }}]</span>
            <span class="min-w-0">
              <NuxtLink :to="sourceRoute(f.source.id)" class="font-medium text-ep-ink hover:text-ep-garnet-ink hover:underline">{{ f.source.title }}</NuxtLink>
              <span class="text-ep-muted"> · {{ SOURCE_TYPE_LABEL[f.source.type] }}</span>
            </span>
          </li>
        </ul>
        <button type="button" class="mt-1 text-xs text-ep-muted underline underline-offset-[3px] hover:text-ep-ink" @click="emit('open', 'fontes')">Todas as fontes na ficha →</button>
      </section>

      <!-- Ligações no grafo -->
      <details v-if="neighborGroups.length" class="group mt-4">
        <summary class="ep-eyebrow flex cursor-pointer list-none items-center gap-1.5">
          Ligações na rede <span class="font-normal text-ep-faint">{{ neighborTotal }}</span>
          <span class="ml-auto transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
        </summary>
        <div v-for="group in neighborGroups" :key="group.label" class="mt-2.5">
          <p class="mb-1 text-[11px] text-ep-faint">{{ group.label }} <span>{{ group.items.length }}</span></p>
          <ul class="flex flex-col gap-px">
            <li v-for="item in group.items" :key="item.id + item.detail">
              <button type="button" class="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-ep px-2 py-[5px] text-left hover:bg-ep-paper" @click="emit('select', item.id)">
                <span class="h-2 w-2 flex-none rounded-full" :style="{ background: item.color }" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate text-ep-ink">{{ item.label }}</span>
                <span v-if="item.detail" class="whitespace-nowrap text-[11px] text-ep-muted">{{ item.detail }}</span>
              </button>
            </li>
          </ul>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Graph, GraphNode } from '../../lib/graph'
import {
  EDGE_LABEL,
  JURISDICTION_TYPE_LABEL,
  ORDER_LABEL,
  RELATION_INVERSE_LABEL,
  RELATION_LABEL,
  ROLE_LABEL,
  SOURCE_TYPE_LABEL,
  TRADITION_LABEL,
  countryName,
  formatDate,
  formatPeriod
} from '../../lib/labels'
import { nodeColor, sourceRoute } from '../../lib/style'
import type { JurisdictionView, PersonView } from '../../lib/views'

/** Painel lateral do explorador: mini-ficha do nó selecionado, carregada da API. */
const props = defineProps<{
  node: GraphNode
  graph: Graph
  nodesById: Map<string, GraphNode>
  depth: number
  /** Nós e ligações à vista no grafo. */
  counts?: [number, number]
}>()
const emit = defineEmits<{
  select: [id: string]
  'update:depth': [depth: number]
  close: []
  /** Abrir a ficha completa (opcionalmente numa seção). */
  open: [section?: string]
  /** Enquadrar o grafo. */
  fit: []
}>()

const DEPTHS = [
  { value: 1, label: '1 passo' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 0, label: 'sem foco' }
]

const ORDER_SHORT = { diaconate: 'D', presbyterate: 'P', episcopate: 'B' } as const
const MARK = { diaconate: 'bg-slate-400', presbyterate: 'bg-slate-600', episcopate: 'bg-ep-garnet' } as const
const EPISCOPAL = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop', 'founder'])


const url = computed(() => `/api/episcopado/${props.node.kind === 'person' ? 'pessoa' : 'jurisdicao'}/${props.node.id.slice(2)}`)
const { data, pending, error, refresh } = useFetch<PersonView | JurisdictionView | { redirect: string }>(url, { lazy: true })

// Enquanto a nova ficha carrega, `data` ainda é a anterior: só vale se for do nó atual.
const view = computed(() => (data.value && !('redirect' in data.value) && data.value.id === props.node.id.slice(2) ? data.value : null))
const person = computed(() => (view.value && 'ordinations' in view.value ? view.value : null))
const jurisdiction = computed(() => (view.value && 'relations' in view.value ? view.value : null))
const bioOpen = ref(false)
watch(() => props.node.id, () => (bioOpen.value = false))

provideEpiscopadoFootnotes(computed(() => view.value?.footnotes ?? []))

const kicker = computed(() => {
  const n = props.node
  if (n.kind === 'jurisdiction') {
    return [n.jurisdictionType ? JURISDICTION_TYPE_LABEL[n.jurisdictionType] : 'Jurisdição', jurisdiction.value?.tradition ? TRADITION_LABEL[jurisdiction.value.tradition] : '', countryName(n.country)].filter(Boolean).join(' · ')
  }
  if (!n.order) return 'Pessoa'
  if (n.order === 'episcopate') return n.inferredOrder ? 'Bispo · inferido' : 'Bispo'
  return n.order === 'presbyterate' ? 'Presbítero' : 'Diácono'
})

const subtitle = computed(() => {
  if (person.value) {
    const p = person.value
    const life = [p.birth?.date ? formatDate(p.birth.date) : '', p.death?.date ? formatDate(p.death.date) : ''].filter(Boolean).join(' – ')
    return [p.fullName && p.fullName !== p.name ? p.fullName : '', life].filter(Boolean).join(' · ')
  }
  if (jurisdiction.value) return jurisdiction.value.acronym ? jurisdiction.value.name : ''
  return props.node.search[0] && props.node.search[0] !== props.node.label ? props.node.search[0] : ''
})

const bishops = computed(() => (jurisdiction.value?.members ?? []).filter((m) => EPISCOPAL.has(m.role)))

/** As fontes mais citadas da ficha, no máximo três. */
const topSources = computed(() => {
  const notes = view.value?.footnotes ?? []
  const seen = new Set<string>()
  return notes.filter((f) => (seen.has(f.source.id) ? false : (seen.add(f.source.id), true))).slice(0, 3)
})

/** Ligações diretas do nó no grafo, agrupadas. */
const neighborGroups = computed(() => {
  const id = props.node.id
  const groupsMap = new Map<string, { id: string; label: string; detail: string; color: string }[]>()
  const add = (group: string, otherId: string, detail: string) => {
    const other = props.nodesById.get(otherId)
    if (!other) return
    groupsMap.set(group, [...(groupsMap.get(group) ?? []), { id: otherId, label: other.label, detail, color: nodeColor(other) }])
  }
  const role = (label?: string) => (label ? ROLE_LABEL[label as keyof typeof ROLE_LABEL] ?? label : '')
  for (const e of props.graph.edges) {
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
const neighborTotal = computed(() => neighborGroups.value.reduce((n, g) => n + g.items.length, 0))
</script>
