import Graphology from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Graph } from './graph'
import { edgeGroup, type EdgeGroup } from './style'

/**
 * Posições globais do grafo, calculadas no servidor com o mesmo ForceAtlas2 do site,
 * para que o app não precise rodar o layout no aparelho. Determinístico: as posições
 * iniciais vêm de um hash do id, então o mesmo grafo dá sempre o mesmo desenho.
 */

export type LayoutScope = 'brazil' | 'all'

export interface Positions {
  scope: LayoutScope
  /** id do nó → [x, y], num espaço arbitrário (o app enquadra). */
  nodes: Record<string, [number, number]>
}

/** Peso das arestas no layout: a sucessão puxa mais que os vínculos (igual ao site). */
const LAYOUT_WEIGHT: Record<EdgeGroup, number> = { ordinations: 1, relations: 1.5, affiliations: 0.25 }

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** Quais nós entram no layout de cada abrangência (igual à vista inicial do site). */
export function inScope(node: Graph['nodes'][number], scope: LayoutScope): boolean {
  if (scope === 'all') return true
  return !!node.brazil
}

export function layoutPositions(graph: Graph, scope: LayoutScope, iterations = 400): Positions {
  const g = new Graphology({ type: 'undirected', multi: false })
  const degree = new Map<string, number>()
  for (const e of graph.edges) {
    if (e.rollup) continue
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  for (const n of graph.nodes) {
    if (!inScope(n, scope) || !degree.has(n.id)) continue
    const angle = hash(n.id) * Math.PI * 2
    const radius = 100 + hash(`${n.id}#r`) * 900
    g.addNode(n.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, size: 2 + Math.sqrt(degree.get(n.id) ?? 1) * 1.5 })
  }
  for (const e of graph.edges) {
    if (e.rollup || !g.hasNode(e.from) || !g.hasNode(e.to) || e.from === e.to || g.hasEdge(e.from, e.to)) continue
    g.addEdge(e.from, e.to, { weight: LAYOUT_WEIGHT[edgeGroup(e.kind)] })
  }
  if (g.order > 0) {
    const inferred = forceAtlas2.inferSettings(g)
    const settings = { ...inferred, linLogMode: true, scalingRatio: 30, gravity: 0.08, outboundAttractionDistribution: true, edgeWeightInfluence: 1, barnesHutOptimize: g.order > 300 }
    forceAtlas2.assign(g, { iterations, getEdgeWeight: 'weight', settings: { ...settings, slowDown: 3 } })
    forceAtlas2.assign(g, { iterations: Math.round(iterations / 4), getEdgeWeight: 'weight', settings: { ...settings, adjustSizes: true, slowDown: 5 } })
  }
  const nodes: Record<string, [number, number]> = {}
  g.forEachNode((id, a) => {
    nodes[id] = [Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100]
  })
  return { scope, nodes }
}
