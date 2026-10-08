import type { EdgeKind, GraphNode } from './graph'

/** Cores do grafo e da legenda (papel e tinta: granada para pessoas, petróleo para jurisdições). */
export const NODE_COLORS = {
  episcopate: '#8b2e1f',
  presbyterate: '#475569',
  diaconate: '#94a3b8',
  person: '#b8b0a0',
  church: '#1f4e5f',
  diocese: '#4d8494',
  communion: '#5b4a7a'
} as const

export const NODE_LEGEND: { color: string; label: string }[] = [
  { color: NODE_COLORS.episcopate, label: 'Bispo' },
  { color: NODE_COLORS.presbyterate, label: 'Presbítero' },
  { color: NODE_COLORS.diaconate, label: 'Diácono' },
  { color: NODE_COLORS.church, label: 'Igreja / província' },
  { color: NODE_COLORS.diocese, label: 'Diocese / distrito' },
  { color: NODE_COLORS.communion, label: 'Comunhão / rede' }
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
    case 'consecration': return '#8b2e1f'
    case 'co_consecration': return '#b8862b'
    case 'presbyteral_ordination':
    case 'diaconal_ordination': return '#94a3b8'
    case 'affiliation': return '#c9c1af'
    case 'schism_from':
    case 'broke_communion_with': return '#b42318'
    case 'successor_of':
    case 'merged_with': return '#5b4a7a'
    default: return '#1f4e5f'
  }
}

export const EDGE_LEGEND: { color: string; label: string }[] = [
  { color: '#8b2e1f', label: 'Sagração (principal)' },
  { color: '#b8862b', label: 'Co-sagração' },
  { color: '#94a3b8', label: 'Ordenação' },
  { color: '#c9c1af', label: 'Vínculo' },
  { color: '#b42318', label: 'Cisma / ruptura' },
  { color: '#5b4a7a', label: 'Sucessão / fusão' },
  { color: '#1f4e5f', label: 'Filiação / comunhão' }
]

/** "p:miguel-uchoa" → "/episcopado/pessoa/miguel-uchoa". */
export function nodeRoute(nodeId: string): string {
  const [kind, id] = [nodeId.slice(0, 1), nodeId.slice(2)]
  return kind === 'p' ? `/episcopado/pessoa/${id}` : `/episcopado/jurisdicao/${id}`
}

/** Rota da ficha de uma fonte. */
export const sourceRoute = (id: string) => `/episcopado/fonte/${id}`

/** Selos de status: versalete mono com contorno na cor do status (classes Tailwind) e cor do ponto. */
export const STATUS_STYLE = {
  confirmed: { badge: 'text-ep-green border-ep-green/40', dot: '#2f5d3a', glyph: '✓' },
  probable: { badge: 'text-ep-garnet-ink border-ep-garnet-ink/40', dot: '#6f2418', glyph: '~' },
  contested: { badge: 'text-ep-red border-ep-red/40', dot: '#8a1c12', glyph: '!' }
} as const

/** Nível da fonte: fundo e texto do selo. */
export const LEVEL_CLASS = {
  primary: 'bg-ep-green-soft text-ep-green',
  secondary: 'bg-ep-teal-soft text-ep-teal',
  tertiary: 'bg-ep-line-2 text-ep-body'
} as const

/** Halo vermelho desenhado por baixo das arestas contestadas. */
export const CONTESTED_HALO = '#b4231855'

/**
 * Aparência de uma aresta no grafo conforme o status: a cor diz o tipo, o status
 * entra como transparência (provável) ou como halo vermelho (contestada, ver `EpiscopadoGraph`).
 */
export function edgeAppearance(kind: EdgeKind, status: 'confirmed' | 'probable' | 'contested'): { color: string; label: string; halo: boolean } {
  const base = edgeColor(kind)
  if (status === 'probable') return { color: `${base}88`, label: 'provável', halo: false }
  if (status === 'contested') return { color: base, label: 'contestada', halo: true }
  return { color: base, label: '', halo: false }
}
