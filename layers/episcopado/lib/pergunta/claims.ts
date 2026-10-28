import type { EdgeKind } from '../graph'
import type { PathStep } from '../paths'
import type { TPerson, TSourceRef } from '../schemas'
import { claimIds } from '../sql/build'
import type { BaseIndex } from '../views'

/**
 * Afirmações por `claim_id` (o mesmo esquema de `lib/sql/build.ts`): de onde vêm as fontes de cada
 * citação e qual afirmação sustenta cada passo de uma sucessão ou de um caminho.
 */

/** Ids citáveis dentro de um texto ou célula ("p:a/ordinations/0", "j:iab", "p:b/birth"). */
export const CLAIM_PATTERN = /\b[pj]:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/(?:ordinations|affiliations|events|relations)\/\d+|\/(?:birth|death|founded|dissolved))?/g

export interface ClaimInfo {
  status?: 'confirmed' | 'probable' | 'contested'
  sources: TSourceRef[]
}

export function claimInfo(index: BaseIndex, claimId: string): ClaimInfo | null {
  const m = /^([pj]):([a-z0-9-]+)(?:\/([a-z]+)(?:\/(\d+))?)?$/.exec(claimId)
  if (!m) return null
  const [, kind, id, field, n] = m
  const i = n === undefined ? -1 : Number(n)
  if (kind === 'p') {
    const p = index.people.get(id)
    if (!p) return null
    if (!field) return p.sources?.length ? { sources: p.sources } : null
    if (field === 'birth') return p.birth ? { sources: p.birth.sources } : null
    if (field === 'death') return p.death ? { sources: p.death.sources } : null
    const list = field === 'ordinations' ? p.ordinations : field === 'affiliations' ? p.affiliations : field === 'events' ? p.events : undefined
    const c = list?.[i]
    return c ? { status: c.status, sources: c.sources } : null
  }
  const j = index.jurisdictions.get(id)
  if (!j) return null
  if (!field) return j.sources?.length ? { sources: j.sources } : null
  if (field === 'founded') return j.founded ? { sources: j.founded.sources } : null
  if (field === 'dissolved') return j.dissolved ? { sources: j.dissolved.sources } : null
  const r = field === 'relations' ? j.relations?.[i] : undefined
  return r ? { status: r.status, sources: r.sources } : null
}

/** Índice da sagração que sustenta a linha de sucessão (a mesma regra de `views.ts`). */
export function mainEpiscopateIndex(p: TPerson): number {
  const list = (p.ordinations ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o.order === 'episcopate')
  return (list.find(({ o }) => !o.mode || o.mode === 'normal') ?? list[0])?.i ?? -1
}

export function consecrationClaim(index: BaseIndex, personId: string): string | null {
  const p = index.people.get(personId)
  const i = p ? mainEpiscopateIndex(p) : -1
  return i >= 0 ? claimIds.ordination(personId, i) : null
}

const ORDINATION_EDGES: Partial<Record<EdgeKind, 'principal' | 'co' | 'ordainer'>> = {
  consecration: 'principal',
  co_consecration: 'co',
  presbyteral_ordination: 'ordainer',
  diaconal_ordination: 'ordainer'
}

/** A afirmação que sustenta a ligação entre dois passos de um caminho, quando dá para achar. */
export function edgeClaim(index: BaseIndex, prev: string, step: PathStep): string | null {
  if (!step.via) return null
  const [from, to] = step.via.reversed ? [step.id, prev] : [prev, step.id]
  const role = ORDINATION_EDGES[step.via.kind]
  const pid = (s: string) => (s.startsWith('p:') ? s.slice(2) : null)
  const jid = (s: string) => (s.startsWith('j:') ? s.slice(2) : null)
  if (role) {
    const ordainer = pid(from)
    const ordained = pid(to)
    const p = ordained ? index.people.get(ordained) : undefined
    const i = (p?.ordinations ?? []).findIndex((o) =>
      role === 'principal' ? o.principal_consecrator === ordainer : role === 'co' ? o.co_consecrators?.includes(ordainer ?? '') : o.ordained_by === ordainer
    )
    return p && i >= 0 ? claimIds.ordination(p.id, i) : null
  }
  if (step.via.kind === 'affiliation') {
    const person = pid(from) ?? pid(to)
    const j = jid(from) ?? jid(to)
    const p = person ? index.people.get(person) : undefined
    const i = (p?.affiliations ?? []).findIndex((a) => a.jurisdiction === j || a.diocese === j)
    if (p && i >= 0) return claimIds.affiliation(p.id, i)
    const o = (p?.ordinations ?? []).findIndex((x) => x.jurisdiction === j)
    return p && o >= 0 ? claimIds.ordination(p.id, o) : null
  }
  const source = jid(from)
  const target = jid(to)
  const j = source ? index.jurisdictions.get(source) : undefined
  const i = (j?.relations ?? []).findIndex((r) => r.type === step.via!.kind && r.target === target)
  return j && i >= 0 ? claimIds.relation(j.id, i) : null
}
