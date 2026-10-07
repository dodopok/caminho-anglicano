<template>
  <div class="relative w-full h-full">
    <div ref="container" class="absolute inset-0" />
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-stone-500 text-sm">
      Montando a rede…
    </div>
    <div class="absolute bottom-3 right-3 flex flex-col gap-1">
      <button type="button" class="graph-btn" aria-label="Aproximar" @click="zoom(1 / 1.5)">+</button>
      <button type="button" class="graph-btn" aria-label="Afastar" @click="zoom(1.5)">−</button>
      <button type="button" class="graph-btn text-xs" aria-label="Enquadrar a rede" @click="reset">⤢</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type Graphology from 'graphology'
import type Sigma from 'sigma'
import type { Graph } from '../../lib/graph'
import { edgeColor, edgeGroup, nodeColor, type EdgeGroup } from '../../lib/style'

const props = defineProps<{
  graph: Graph
  /** Nó selecionado ("p:id" ou "j:id"). */
  selected: string | null
  /** 0 = rede inteira; 1–3 = só a vizinhança do selecionado. */
  depth: number
  /** Mostra só o que existia até este ano (null = sem filtro). */
  year: number | null
  groups: Record<EdgeGroup, boolean>
  showPeople: boolean
  showJurisdictions: boolean
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

const container = ref<HTMLElement | null>(null)
const loading = ref(true)

let sigma: Sigma | null = null
let sigmaGraph: Graphology | null = null
let hovered: string | null = null
let hoveredNeighbors = new Set<string>()
let focus: Set<string> | null = null

const EDGE_SIZE: Record<string, number> = {
  consecration: 2.2,
  co_consecration: 1.2,
  presbyteral_ordination: 1,
  diaconal_ordination: 0.8,
  affiliation: 0.6
}

function nodeVisible(id: string, attrs: Record<string, unknown>): boolean {
  if (attrs.kind === 'person' && !props.showPeople) return false
  if (attrs.kind === 'jurisdiction' && !props.showJurisdictions) return false
  if (props.year !== null && typeof attrs.startYear === 'number' && attrs.startYear > props.year) return false
  if (focus && !focus.has(id)) return false
  return true
}

/** Vizinhança do nó selecionado até `depth` passos, seguindo só os tipos de aresta visíveis. */
function computeFocus() {
  focus = null
  if (!sigmaGraph || !props.selected || props.depth === 0 || !sigmaGraph.hasNode(props.selected)) return
  const g = sigmaGraph
  const seen = new Set([props.selected])
  let frontier = [props.selected]
  for (let step = 0; step < props.depth; step++) {
    const next: string[] = []
    for (const node of frontier) {
      g.forEachEdge(node, (_edge, attrs, source, target) => {
        if (!props.groups[attrs.group as EdgeGroup]) return
        const other = source === node ? target : source
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

function refresh() {
  computeFocus()
  sigma?.refresh()
}

function centerOn(id: string | null) {
  if (!sigma || !id || !sigmaGraph?.hasNode(id)) return
  const pos = sigma.getNodeDisplayData(id)
  if (pos) sigma.getCamera().animate({ x: pos.x, y: pos.y, ratio: props.depth > 0 ? 0.8 : 0.35 }, { duration: 500 })
}

function zoom(factor: number) {
  const camera = sigma?.getCamera()
  camera?.animate({ ratio: camera.ratio * factor }, { duration: 250 })
}

function reset() {
  sigma?.getCamera().animatedReset({ duration: 400 })
}

onMounted(async () => {
  const [{ default: SigmaClass }, { default: GraphClass }, { default: forceAtlas2 }] = await Promise.all([
    import('sigma'),
    import('graphology'),
    import('graphology-layout-forceatlas2')
  ])
  if (!container.value) return

  const g: Graphology = new GraphClass({ multi: true, type: 'directed' })
  const total = props.graph.nodes.length || 1
  props.graph.nodes.forEach((n, i) => {
    // Posição inicial determinística (círculo); o ForceAtlas2 organiza a partir daí.
    const angle = (2 * Math.PI * i) / total
    g.addNode(n.id, {
      label: n.label,
      x: Math.cos(angle) * 100,
      y: Math.sin(angle) * 100,
      color: nodeColor(n),
      kind: n.kind,
      startYear: n.startYear
    })
  })
  props.graph.edges.forEach((e, i) => {
    if (!g.hasNode(e.from) || !g.hasNode(e.to)) return
    const group = edgeGroup(e.kind)
    g.addEdgeWithKey(`e${i}`, e.from, e.to, {
      kind: e.kind,
      group,
      year: e.year,
      status: e.status,
      color: edgeColor(e.kind),
      size: EDGE_SIZE[e.kind] ?? 1.6,
      type: group === 'affiliations' ? 'line' : 'arrow'
    })
  })
  g.forEachNode((node, attrs) => {
    const degree = g.degree(node)
    g.setNodeAttribute(node, 'size', (attrs.kind === 'jurisdiction' ? 7 : 3.5) + Math.sqrt(degree) * 1.6)
  })

  forceAtlas2.assign(g, {
    iterations: 400,
    settings: { ...forceAtlas2.inferSettings(g), barnesHutOptimize: g.order > 400, scalingRatio: 8, gravity: 0.8 }
  })

  sigmaGraph = g
  sigma = new SigmaClass(g, container.value, {
    renderEdgeLabels: false,
    labelFont: 'Inter, sans-serif',
    labelSize: 12,
    labelColor: { color: '#292524' },
    labelRenderedSizeThreshold: 7,
    zIndex: true,
    minCameraRatio: 0.03,
    maxCameraRatio: 6,
    nodeReducer: (node, data) => {
      const res: Record<string, unknown> = { ...data }
      if (!nodeVisible(node, data)) {
        res.hidden = true
        return res
      }
      if (node === props.selected) {
        res.highlighted = true
        res.zIndex = 2
      }
      if (hovered && node !== hovered && !hoveredNeighbors.has(node)) {
        res.color = '#e7e5e4'
        res.label = ''
        res.zIndex = 0
      } else if (hovered) {
        res.forceLabel = true
        res.zIndex = 1
      }
      return res
    },
    edgeReducer: (edge, data) => {
      const res: Record<string, unknown> = { ...data }
      const [source, target] = g.extremities(edge)
      const hide =
        !props.groups[data.group as EdgeGroup] ||
        (props.year !== null && typeof data.year === 'number' && data.year > props.year) ||
        !nodeVisible(source, g.getNodeAttributes(source)) ||
        !nodeVisible(target, g.getNodeAttributes(target))
      if (hide || (hovered && source !== hovered && target !== hovered)) {
        res.hidden = true
      } else if (props.selected && (source === props.selected || target === props.selected)) {
        res.size = (data.size as number) * 1.8
        res.zIndex = 1
      }
      return res
    }
  })

  sigma.on('clickNode', ({ node }) => emit('select', node))
  sigma.on('clickStage', () => emit('select', null))
  sigma.on('enterNode', ({ node }) => {
    hovered = node
    hoveredNeighbors = new Set(g.neighbors(node))
    sigma?.refresh()
  })
  sigma.on('leaveNode', () => {
    hovered = null
    hoveredNeighbors = new Set()
    sigma?.refresh()
  })

  loading.value = false
  refresh()
  centerOn(props.selected)
})

watch(() => [props.depth, props.year, props.showPeople, props.showJurisdictions, props.groups.ordinations, props.groups.affiliations, props.groups.relations], refresh)
watch(() => props.selected, (id) => {
  refresh()
  centerOn(id)
})

onBeforeUnmount(() => {
  sigma?.kill()
  sigma = null
  sigmaGraph = null
})
</script>

<style scoped>
.graph-btn {
  @apply w-8 h-8 flex items-center justify-center bg-white/90 border border-stone-200 rounded-lg text-stone-600 shadow-sm hover:bg-white hover:text-stone-900;
}
</style>
