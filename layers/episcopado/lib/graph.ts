import { yearOf } from './dates'
import type { Base, TJurisdiction, TOrdination, TRelation } from './schemas'

export type NodeKind = 'person' | 'jurisdiction'

export type EdgeKind =
  | 'consecration'
  | 'co_consecration'
  | 'presbyteral_ordination'
  | 'diaconal_ordination'
  | 'affiliation'
  | TRelation['type']

export interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  /** Texto extra para a busca (aliases, nome completo, sigla). */
  search: string[]
  startYear?: number
  endYear?: number
  color?: string
  /** Pessoa: ordem mais alta registrada. */
  order?: TOrdination['order']
  /** Jurisdição: tipo (igreja nacional, diocese...). */
  jurisdictionType?: TJurisdiction['type']
  country?: string
}

export interface GraphEdge {
  /** Para ordenações: quem ordenou → quem foi ordenado. */
  from: string
  to: string
  kind: EdgeKind
  status: 'confirmed' | 'probable' | 'contested'
  year?: number
  label?: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Prefixa ids para que pessoa e jurisdição com o mesmo slug não colidam. */
export const nodeId = (kind: NodeKind, id: string) => `${kind === 'person' ? 'p' : 'j'}:${id}`

const compact = (values: (string | null | undefined)[]) => values.filter((v): v is string => !!v)

export function buildGraph(base: Base): Graph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const j of base.jurisdictions) {
    nodes.push({
      id: nodeId('jurisdiction', j.id),
      kind: 'jurisdiction',
      label: j.acronym ?? j.name,
      search: compact([j.name, j.acronym, ...(j.aliases ?? [])]),
      startYear: j.founded?.date ? yearOf(j.founded.date) : undefined,
      endYear: j.dissolved?.date ? yearOf(j.dissolved.date) : undefined,
      color: j.color,
      jurisdictionType: j.type,
      country: j.country ?? undefined
    })
    for (const r of j.relations ?? []) {
      edges.push({
        from: nodeId('jurisdiction', j.id),
        to: nodeId('jurisdiction', r.target),
        kind: r.type,
        status: r.status,
        year: r.date ? yearOf(r.date) : undefined
      })
    }
  }

  for (const p of base.people) {
    const ordinations = p.ordinations ?? []
    const first = compact(ordinations.map((o) => o.date)).sort()[0]
    nodes.push({
      id: nodeId('person', p.id),
      kind: 'person',
      label: p.name,
      search: compact([p.name, p.full_name, ...(p.aliases ?? [])]),
      startYear: first ? yearOf(first) : p.birth?.date ? yearOf(p.birth.date) : undefined,
      endYear: p.death?.date ? yearOf(p.death.date) : undefined,
      order: (['episcopate', 'presbyterate', 'diaconate'] as const).find((o) => ordinations.some((x) => x.order === o))
    })

    const to = nodeId('person', p.id)
    for (const o of ordinations) {
      const year = o.date ? yearOf(o.date) : undefined
      if (o.order === 'episcopate') {
        if (o.principal_consecrator) {
          edges.push({ from: nodeId('person', o.principal_consecrator), to, kind: 'consecration', status: o.status, year })
        }
        for (const c of o.co_consecrators ?? []) {
          edges.push({ from: nodeId('person', c), to, kind: 'co_consecration', status: o.status, year })
        }
      } else if (o.ordained_by) {
        const kind = o.order === 'presbyterate' ? 'presbyteral_ordination' : 'diaconal_ordination'
        edges.push({ from: nodeId('person', o.ordained_by), to, kind, status: o.status, year })
      }
    }

    for (const a of p.affiliations ?? []) {
      edges.push({
        from: to,
        to: nodeId('jurisdiction', a.diocese ?? a.jurisdiction),
        kind: 'affiliation',
        status: a.status,
        year: a.start ? yearOf(a.start) : undefined,
        label: a.role
      })
    }
  }

  return { nodes, edges }
}
