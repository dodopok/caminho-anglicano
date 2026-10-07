import type { EdgeKind, GraphNode } from './graph'

/** Cores do grafo e da legenda (paleta do site: âmbar/pedra + teal para jurisdições). */
export const NODE_COLORS = {
  episcopate: '#b45309',
  presbyterate: '#475569',
  diaconate: '#94a3b8',
  person: '#cbd5e1',
  church: '#0f766e',
  diocese: '#2dd4bf',
  communion: '#4f46e5'
} as const

export const NODE_LEGEND: { color: string; label: string }[] = [
  { color: NODE_COLORS.episcopate, label: 'Bispo' },
  { color: NODE_COLORS.presbyterate, label: 'Presbítero' },
  { color: NODE_COLORS.diaconate, label: 'Diácono' },
  { color: NODE_COLORS.church, label: 'Igreja / província' },
  { color: NODE_COLORS.diocese, label: 'Diocese / distrito' },
  { color: NODE_COLORS.communion, label: 'Comunhão' }
]

export function nodeColor(node: GraphNode): string {
  if (node.kind === 'person') return node.order ? NODE_COLORS[node.order] : NODE_COLORS.person
  if (node.jurisdictionType === 'communion' || node.jurisdictionType === 'network') return NODE_COLORS.communion
  if (node.jurisdictionType === 'diocese' || node.jurisdictionType === 'missionary_district') return NODE_COLORS.diocese
  return NODE_COLORS.church
}

export type EdgeGroup = 'ordinations' | 'affiliations' | 'relations'

export function edgeGroup(kind: EdgeKind): EdgeGroup {
  if (kind === 'affiliation') return 'affiliations'
  if (kind === 'consecration' || kind === 'co_consecration' || kind === 'presbyteral_ordination' || kind === 'diaconal_ordination') {
    return 'ordinations'
  }
  return 'relations'
}

export function edgeColor(kind: EdgeKind): string {
  switch (kind) {
    case 'consecration': return '#b45309'
    case 'co_consecration': return '#fbbf24'
    case 'presbyteral_ordination':
    case 'diaconal_ordination': return '#94a3b8'
    case 'affiliation': return '#e2e8f0'
    case 'schism_from':
    case 'broke_communion_with': return '#dc2626'
    case 'successor_of':
    case 'merged_with': return '#7c3aed'
    default: return '#5eead4'
  }
}

export const EDGE_LEGEND: { color: string; label: string }[] = [
  { color: '#b45309', label: 'Sagração (principal)' },
  { color: '#fbbf24', label: 'Co-sagração' },
  { color: '#94a3b8', label: 'Ordenação' },
  { color: '#e2e8f0', label: 'Vínculo' },
  { color: '#dc2626', label: 'Cisma / ruptura' },
  { color: '#7c3aed', label: 'Sucessão / fusão' },
  { color: '#5eead4', label: 'Filiação / comunhão' }
]

/** "p:miguel-uchoa" → "/episcopado/pessoa/miguel-uchoa". */
export function nodeRoute(nodeId: string): string {
  const [kind, id] = [nodeId.slice(0, 1), nodeId.slice(2)]
  return kind === 'p' ? `/episcopado/pessoa/${id}` : `/episcopado/jurisdicao/${id}`
}
