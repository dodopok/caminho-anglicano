import { yearOf } from '../dates'
import type { Graph } from '../graph'
import type { Base, TSourceRef } from '../schemas'
import { SCHEMA_DDL, SCHEMA_INDEXES } from './schema'

/**
 * Achata a base nas tabelas de `schema.ts`. Recebe a conexão (node:sqlite `DatabaseSync` ou compatível)
 * para a lib continuar pura: quem abre o arquivo é o servidor ou o script.
 */

export interface SqlStatement {
  run(...params: unknown[]): unknown
}

export interface SqlDatabase {
  exec(sql: string): void
  prepare(sql: string): SqlStatement
}

/** Chave de citação de cada afirmação, estável dentro de uma versão da base. */
export const claimIds = {
  ordination: (person: string, i: number) => `p:${person}/ordinations/${i}`,
  affiliation: (person: string, i: number) => `p:${person}/affiliations/${i}`,
  event: (person: string, i: number) => `p:${person}/events/${i}`,
  relation: (jurisdiction: string, i: number) => `j:${jurisdiction}/relations/${i}`
}

const year = (d: string | null | undefined) => (d ? yearOf(d) : null)

export function buildSqlite(base: Base, graph: Graph, db: SqlDatabase): void {
  db.exec(SCHEMA_DDL)
  db.exec(SCHEMA_INDEXES)
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]))
  const insert = (table: string, n: number) => db.prepare(`INSERT INTO ${table} VALUES (${Array(n).fill('?').join(',')})`)
  const ins = {
    person: insert('people', 13),
    alias: insert('person_aliases', 2),
    jurisdiction: insert('jurisdictions', 13),
    ancestor: insert('jurisdiction_ancestors', 3),
    ordination: insert('ordinations', 13),
    co: insert('co_consecrators', 2),
    affiliation: insert('affiliations', 13),
    relation: insert('relations', 10),
    leader: insert('relation_leaders', 2),
    event: insert('events', 9),
    source: insert('sources', 9),
    cite: insert('claim_sources', 4),
    discrepancy: insert('discrepancies', 5)
  }
  const cite = (claim: string, refs: TSourceRef[] | undefined) => {
    for (const r of refs ?? []) ins.cite.run(claim, r.source, r.quote ?? null, r.page ?? null)
  }
  type Disc = { field: string; value?: unknown; sources: TSourceRef[]; notes?: string }
  const discrepancies = (claim: string, list: Disc[] | undefined) => {
    for (const d of list ?? []) {
      const value = d.value === null || d.value === undefined ? null : Array.isArray(d.value) ? d.value.join(', ') : String(d.value)
      for (const s of d.sources) ins.discrepancy.run(claim, d.field, value, s.source, d.notes ?? null)
    }
  }

  db.exec('BEGIN')
  for (const p of base.people) {
    const node = nodes.get(`p:${p.id}`)
    ins.person.run(
      p.id, p.name, p.full_name ?? null,
      p.birth?.date ?? null, year(p.birth?.date), p.birth?.place ?? null,
      p.death?.date ?? null, year(p.death?.date), p.death?.place ?? null,
      p.wikidata ?? null, p.biography ?? null, node?.brazil ? 1 : 0, node?.order ?? null
    )
    for (const a of p.aliases ?? []) ins.alias.run(p.id, a)
    cite(`p:${p.id}`, p.sources)
    if (p.birth) cite(`p:${p.id}/birth`, p.birth.sources)
    if (p.death) cite(`p:${p.id}/death`, p.death.sources)
    p.ordinations?.forEach((o, i) => {
      const c = claimIds.ordination(p.id, i)
      ins.ordination.run(
        c, p.id, o.order, o.date, year(o.date), o.place ?? null, o.jurisdiction,
        o.principal_consecrator ?? null, o.ordained_by ?? null, o.office ?? null, o.mode ?? 'normal', o.status, o.notes ?? null
      )
      for (const cc of o.co_consecrators ?? []) ins.co.run(c, cc)
      cite(c, o.sources)
      discrepancies(c, o.discrepancies)
    })
    p.affiliations?.forEach((a, i) => {
      const c = claimIds.affiliation(p.id, i)
      ins.affiliation.run(
        c, p.id, a.jurisdiction, a.diocese ?? null, a.role, a.role_description ?? null,
        a.start ?? null, year(a.start), a.end ?? null, year(a.end), a.end_reason ?? null, a.status, a.notes ?? null
      )
      cite(c, a.sources)
      discrepancies(c, a.discrepancies)
    })
    p.events?.forEach((e, i) => {
      const c = claimIds.event(p.id, i)
      ins.event.run(c, p.id, e.type, e.date, year(e.date), e.jurisdiction ?? null, e.description, e.status, e.notes ?? null)
      cite(c, e.sources)
      discrepancies(c, e.discrepancies)
    })
  }

  // Hierarquia: part_of das jurisdições e diocese → jurisdição dos vínculos (como em buildGraph).
  const parents = new Map<string, Set<string>>()
  const addParent = (child: string, parent: string) => {
    if (child !== parent) parents.set(child, (parents.get(child) ?? new Set()).add(parent))
  }
  for (const j of base.jurisdictions) for (const r of j.relations ?? []) if (r.type === 'part_of') addParent(j.id, r.target)
  for (const p of base.people) for (const a of p.affiliations ?? []) if (a.diocese) addParent(a.diocese, a.jurisdiction)

  for (const j of base.jurisdictions) {
    const node = nodes.get(`j:${j.id}`)
    ins.jurisdiction.run(
      j.id, j.acronym ?? null, j.name, j.type, j.tradition ?? null, node?.country ?? j.country ?? null,
      j.founded?.date ?? null, year(j.founded?.date), j.dissolved?.date ?? null, year(j.dissolved?.date),
      j.description ?? null, node?.brazil ? 1 : 0, node?.diocesan ? 1 : 0
    )
    // Ancestrais em largura, com a menor profundidade; ciclos são ignorados.
    const depth = new Map([[j.id, 0]])
    const queue = [j.id]
    while (queue.length) {
      const cur = queue.shift()!
      for (const parent of parents.get(cur) ?? []) {
        if (depth.has(parent)) continue
        depth.set(parent, depth.get(cur)! + 1)
        queue.push(parent)
      }
    }
    for (const [ancestor, d] of depth) ins.ancestor.run(j.id, ancestor, d)
    cite(`j:${j.id}`, j.sources)
    if (j.founded) cite(`j:${j.id}/founded`, j.founded.sources)
    if (j.dissolved) cite(`j:${j.id}/dissolved`, j.dissolved.sources)
    j.relations?.forEach((r, i) => {
      const c = claimIds.relation(j.id, i)
      ins.relation.run(c, j.id, r.type, r.target, r.date ?? null, year(r.date), r.end ?? null, year(r.end), r.status, r.notes ?? null)
      for (const l of r.led_by ?? []) ins.leader.run(c, l)
      cite(c, r.sources)
      discrepancies(c, r.discrepancies)
    })
  }
  for (const s of base.sources) {
    ins.source.run(s.id, s.type, s.title, s.author ?? null, s.publisher ?? null, s.url ?? null, s.published ?? null, s.level, s.language ?? null)
  }
  db.exec('COMMIT')
}
