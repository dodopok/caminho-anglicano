<template>
  <div class="relative h-full w-full">
    <div
      ref="container"
      class="absolute inset-0"
      :class="{ 'cursor-grab': !hoveredNode, 'cursor-pointer': hoveredNode }"
      role="img"
      aria-label="Grafo interativo da rede. Pelo teclado, use a busca, a trilha e o painel lateral para navegar."
    />

    <!-- Carregando / vazio -->
    <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ep-paper/80 text-sm text-ep-muted" role="status">
      <span class="h-6 w-6 animate-spin rounded-full border-2 border-ep-rule border-t-ep-garnet" aria-hidden="true" />
      Montando a rede…
    </div>
    <div v-else-if="visibleCount === 0" class="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] text-ep-body" role="status">
      <p class="pointer-events-auto max-w-xs rounded-ep border border-ep-line bg-ep-card px-[18px] py-3.5 shadow-[0_1px_0_rgba(21,19,15,.08)]">
        Nada para mostrar com os filtros atuais.<br>
        <button type="button" class="mt-1.5 font-semibold text-ep-garnet-ink underline underline-offset-[3px]" @click="emit('reset-filters')">Limpar filtros</button>
      </p>
    </div>

    <!-- Dica de hover -->
    <div
      v-if="hoveredNode && hoverInfo"
      class="pointer-events-none absolute z-10 max-w-[15rem] rounded-ep bg-ep-ink/90 px-2.5 py-1.5 text-xs text-ep-card"
      :style="{ left: `${hoverInfo.x + 12}px`, top: `${hoverInfo.y + 12}px` }"
      aria-hidden="true"
    >
      <p class="font-medium">{{ hoverInfo.label }}</p>
      <p class="text-[11px] text-ep-rule">{{ hoverInfo.detail }}</p>
    </div>

    <!-- Controles -->
    <div v-if="controls" class="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-ep border border-ep-rule">
      <button type="button" class="graph-btn" aria-label="Aproximar" title="Aproximar" @click="zoom(1 / 1.6)">+</button>
      <button type="button" class="graph-btn" aria-label="Afastar" title="Afastar" @click="zoom(1.6)">−</button>
      <button type="button" class="graph-btn" aria-label="Enquadrar a rede" title="Enquadrar" @click="fit(true)">
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
    <p v-if="controls" class="pointer-events-none absolute bottom-3 left-3 rounded-ep bg-ep-card/80 px-2 py-1 text-[11px] text-ep-muted" aria-live="polite">
      {{ visibleCount }} {{ visibleCount === 1 ? 'nó' : 'nós' }} · {{ visibleEdges }} {{ visibleEdges === 1 ? 'ligação' : 'ligações' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type Graphology from 'graphology'
import type Sigma from 'sigma'
import type { Graph, GraphEdge, GraphNode } from '../../lib/graph'
import { EDGE_LABEL, JURISDICTION_TYPE_LABEL, ORDER_LABEL } from '../../lib/labels'
import { CONTESTED_HALO, edgeAppearance, edgeGroup, nodeColor, type EdgeGroup } from '../../lib/style'

const props = withDefaults(defineProps<{
  graph: Graph
  /** Nó selecionado ("p:id" ou "j:id"). */
  selected: string | null
  /** 0 = sem foco; 1–3 = só a vizinhança do selecionado. */
  depth: number
  /** Mostra só o que existia até este ano (null = sem filtro). */
  year: number | null
  groups: Record<EdgeGroup, boolean>
  showPeople: boolean
  showJurisdictions: boolean
  /** false = só igrejas, províncias e comunhões; as ligações das dioceses sobem para a igreja. */
  showDioceses: boolean
  /** Das pessoas, só os bispos (a vizinhança de um nó selecionado mostra todo o clero). */
  onlyBishops: boolean
  /** 'brazil' = jurisdições brasileiras e seus bispos; 'all' = rede inteira. */
  scope: 'brazil' | 'all'
  /** Mostra zoom/enquadrar e a contagem sobre o grafo (o explorador os põe na barra de estado). */
  controls?: boolean
}>(), { controls: true })

const emit = defineEmits<{
  select: [id: string | null]
  /** Duplo clique: abrir a ficha. */
  open: [id: string]
  'reset-filters': []
  /** Quantos nós e ligações estão à vista (a cada redesenho). */
  counts: [nodes: number, edges: number]
  /** Primeiro ano com dados entre os nós que os filtros atuais (fora o ano) deixam à vista. */
  range: [firstYear: number | null]
}>()

type Pos = { x: number; y: number }
type Fa2 = typeof import('graphology-layout-forceatlas2').default
type GraphCtor = typeof import('graphology').default
type AnimateNodes = typeof import('sigma/utils').animateNodes

const container = ref<HTMLElement | null>(null)
const loading = ref(true)
const visibleCount = ref(0)
const visibleEdges = ref(0)
const hoveredNode = ref<string | null>(null)
const hoverInfo = ref<{ x: number; y: number; label: string; detail: string } | null>(null)

let sigma: Sigma | null = null
let g: Graphology | null = null
let GraphClass: GraphCtor | null = null
let forceAtlas2: Fa2 | null = null
let animateNodes: AnimateNodes | null = null
let cancelAnimation: (() => void) | null = null

let hoveredNeighbors = new Set<string>()
let focus: Set<string> | null = null
let selectedNeighbors = new Set<string>()
let visible = new Set<string>()
let forceAllJurisdictionLabels = false
/** Posições do layout global; o layout local parte sempre delas. */
const original = new Map<string, Pos>()
/** Nós deslocados pelo último layout local (para devolvê-los depois). */
let displaced = new Set<string>()
/** Réplica da normalização do Sigma (bbox fixa), para enquadrar posições-alvo antes da animação. */
let norm = { ratio: 1, dX: 0, dY: 0 }

const EDGE_SIZE: Record<string, number> = {
  consecration: 2.4,
  co_consecration: 1.2,
  presbyteral_ordination: 1,
  diaconal_ordination: 0.9,
  affiliation: 0.7
}
const HALO_EXTRA = 3.5
/** Cor dos vínculos na vista ampla: presentes, mas sem competir com as ordenações. */
const AFFILIATION_QUIET = 'rgba(120, 110, 95, 0.18)'
/** Rótulos curtos das arestas (aparecem ao passar o mouse). */
const EDGE_SHORT: Record<string, string> = {
  consecration: 'sagração',
  co_consecration: 'co-sagração',
  presbyteral_ordination: 'ord. presbiteral',
  diaconal_ordination: 'ord. diaconal',
  affiliation: 'vínculo',
  schism_from: 'cisma',
  successor_of: 'sucessão',
  merged_with: 'fusão',
  member_of: 'membro',
  part_of: 'parte',
  in_communion_with: 'comunhão',
  broke_communion_with: 'ruptura',
  recognized_by: 'reconhecimento'
}
/** Até quantos vizinhos vale forçar rótulos (acima disso, só a grade de densidade decide). */
const FORCE_LABELS_MAX = 14
/** Acima disso o layout local não compensa: usa as posições globais. */
const LOCAL_LAYOUT_MAX = 320
/** Acima disso a vista é "ampla": layout por aglomerados e arestas mais discretas. */
const WIDE_VIEW = 60
/** Peso das arestas no layout da vista ampla: a sucessão puxa mais que os vínculos. */
const LAYOUT_WEIGHT: Partial<Record<EdgeGroup, number>> = { ordinations: 1, relations: 1.5, affiliations: 0.25 }

function nodeInfo(n: GraphNode): string {
  if (n.kind === 'jurisdiction') return n.jurisdictionType ? JURISDICTION_TYPE_LABEL[n.jurisdictionType] : 'Jurisdição'
  if (!n.order) return 'Pessoa'
  return n.inferredOrder ? 'Bispo (inferido: sagrou outros ou ocupa cargo episcopal)' : ORDER_LABEL[n.order]
}

/** Vizinhança do nó selecionado até `depth` passos, seguindo só os tipos de aresta visíveis. */
function computeFocus() {
  focus = null
  selectedNeighbors = new Set()
  if (!g || !props.selected || !g.hasNode(props.selected)) return
  const graph = g
  selectedNeighbors = new Set(graph.neighbors(props.selected))
  if (props.depth === 0) return
  const seen = new Set([props.selected])
  let frontier = [props.selected]
  for (let step = 0; step < props.depth; step++) {
    const next: string[] = []
    for (const node of frontier) {
      // Jurisdições são hubs: depois do primeiro passo só sobem para a igreja a que pertencem
      // (diocese → província), senão a vizinhança vira a rede inteira.
      const hub = step > 0 && graph.getNodeAttribute(node, 'kind') === 'jurisdiction'
      graph.forEachEdge(node, (_edge, attrs, source, target) => {
        if (attrs.halo || !props.groups[attrs.group as EdgeGroup] || !levelShown(attrs)) return
        if (hub && !(attrs.kind === 'part_of' && source === node)) return
        const other = source === node ? target : source
        if (other !== props.selected && hiddenDiocese(graph.getNodeAttributes(other))) return
        if (!seen.has(other)) {
          seen.add(other)
          next.push(other)
        }
      })
    }
    frontier = next
  }
  focus = seen
}

/** Diocese escondida pelo interruptor "Dioceses". */
function hiddenDiocese(attrs: Record<string, unknown>): boolean {
  return !props.showDioceses && attrs.kind === 'jurisdiction' && !!attrs.diocesan
}

/** As cópias levadas para a igreja só valem com as dioceses ocultas (no lugar das originais). */
function levelShown(data: Record<string, unknown>): boolean {
  return !data.rollup || !props.showDioceses
}

function baseVisible(id: string, attrs: Record<string, unknown>, ignoreYear = false): boolean {
  if (id === props.selected) return true
  if (attrs.kind === 'person' && !props.showPeople) return false
  if (attrs.kind === 'jurisdiction' && !props.showJurisdictions) return false
  if (hiddenDiocese(attrs)) return false
  // Com o filtro de ano, quem não tem nenhuma data fica de fora: não dá para situá-lo no tempo.
  if (!ignoreYear && props.year !== null && (typeof attrs.startYear !== 'number' || attrs.startYear > props.year)) return false
  if (focus) return focus.has(id)
  // Núcleo brasileiro: jurisdições no Brasil e as pessoas ligadas a elas.
  if (props.scope === 'brazil' && !attrs.brazil) return false
  if (props.onlyBishops && attrs.kind === 'person' && attrs.order !== 'episcopate') return false
  // Nós sem nenhuma ligação só aparecem quando selecionados.
  if (attrs.isolated) return false
  return true
}

function edgeShown(data: Record<string, unknown>, source: string, target: string): boolean {
  if (!props.groups[data.group as EdgeGroup] || !levelShown(data)) return false
  if (props.year !== null && typeof data.year === 'number' && data.year > props.year) return false
  return visible.has(source) && visible.has(target)
}

/** Recalcula o conjunto visível, reorganiza o que está à vista e redesenha. */
function refresh(animate = true) {
  if (!g) return
  computeFocus()
  visible = new Set()
  g.forEachNode((id, attrs) => {
    if (baseVisible(id, attrs)) visible.add(id)
  })
  // Quem ficou sem nenhuma ligação à vista (os vizinhos foram filtrados) sairia solto no canvas.
  const linked = new Set<string>()
  g.forEachEdge((_e, attrs, s, t) => {
    if (!attrs.halo && edgeShown(attrs, s, t)) {
      linked.add(s)
      linked.add(t)
    }
  })
  for (const id of [...visible]) if (id !== props.selected && !linked.has(id)) visible.delete(id)
  let edges = 0
  g.forEachEdge((_e, attrs, s, t) => {
    if (!attrs.halo && edgeShown(attrs, s, t)) edges++
  })
  visibleCount.value = visible.size
  visibleEdges.value = edges
  emit('counts', visible.size, edges)
  let firstYear = Infinity
  g.forEachNode((id, attrs) => {
    if (typeof attrs.startYear === 'number' && attrs.startYear < firstYear && baseVisible(id, attrs, true)) firstYear = attrs.startYear
  })
  emit('range', Number.isFinite(firstYear) ? firstYear : null)
  forceAllJurisdictionLabels = visible.size <= WIDE_VIEW
  relayout(animate)
  sigma?.refresh()
}

/**
 * Layout local: o subgrafo visível é reorganizado a partir das posições globais,
 * para que a vizinhança escolhida fique legível. Sem foco nem recorte, volta ao global.
 */
function relayout(animate: boolean) {
  if (!g || !GraphClass || !forceAtlas2) return
  const graph = g
  const targets: Record<string, Pos> = {}
  const nowDisplaced = new Set<string>()

  if (visible.size > 0 && visible.size < graph.order && visible.size <= LOCAL_LAYOUT_MAX) {
    const sub = new GraphClass()
    for (const id of visible) {
      const o = original.get(id)!
      sub.addNode(id, { x: o.x, y: o.y, size: graph.getNodeAttribute(id, 'size') })
    }
    graph.forEachEdge((_e, attrs, s, t) => {
      if (!attrs.halo && levelShown(attrs) && visible.has(s) && visible.has(t) && !sub.hasEdge(s, t) && !sub.hasEdge(t, s)) sub.addEdge(s, t, { weight: LAYOUT_WEIGHT[attrs.group as EdgeGroup] ?? 1 })
    })
    if (sub.size > 0 && visible.size > WIDE_VIEW) {
      // Vista ampla (núcleo brasileiro): LinLog separa os aglomerados (igrejas e suas linhas de
      // sucessão) em vez de comprimir tudo num disco; a segunda passada afasta nós sobrepostos.
      const inferred = forceAtlas2.inferSettings(sub)
      forceAtlas2.assign(sub, { iterations: 500, settings: { ...inferred, barnesHutOptimize: false, linLogMode: true, scalingRatio: 30, gravity: 0.08, outboundAttractionDistribution: true, edgeWeightInfluence: 1, slowDown: 3 } })
      forceAtlas2.assign(sub, { iterations: 150, settings: { ...inferred, barnesHutOptimize: false, linLogMode: true, scalingRatio: 30, gravity: 0.08, outboundAttractionDistribution: true, edgeWeightInfluence: 1, adjustSizes: true, slowDown: 5 } })
    } else if (sub.size > 0) {
      forceAtlas2.assign(sub, {
        iterations: 200,
        settings: { ...forceAtlas2.inferSettings(sub), barnesHutOptimize: false, scalingRatio: 60, gravity: 0.8, strongGravityMode: true, adjustSizes: true, slowDown: 2 }
      })
    }
    sub.forEachNode((id, a) => {
      targets[id] = { x: a.x, y: a.y }
      nowDisplaced.add(id)
    })
  }
  // Quem saiu da vista volta para a posição global.
  for (const id of displaced) if (!nowDisplaced.has(id)) targets[id] = original.get(id)!
  if (nowDisplaced.size === 0) for (const id of displaced) targets[id] = original.get(id)!
  displaced = nowDisplaced

  cancelAnimation?.()
  cancelAnimation = null
  if (animate && animateNodes) {
    cancelAnimation = animateNodes(graph, targets, { duration: 550, easing: 'quadraticInOut' })
  } else {
    for (const [id, p] of Object.entries(targets)) graph.mergeNodeAttributes(id, p)
  }
  fit(animate, targets)
}

/** Enquadra os nós visíveis (nas posições-alvo, se houver animação em curso) com transição suave. */
function fit(animate = true, targets: Record<string, Pos> = {}) {
  if (!sigma || !g) return
  const graph = g
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of visible) {
    const p = targets[id] ?? { x: graph.getNodeAttribute(id, 'x') as number, y: graph.getNodeAttribute(id, 'y') as number }
    const x = 0.5 + (p.x - norm.dX) / norm.ratio
    const y = 0.5 + (p.y - norm.dY) / norm.ratio
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  if (!Number.isFinite(minX)) {
    sigma.getCamera().animatedReset({ duration: animate ? 500 : 0 })
    return
  }
  const { width, height } = sigma.getDimensions()
  const smallest = Math.min(width, height) || 1
  const spanX = (maxX - minX) / (width / smallest)
  const spanY = (maxY - minY) / (height / smallest)
  const ratio = Math.min(1.2, Math.max(0.05, Math.max(spanX, spanY) * 1.3 + 0.03))
  const state = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, ratio }
  if (animate) sigma.getCamera().animate(state, { duration: 650, easing: 'quadraticInOut' })
  else sigma.getCamera().setState(state)
}

function zoom(factor: number) {
  const camera = sigma?.getCamera()
  camera?.animate({ ratio: camera.ratio * factor }, { duration: 250 })
}

defineExpose({
  fit: (animate = true) => fit(animate),
  zoom,
  // resize() só ajusta os canvases (e os limpa); sem refresh() o grafo fica em branco até a próxima interação.
  resize: () => {
    sigma?.resize()
    sigma?.refresh()
  }
})

onMounted(async () => {
  const [{ default: SigmaClass }, { default: GraphCtorImport }, { default: fa2 }, utils] = await Promise.all([
    import('sigma'),
    import('graphology'),
    import('graphology-layout-forceatlas2'),
    import('sigma/utils')
  ])
  if (!container.value) return
  GraphClass = GraphCtorImport
  forceAtlas2 = fa2
  animateNodes = utils.animateNodes

  const graph: Graphology = new GraphCtorImport({ multi: true, type: 'directed' })
  const degree = new Map<string, number>()
  for (const e of props.graph.edges) {
    if (e.rollup) continue
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const nodes = props.graph.nodes
  const jurisdictions = nodes.filter((n) => n.kind === 'jurisdiction')
  const people = nodes.filter((n) => n.kind === 'person')
  // Posição inicial determinística: jurisdições num anel interno, pessoas num anel externo.
  const ring = (list: GraphNode[], radius: number) =>
    list.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / (list.length || 1)
      const deg = degree.get(n.id) ?? 0
      graph.addNode(n.id, {
        // Nomes longos poluem o canvas; o nome completo fica na dica e no painel.
        label: n.label.length > 30 ? `${n.label.slice(0, 28).trimEnd()}…` : n.label,
        fullLabel: n.label,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        color: nodeColor(n),
        kind: n.kind,
        order: n.order,
        startYear: n.startYear,
        brazil: !!n.brazil,
        isolated: deg === 0,
        diocesan: !!n.diocesan,
        info: nodeInfo(n),
        size: Math.min(18, (n.kind === 'jurisdiction' ? 5.5 : 3) + Math.sqrt(deg) * 1.4)
      })
    })
  ring(jurisdictions, 60)
  ring(people, 140)

  const addEdge = (e: GraphEdge, i: number) => {
    if (!graph.hasNode(e.from) || !graph.hasNode(e.to)) return
    const group = edgeGroup(e.kind)
    const look = edgeAppearance(e.kind, e.status)
    const size = EDGE_SIZE[e.kind] ?? 1.6
    const key = `e${i}`
    const label = [EDGE_SHORT[e.kind] ?? EDGE_LABEL[e.kind].toLowerCase(), e.year ? String(e.year) : '', look.label ? `· ${look.label}` : ''].filter(Boolean).join(' ')
    if (look.halo) {
      graph.addEdgeWithKey(`h${i}`, e.from, e.to, { halo: true, parent: key, group, year: e.year, rollup: e.rollup, color: CONTESTED_HALO, size: size + HALO_EXTRA, type: 'line', zIndex: 0 })
    }
    graph.addEdgeWithKey(key, e.from, e.to, {
      kind: e.kind,
      group,
      year: e.year,
      status: e.status,
      color: look.color,
      size,
      label,
      type: group === 'affiliations' ? 'line' : 'arrow',
      rollup: e.rollup,
      zIndex: 1
    })
  }
  // As cópias levadas para a igreja entram depois do layout global, para não puxar os nós duas vezes.
  props.graph.edges.forEach((e, i) => {
    if (!e.rollup) addEdge(e, i)
  })

  // Layout global: LinLog separa os aglomerados; a segunda passada evita sobreposição.
  const inferred = fa2.inferSettings(graph)
  fa2.assign(graph, {
    iterations: 300,
    settings: { ...inferred, barnesHutOptimize: graph.order > 300, scalingRatio: 20, gravity: 0.6, linLogMode: true, edgeWeightInfluence: 0 }
  })
  fa2.assign(graph, {
    iterations: 120,
    settings: { ...inferred, barnesHutOptimize: false, scalingRatio: 20, gravity: 0.6, linLogMode: true, adjustSizes: true, edgeWeightInfluence: 0 }
  })
  props.graph.edges.forEach((e, i) => {
    if (e.rollup) addEdge(e, i)
  })
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  graph.forEachNode((id, a) => {
    original.set(id, { x: a.x, y: a.y })
    minX = Math.min(minX, a.x)
    maxX = Math.max(maxX, a.x)
    minY = Math.min(minY, a.y)
    maxY = Math.max(maxY, a.y)
  })
  // Bbox fixa: a normalização não muda quando o layout local desloca nós.
  const margin = Math.max(maxX - minX, maxY - minY) * 0.6 || 1
  const bbox = { x: [minX - margin, maxX + margin] as [number, number], y: [minY - margin, maxY + margin] as [number, number] }
  norm = { ratio: Math.max(bbox.x[1] - bbox.x[0], bbox.y[1] - bbox.y[0]) || 1, dX: (bbox.x[0] + bbox.x[1]) / 2, dY: (bbox.y[0] + bbox.y[1]) / 2 }

  g = graph
  sigma = new SigmaClass(graph, container.value, {
    renderEdgeLabels: true,
    labelFont: '"IBM Plex Sans", system-ui, sans-serif',
    labelSize: 12,
    labelWeight: '500',
    labelColor: { color: '#15130f' },
    labelRenderedSizeThreshold: 6,
    labelDensity: 0.6,
    labelGridCellSize: 120,
    edgeLabelFont: '"IBM Plex Sans", system-ui, sans-serif',
    edgeLabelSize: 10,
    edgeLabelColor: { color: '#4f483d' },
    hideEdgesOnMove: graph.size > 600,
    zIndex: true,
    minCameraRatio: 0.02,
    maxCameraRatio: 1.6,
    stagePadding: 24,
    // Tamanho dos nós fixo em pixels: aproximar a câmera não os infla.
    zoomToSizeRatioFunction: () => 1,
    nodeReducer: (node, data) => {
      const res: Record<string, unknown> = { ...data }
      if (!visible.has(node)) {
        res.hidden = true
        return res
      }
      const isSelected = node === props.selected
      const nearSelected = selectedNeighbors.has(node)
      if (isSelected) {
        res.highlighted = true
        res.zIndex = 3
        res.size = (data.size as number) * 1.25
        res.forceLabel = true
      } else if (nearSelected) {
        res.forceLabel = selectedNeighbors.size <= FORCE_LABELS_MAX || data.kind === 'jurisdiction'
        res.zIndex = 2
      } else if (data.kind === 'jurisdiction' && forceAllJurisdictionLabels) {
        res.forceLabel = true
      }
      if (hoveredNode.value && node !== hoveredNode.value && !hoveredNeighbors.has(node)) {
        res.color = '#e2dccf'
        res.label = ''
        res.forceLabel = false
        res.zIndex = 0
      } else if (hoveredNode.value) {
        res.forceLabel = node === hoveredNode.value || hoveredNeighbors.size <= FORCE_LABELS_MAX
        res.zIndex = 2
      }
      return res
    },
    edgeReducer: (edge, data) => {
      const res: Record<string, unknown> = { ...data }
      const [source, target] = graph.extremities(edge)
      const shown = edgeShown(data, source, target)
      const hovered = hoveredNode.value
      if (!shown || (hovered && source !== hovered && target !== hovered)) {
        res.hidden = true
        return res
      }
      const touchesSelected = props.selected && (source === props.selected || target === props.selected)
      if (data.halo) {
        // Na vista ampla sem foco o halo das contestadas vira ruído; volta ao selecionar.
        if (!hovered && !props.selected && visible.size > WIDE_VIEW) res.hidden = true
        if (touchesSelected) res.size = (data.size as number) + 1.5
        return res
      }
      // Rótulos de aresta só ao passar o mouse (e em vizinhanças pequenas), para não poluir:
      // o Sigma desenha o rótulo sempre que as duas pontas têm rótulo, então zeramos o texto.
      let showLabel = false
      if (hovered) {
        res.size = (data.size as number) * 1.5
        res.zIndex = 2
        showLabel = hoveredNeighbors.size <= 10
      } else if (touchesSelected) {
        res.size = (data.size as number) * 1.8
        res.zIndex = 2
        showLabel = selectedNeighbors.size <= 6
      }
      res.label = showLabel ? data.label : ''
      res.forceLabel = showLabel
      // Vista ampla sem foco: vínculos e relações recuam para as linhas de sucessão aparecerem.
      if (!hovered && !props.selected && visible.size > WIDE_VIEW) {
        if (data.group === 'affiliations') {
          res.color = AFFILIATION_QUIET
          res.size = (data.size as number) * 0.7
        } else {
          res.size = (data.size as number) * 0.75
        }
      }
      return res
    }
  })
  sigma.setCustomBBox(bbox)

  sigma.on('clickNode', ({ node }) => emit('select', node))
  sigma.on('doubleClickNode', ({ node, event }) => {
    event.preventSigmaDefault()
    emit('open', node)
  })
  sigma.on('clickStage', () => emit('select', null))
  sigma.on('enterNode', ({ node, event }) => {
    hoveredNode.value = node
    hoveredNeighbors = new Set(graph.neighbors(node))
    hoverInfo.value = { x: event.x, y: event.y, label: graph.getNodeAttribute(node, 'fullLabel'), detail: graph.getNodeAttribute(node, 'info') }
    sigma?.refresh()
  })
  sigma.on('moveBody', ({ event }) => {
    if (hoverInfo.value) hoverInfo.value = { ...hoverInfo.value, x: event.x, y: event.y }
  })
  sigma.on('leaveNode', () => {
    hoveredNode.value = null
    hoverInfo.value = null
    hoveredNeighbors = new Set()
    sigma?.refresh()
  })

  loading.value = false
  refresh(false)
})

watch(
  () => [props.depth, props.year, props.showPeople, props.showJurisdictions, props.showDioceses, props.onlyBishops, props.scope, props.groups.ordinations, props.groups.affiliations, props.groups.relations, props.selected],
  () => refresh(true)
)

onBeforeUnmount(() => {
  cancelAnimation?.()
  sigma?.kill()
  sigma = null
  g = null
})
</script>

<style scoped>
.graph-btn {
  @apply flex h-8 w-8 items-center justify-center border-b border-ep-rule bg-ep-card text-[15px] text-ep-ink-3 last:border-b-0 hover:text-ep-ink;
}
</style>
