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
  /** Pessoa: ordem mais alta registrada (ou inferida, ver `inferredOrder`). */
  order?: TOrdination['order']
  /**
   * Pessoa sem ordenação cadastrada, mas que sagrou ou ordenou alguém: é bispo
   * por implicação. Marcado para a interface poder dizer "bispo (inferido)".
   */
  inferredOrder?: boolean
  /** Jurisdição: tipo (igreja nacional, diocese...). */
  jurisdictionType?: TJurisdiction['type']
  country?: string
  /** Faz parte do núcleo brasileiro: jurisdição no Brasil ou pessoa vinculada a uma. */
  brazil?: boolean
  /** Jurisdição de nível diocesano: some quando as dioceses estão ocultas (as ligações sobem para a igreja). */
  diocesan?: boolean
}

export interface GraphEdge {
  /** Para ordenações: quem ordenou → quem foi ordenado. */
  from: string
  to: string
  kind: EdgeKind
  status: 'confirmed' | 'probable' | 'contested'
  year?: number
  label?: string
  /**
   * Cópia de uma ligação com uma diocese, levada para a igreja a que ela pertence.
   * Só aparece com as dioceses ocultas (no lugar da original).
   */
  rollup?: boolean
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Prefixa ids para que pessoa e jurisdição com o mesmo slug não colidam. */
export const nodeId = (kind: NodeKind, id: string) => `${kind === 'person' ? 'p' : 'j'}:${id}`

const EPISCOPAL_ROLES = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop'])

const compact = (values: (string | null | undefined)[]) => values.filter((v): v is string => !!v)

export function buildGraph(base: Base): Graph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Quem sagrou ou ordenou alguém é bispo, mesmo sem ordenação própria cadastrada.
  const ordainers = new Set<string>()
  for (const p of base.people) {
    for (const o of p.ordinations ?? []) {
      for (const id of compact([o.ordained_by, o.principal_consecrator, ...(o.co_consecrators ?? [])])) ordainers.add(id)
    }
  }
  // Dioceses sem país herdam o da igreja a que pertencem (part_of), em qualquer profundidade.
  const byId = new Map(base.jurisdictions.map((j) => [j.id, j]))
  const parents = new Map<string, Set<string>>()
  const addParent = (child: string, parent: string) => parents.set(child, (parents.get(child) ?? new Set()).add(parent))
  for (const j of base.jurisdictions) for (const r of j.relations ?? []) if (r.type === 'part_of') addParent(j.id, r.target)
  for (const p of base.people) for (const a of p.affiliations ?? []) if (a.diocese && a.diocese !== a.jurisdiction) addParent(a.diocese, a.jurisdiction)
  const countryOf = (id: string, seen = new Set<string>()): string | undefined => {
    const j = byId.get(id)
    if (!j || seen.has(id)) return undefined
    if (j.country) return j.country
    seen.add(id)
    for (const parent of parents.get(id) ?? []) {
      const c = countryOf(parent, seen)
      if (c) return c
    }
    return undefined
  }
  const brazilianJurisdictions = new Set(base.jurisdictions.filter((j) => countryOf(j.id) === 'BR').map((j) => j.id))
  // Diocese ligada a uma igreja só pelos vínculos das pessoas: o grafo ganha a aresta diocese → igreja.
  const partOf = new Set(base.jurisdictions.flatMap((j) => (j.relations ?? []).filter((r) => r.type === 'part_of').map((r) => `${j.id}>${r.target}`)))

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
      country: countryOf(j.id),
      brazil: brazilianJurisdictions.has(j.id) || undefined
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
    const recorded = (['episcopate', 'presbyterate', 'diaconate'] as const).find((o) => ordinations.some((x) => x.order === o))
    // Bispo por implicação: sagrou/ordenou alguém, ou ocupa cargo episcopal numa jurisdição.
    const inferred = recorded !== 'episcopate' && (ordainers.has(p.id) || (p.affiliations ?? []).some((a) => EPISCOPAL_ROLES.has(a.role)))
    nodes.push({
      id: nodeId('person', p.id),
      kind: 'person',
      label: p.name,
      search: compact([p.name, p.full_name, ...(p.aliases ?? [])]),
      startYear: first ? yearOf(first) : p.birth?.date ? yearOf(p.birth.date) : undefined,
      endYear: p.death?.date ? yearOf(p.death.date) : undefined,
      order: inferred ? 'episcopate' : recorded,
      inferredOrder: inferred || undefined,
      brazil:
        (p.affiliations ?? []).some((a) => brazilianJurisdictions.has(a.jurisdiction) || (!!a.diocese && brazilianJurisdictions.has(a.diocese))) ||
        ordinations.some((o) => !!o.jurisdiction && brazilianJurisdictions.has(o.jurisdiction)) ||
        undefined
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

    // Ordenado numa jurisdição sem vínculo registrado com ela: a ordenação já é uma ligação.
    const linked = new Set((p.affiliations ?? []).flatMap((a) => compact([a.jurisdiction, a.diocese])))
    for (const o of ordinations) {
      if (!o.jurisdiction || linked.has(o.jurisdiction) || !byId.has(o.jurisdiction)) continue
      linked.add(o.jurisdiction)
      edges.push({ from: to, to: nodeId('jurisdiction', o.jurisdiction), kind: 'affiliation', status: o.status, year: o.date ? yearOf(o.date) : undefined, label: o.order })
    }

    for (const a of p.affiliations ?? []) {
      if (a.diocese && a.diocese !== a.jurisdiction && !partOf.has(`${a.diocese}>${a.jurisdiction}`) && byId.has(a.diocese)) {
        partOf.add(`${a.diocese}>${a.jurisdiction}`)
        edges.push({ from: nodeId('jurisdiction', a.diocese), to: nodeId('jurisdiction', a.jurisdiction), kind: 'part_of', status: a.status, year: a.start ? yearOf(a.start) : undefined })
      }
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

  inferStartYears(nodes, edges)
  edges.push(...rollupEdges(base, nodes, edges, countryOf))
  return { nodes, edges }
}

/**
 * Sem data própria (fundação, primeira ordenação ou nascimento), o nó começa na sua ligação datada
 * mais antiga. Assim o filtro por ano não mostra, num ano remoto, quem só aparece muito depois.
 */
function inferStartYears(nodes: GraphNode[], edges: GraphEdge[]) {
  const first = new Map<string, number>()
  for (const e of edges) {
    if (e.year === undefined) continue
    for (const id of [e.from, e.to]) first.set(id, Math.min(first.get(id) ?? Infinity, e.year))
  }
  for (const n of nodes) if (n.startYear === undefined && first.has(n.id)) n.startYear = first.get(n.id)
}

const DIOCESAN_TYPES = new Set<TJurisdiction['type']>(['diocese', 'missionary_district'])

interface ParentLink {
  target: string
  from?: number
  to?: number
}

/**
 * Marca as jurisdições de nível diocesano e cria as ligações que as substituem quando as dioceses
 * estão ocultas. Uma diocese funciona como igreja (e fica visível) quando não pertence a nenhuma
 * igreja, quando todas as igrejas a que pertence são de outro país (é a igreja local: o Distrito
 * Missionário do Sul do Brasil, a Diocese do Recife sob o Cone Sul) ou quando `acts_as_church` diz.
 */
function rollupEdges(base: Base, nodes: GraphNode[], edges: GraphEdge[], countryOf: (id: string) => string | undefined): GraphEdge[] {
  const byId = new Map(base.jurisdictions.map((j) => [j.id, j]))
  const links = new Map<string, ParentLink[]>()
  const addLink = (child: string, link: ParentLink) => {
    if (child === link.target || !byId.has(link.target)) return
    const list = links.get(child) ?? []
    if (!list.some((l) => l.target === link.target && l.from === link.from && l.to === link.to)) list.push(link)
    links.set(child, list)
  }
  for (const j of base.jurisdictions) {
    for (const r of j.relations ?? []) {
      if (r.type === 'part_of') addLink(j.id, { target: r.target, from: r.date ? yearOf(r.date) : undefined, to: r.end ? yearOf(r.end) : undefined })
    }
  }
  for (const p of base.people) for (const a of p.affiliations ?? []) if (a.diocese) addLink(a.diocese, { target: a.jurisdiction })

  const diocesan = new Set<string>()
  for (const j of base.jurisdictions) {
    const parents = links.get(j.id) ?? []
    const isDiocesan =
      j.acts_as_church !== undefined
        ? !j.acts_as_church
        : DIOCESAN_TYPES.has(j.type) && parents.some((l) => countryOf(l.target) === countryOf(j.id))
    if (isDiocesan) diocesan.add(j.id)
  }
  for (const n of nodes) if (n.kind === 'jurisdiction' && diocesan.has(n.id.slice(2))) n.diocesan = true

  const existsIn = (id: string, year: number) => {
    const j = byId.get(id)
    const start = j?.founded?.date ? yearOf(j.founded.date) : undefined
    const end = j?.dissolved?.date ? yearOf(j.dissolved.date) : undefined
    return (start === undefined || start <= year) && (end === undefined || year <= end)
  }

  /** Igrejas visíveis acima da jurisdição; com o ano, só as ligações em vigor (se alguma estiver). */
  const churchesOf = (id: string, year: number | undefined, seen = new Set<string>()): string[] => {
    if (!diocesan.has(id)) return [id]
    if (seen.has(id)) return []
    seen.add(id)
    // Com o ano: descarta igrejas que ainda não existiam ou já tinham acabado e prefere as ligações datadas em vigor.
    const existed = (l: ParentLink) => year === undefined || existsIn(l.target, year)
    const all = (links.get(id) ?? []).filter(existed)
    const inForce = year === undefined ? [] : all.filter((l) => (l.from ?? -Infinity) <= year && year <= (l.to ?? Infinity) && (l.from !== undefined || l.to !== undefined))
    const chosen = inForce.length ? inForce : all.length ? all : (links.get(id) ?? [])
    return [...new Set(chosen.flatMap((l) => churchesOf(l.target, year, seen)))]
  }

  const key = (e: Pick<GraphEdge, 'from' | 'to' | 'kind'>) => `${e.from}>${e.to}>${e.kind}`
  const existing = new Set(edges.map(key))
  const out: GraphEdge[] = []
  const ends = (nid: string, year: number | undefined) =>
    nid.startsWith('j:') && diocesan.has(nid.slice(2)) ? churchesOf(nid.slice(2), year).map((id) => nodeId('jurisdiction', id)) : [nid]
  for (const e of edges) {
    const fromDiocesan = e.from.startsWith('j:') && diocesan.has(e.from.slice(2))
    const toDiocesan = e.to.startsWith('j:') && diocesan.has(e.to.slice(2))
    // A estrutura da própria diocese (de que igreja ela é parte) some junto com ela.
    if ((!fromDiocesan && !toDiocesan) || (e.kind === 'part_of' && fromDiocesan)) continue
    for (const from of ends(e.from, e.year)) {
      for (const to of ends(e.to, e.year)) {
        const copy = { ...e, from, to, rollup: true as const }
        if (from === to || existing.has(key(copy))) continue
        existing.add(key(copy))
        out.push(copy)
      }
    }
  }
  return out
}
