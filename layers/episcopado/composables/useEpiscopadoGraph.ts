import type { Graph } from '../lib/graph'

/** Grafo completo da rede (alimenta o explorador e a busca). */
export function useEpiscopadoGraph() {
  return useFetch<Graph>('/api/episcopado/graph', {
    key: 'episcopado-graph',
    default: () => ({ nodes: [], edges: [] })
  })
}
