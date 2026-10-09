import { yearOf } from './dates'
import type { TJurisdiction } from './schemas'
import type { BaseIndex } from './views'

/**
 * Árvore das jurisdições no tempo: uma faixa por jurisdição (fundação → extinção ou hoje),
 * com a jurisdição de onde ela saiu (cisma ou sucessão) e as filiações a comunhões.
 * Dioceses ficam de fora: a árvore é das igrejas, províncias, redes e comunhões.
 */

export interface TreeRelation {
  type: 'schism_from' | 'successor_of' | 'merged_with' | 'member_of' | 'part_of' | 'in_communion_with' | 'broke_communion_with' | 'recognized_by'
  target: string
  year: number | null
  end: number | null
  status: 'confirmed' | 'probable' | 'contested'
}

export interface TreeNode {
  id: string
  acronym: string | null
  name: string
  type: TJurisdiction['type']
  tradition: TJurisdiction['tradition'] | null
  country: string | null
  /** Ano de fundação (null = desconhecido: a faixa começa no primeiro ano em que algo acontece). */
  founded: number | null
  dissolved: number | null
  /** De onde saiu: a relação `schism_from` ou `successor_of` mais antiga. */
  parent: string | null
  parentType: 'schism_from' | 'successor_of' | null
  parentYear: number | null
  relations: TreeRelation[]
  /** Pessoas distintas com papel episcopal (tamanho da faixa). */
  bishops: number
}

export interface Tree {
  scope: 'brazil' | 'all'
  /** Da mais antiga para a mais nova; filhas depois das mães. */
  nodes: TreeNode[]
  yearRange: { min: number; max: number }
}

const EXCLUDED: Set<TJurisdiction['type']> = new Set(['diocese', 'missionary_district'])
const EPISCOPAL = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop', 'founder'])

/** Países que contam como "Brasil" na árvore: a jurisdição é brasileira ou tem filha/mãe brasileira. */
function brazilianSet(index: BaseIndex): Set<string> {
  const br = new Set([...index.jurisdictions.values()].filter((j) => j.country === 'BR').map((j) => j.id))
  // Mães das brasileiras entram (IEAB vem da TEC; IARB é parte da REC), para a árvore ter raiz.
  for (const j of index.jurisdictions.values()) {
    if (!br.has(j.id)) continue
    for (const r of j.relations ?? []) if (r.type === 'schism_from' || r.type === 'successor_of' || r.type === 'part_of' || r.type === 'member_of') br.add(r.target)
  }
  return br
}

export function buildTree(index: BaseIndex, scope: 'brazil' | 'all' = 'brazil'): Tree {
  const bishops = new Map<string, Set<string>>()
  for (const p of index.people.values()) {
    for (const a of p.affiliations ?? []) if (EPISCOPAL.has(a.role)) bishops.set(a.jurisdiction, (bishops.get(a.jurisdiction) ?? new Set()).add(p.id))
  }
  const allowed = scope === 'brazil' ? brazilianSet(index) : null
  const nodes: TreeNode[] = []
  for (const j of index.jurisdictions.values()) {
    if (EXCLUDED.has(j.type) && !j.acts_as_church) continue
    if (allowed && !allowed.has(j.id)) continue
    const relations: TreeRelation[] = (j.relations ?? [])
      .filter((r) => !allowed || allowed.has(r.target))
      .map((r) => ({ type: r.type, target: r.target, year: r.date ? yearOf(r.date) : null, end: r.end ? yearOf(r.end) : null, status: r.status }))
    const origins = relations.filter((r) => r.type === 'schism_from' || r.type === 'successor_of').sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
    const parent = origins[0] ?? null
    nodes.push({
      id: j.id,
      acronym: j.acronym ?? null,
      name: j.name,
      type: j.type,
      tradition: j.tradition ?? null,
      country: j.country ?? null,
      founded: j.founded?.date ? yearOf(j.founded.date) : null,
      dissolved: j.dissolved?.date ? yearOf(j.dissolved.date) : null,
      parent: parent?.target ?? null,
      parentType: parent ? (parent.type as 'schism_from' | 'successor_of') : null,
      parentYear: parent?.year ?? null,
      relations,
      bishops: bishops.get(j.id)?.size ?? 0
    })
  }
  // Faixas sem fundação começam no primeiro ano conhecido (cisma, filiação) ou ficam sem data.
  for (const n of nodes) {
    if (n.founded !== null) continue
    const years = [n.parentYear, ...n.relations.map((r) => r.year)].filter((y): y is number => typeof y === 'number')
    n.founded = years.length ? Math.min(...years) : null
  }
  // Ordem: raízes por fundação; cada filha logo depois da mãe (profundidade primeiro).
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string, TreeNode[]>()
  for (const n of nodes) {
    const parent = n.parent && byId.has(n.parent) && n.parent !== n.id ? n.parent : null
    if (parent) children.set(parent, [...(children.get(parent) ?? []), n])
  }
  const byYear = (a: TreeNode, b: TreeNode) => (a.founded ?? 9999) - (b.founded ?? 9999) || (a.acronym ?? a.name).localeCompare(b.acronym ?? b.name, 'pt-BR')
  const ordered: TreeNode[] = []
  const seen = new Set<string>()
  const visit = (n: TreeNode) => {
    if (seen.has(n.id)) return
    seen.add(n.id)
    ordered.push(n)
    for (const c of (children.get(n.id) ?? []).sort(byYear)) visit(c)
  }
  const roots = nodes.filter((n) => !n.parent || !byId.has(n.parent) || n.parent === n.id).sort(byYear)
  for (const r of roots) visit(r)
  for (const n of nodes.sort(byYear)) visit(n) // ciclos (A cisma de B e B de A) entram aqui
  const years = ordered.flatMap((n) => [n.founded, n.dissolved]).filter((y): y is number => typeof y === 'number')
  const max = new Date().getUTCFullYear()
  return { scope, nodes: ordered, yearRange: { min: years.length ? Math.min(...years) : max, max } }
}
