import type { EdgeKind, Graph, GraphEdge } from './graph'
import { edgeGroup } from './style'

/**
 * Caminho mais curto entre dois nós da rede ("como X e Y se ligam?").
 * Busca em largura sobre o grafo sem direção; cada passo diz por qual ligação se chegou.
 */

export type PathMode = 'ordinations' | 'all'

export interface PathStep {
  id: string
  /** Ligação que levou do passo anterior a este (vazia no primeiro). */
  via?: { kind: EdgeKind; status: GraphEdge['status']; year?: number; /** true quando a aresta aponta deste nó para o anterior. */ reversed: boolean }
}

export interface PathResult {
  from: string
  to: string
  mode: PathMode
  steps: PathStep[]
}

function allowed(edge: GraphEdge, mode: PathMode): boolean {
  if (edge.rollup) return false
  return mode === 'all' || edgeGroup(edge.kind) === 'ordinations'
}

/** Vizinhança indexada uma vez por grafo (os grafos são imutáveis depois do build). */
const adjacencyCache = new WeakMap<Graph, Map<PathMode, Map<string, { other: string; edge: GraphEdge }[]>>>()

function adjacency(graph: Graph, mode: PathMode): Map<string, { other: string; edge: GraphEdge }[]> {
  let byMode = adjacencyCache.get(graph)
  if (!byMode) {
    byMode = new Map()
    adjacencyCache.set(graph, byMode)
  }
  let adj = byMode.get(mode)
  if (adj) return adj
  adj = new Map()
  for (const edge of graph.edges) {
    if (!allowed(edge, mode)) continue
    adj.set(edge.from, [...(adj.get(edge.from) ?? []), { other: edge.to, edge }])
    adj.set(edge.to, [...(adj.get(edge.to) ?? []), { other: edge.from, edge }])
  }
  byMode.set(mode, adj)
  return adj
}

/**
 * Caminho mais curto entre `from` e `to` (ids "p:…"/"j:…"). `null` quando não há caminho
 * ou algum dos nós não existe. Com `mode: 'ordinations'` só sagrações e ordenações contam.
 */
export function shortestPath(graph: Graph, from: string, to: string, mode: PathMode = 'all'): PathResult | null {
  const ids = new Set(graph.nodes.map((n) => n.id))
  if (!ids.has(from) || !ids.has(to)) return null
  if (from === to) return { from, to, mode, steps: [{ id: from }] }
  const adj = adjacency(graph, mode)
  const prev = new Map<string, { id: string; edge: GraphEdge } | null>([[from, null]])
  const queue = [from]
  let found = false
  while (queue.length && !found) {
    const current = queue.shift()!
    for (const { other, edge } of adj.get(current) ?? []) {
      if (prev.has(other)) continue
      prev.set(other, { id: current, edge })
      if (other === to) {
        found = true
        break
      }
      queue.push(other)
    }
  }
  if (!found) return null
  const steps: PathStep[] = []
  let cursor: string | null = to
  while (cursor) {
    const link = prev.get(cursor) ?? null
    steps.unshift(
      link
        ? { id: cursor, via: { kind: link.edge.kind, status: link.edge.status, year: link.edge.year, reversed: link.edge.from === cursor } }
        : { id: cursor }
    )
    cursor = link?.id ?? null
  }
  return { from, to, mode, steps }
}
