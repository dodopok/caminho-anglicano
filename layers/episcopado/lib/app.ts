import { ephemerides, type Ephemeris } from './ephemerides'
import type { Graph } from './graph'
import { EVENT_LABEL, ORDER_LABEL, RELATION_LABEL, ROLE_LABEL, formatDate, formatPeriod } from './labels'
import type { TAffiliation, TJurisdiction, TOrdination, TSourceRef } from './schemas'
import { discrepancyText, personView, type BaseIndex, type EntityRef, type JurisdictionRef, type PersonRef, type PersonView, type SuccessionStep } from './views'

/**
 * Vistas específicas do app nativo (e de quem mais quiser consumir a API):
 * manifesto da base, tela de início, afirmações contestadas e linha de sucessão com origem.
 */

export interface Manifest {
  /** Identifica o conteúdo da base; muda a cada deploy com dados novos. */
  version: string
  generatedAt: string
  counts: { people: number; jurisdictions: number; sources: number; edges: number; bishops: number; contested: number }
  yearRange: { min: number; max: number }
}

export function manifest(index: BaseIndex, graph: Graph, version: string, generatedAt: string): Manifest {
  const years = graph.nodes.map((n) => n.startYear).filter((y): y is number => typeof y === 'number')
  return {
    version,
    generatedAt,
    counts: {
      people: index.people.size,
      jurisdictions: index.jurisdictions.size,
      sources: index.sources.size,
      edges: graph.edges.filter((e) => !e.rollup).length,
      bishops: graph.nodes.filter((n) => n.kind === 'person' && n.order === 'episcopate').length,
      contested: contestedClaims(index).length
    },
    yearRange: { min: years.length ? Math.min(...years) : new Date().getUTCFullYear(), max: new Date().getUTCFullYear() }
  }
}

// ---------------------------------------------------------------------------
// Pontos de partida: as jurisdições brasileiras de nível igreja.
// ---------------------------------------------------------------------------

export interface Starter extends JurisdictionRef {
  type: TJurisdiction['type']
  founded: string | null
  /** Pessoas distintas com algum papel episcopal na jurisdição ou nas suas dioceses. */
  bishops: number
  /** Pessoas distintas com qualquer vínculo. */
  members: number
  /** Ligações no grafo (quanto maior, mais central). */
  degree: number
}

const EPISCOPAL_ROLES = new Set<TAffiliation['role']>([
  'bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop', 'founder'
])
const CHURCH_LEVEL = new Set<TJurisdiction['type']>(['national_church', 'province', 'network'])

export function starters(index: BaseIndex, graph: Graph): Starter[] {
  const degree = new Map<string, number>()
  for (const e of graph.edges) {
    if (e.rollup) continue
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const brazilian = new Set(graph.nodes.filter((n) => n.kind === 'jurisdiction' && n.country === 'BR').map((n) => n.id.slice(2)))
  const members = new Map<string, Set<string>>()
  const bishops = new Map<string, Set<string>>()
  const add = (map: Map<string, Set<string>>, jid: string, pid: string) => map.set(jid, (map.get(jid) ?? new Set()).add(pid))
  for (const p of index.people.values()) {
    for (const a of p.affiliations ?? []) {
      add(members, a.jurisdiction, p.id)
      if (EPISCOPAL_ROLES.has(a.role)) add(bishops, a.jurisdiction, p.id)
    }
  }
  return [...index.jurisdictions.values()]
    .filter((j) => brazilian.has(j.id) && CHURCH_LEVEL.has(j.type))
    .map((j) => ({
      id: j.id,
      name: j.name,
      acronym: j.acronym,
      type: j.type,
      founded: j.founded?.date ?? null,
      bishops: bishops.get(j.id)?.size ?? 0,
      members: members.get(j.id)?.size ?? 0,
      degree: degree.get(`j:${j.id}`) ?? 0
    }))
    .sort((a, b) => b.degree - a.degree || (a.acronym ?? a.name).localeCompare(b.acronym ?? b.name, 'pt-BR'))
}

// ---------------------------------------------------------------------------
// Afirmações contestadas: todas as versões, cada uma com quantas fontes a sustentam.
// ---------------------------------------------------------------------------

export interface ClaimVersion {
  /** "data", "sagrante principal"... (vazio na versão registrada no campo principal). */
  field: string
  value: string
  sources: number
}

export interface ContestedClaim {
  entity: EntityRef
  section: 'ordenacoes' | 'trajetoria' | 'eventos' | 'origem'
  /** "Episcopado de Márcio Meira", "Cisma de IEAB (IAB)". */
  claim: string
  /** Data principal da afirmação, para ordenar (as mais recentes primeiro). */
  date: string | null
  versions: ClaimVersion[]
  /** Fontes distintas entre todas as versões. */
  sources: number
}

function versionsOf(
  index: BaseIndex,
  main: { field: string; value: string },
  refs: TSourceRef[],
  discrepancies: TOrdination['discrepancies']
): { versions: ClaimVersion[]; sources: number } {
  const distinct = new Set(refs.map((r) => r.source))
  const versions: ClaimVersion[] = [{ field: main.field, value: main.value, sources: distinct.size }]
  for (const d of discrepancies ?? []) {
    const text = discrepancyText(index, d)
    const [field, ...rest] = text.split(': ')
    versions.push({ field, value: rest.join(': '), sources: new Set(d.sources.map((r) => r.source)).size })
    for (const r of d.sources) distinct.add(r.source)
  }
  return { versions, sources: distinct.size }
}

const jname = (index: BaseIndex, id: string | null | undefined) => {
  if (!id) return ''
  const j = index.jurisdictions.get(id)
  return j?.acronym ?? j?.name ?? id
}

export function contestedClaims(index: BaseIndex): ContestedClaim[] {
  const out: ContestedClaim[] = []
  for (const p of index.people.values()) {
    const entity: EntityRef = { kind: 'person', id: p.id, name: p.name }
    for (const o of p.ordinations ?? []) {
      if (o.status !== 'contested') continue
      out.push({
        entity,
        section: 'ordenacoes',
        claim: `${ORDER_LABEL[o.order]} de ${p.name}`,
        date: o.date,
        ...versionsOf(index, { field: 'data', value: o.date ? formatDate(o.date) : 'não informada' }, o.sources, o.discrepancies)
      })
    }
    for (const a of p.affiliations ?? []) {
      if (a.status !== 'contested') continue
      const role = a.role === 'other' && a.role_description ? a.role_description : ROLE_LABEL[a.role]
      out.push({
        entity,
        section: 'trajetoria',
        claim: `${role} · ${jname(index, a.diocese ?? a.jurisdiction)} — ${p.name}`,
        date: a.start ?? null,
        ...versionsOf(index, { field: 'período', value: formatPeriod(a.start, a.end) || 'não informado' }, a.sources, a.discrepancies)
      })
    }
    for (const e of p.events ?? []) {
      if (e.status !== 'contested') continue
      out.push({
        entity,
        section: 'eventos',
        claim: `${EVENT_LABEL[e.type]} de ${p.name}`,
        date: e.date,
        ...versionsOf(index, { field: 'data', value: e.date ? formatDate(e.date) : 'não informada' }, e.sources, e.discrepancies)
      })
    }
  }
  for (const j of index.jurisdictions.values()) {
    const entity: EntityRef = { kind: 'jurisdiction', id: j.id, name: j.acronym ?? j.name }
    for (const r of j.relations ?? []) {
      if (r.status !== 'contested') continue
      out.push({
        entity,
        section: 'origem',
        claim: `${RELATION_LABEL[r.type]} ${jname(index, r.target)} (${j.acronym ?? j.name})`,
        date: r.date ?? null,
        ...versionsOf(index, { field: 'data', value: r.date ? formatDate(r.date) : 'não informada' }, r.sources, r.discrepancies)
      })
    }
  }
  return out.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.claim.localeCompare(b.claim, 'pt-BR'))
}

// ---------------------------------------------------------------------------
// Tela de início.
// ---------------------------------------------------------------------------

export interface HomeView {
  manifest: Manifest
  starters: Starter[]
  /** Efemérides dos próximos dias (a partir de hoje). */
  thisWeek: Ephemeris[]
  contested: ContestedClaim[]
}

export function homeView(index: BaseIndex, graph: Graph, info: Manifest, today: Date, options: { days?: number; contested?: number } = {}): HomeView {
  return {
    manifest: info,
    starters: starters(index, graph),
    thisWeek: ephemerides(index, today, options.days ?? 7),
    contested: contestedClaims(index).slice(0, options.contested ?? 8)
  }
}

// ---------------------------------------------------------------------------
// Linha de sucessão com a origem reconhecida.
// ---------------------------------------------------------------------------

export interface Origin {
  /** "Cantuária", "Roma", "Utrecht", "Escócia". */
  label: string
  /** Pessoa em que a linha chega à origem. */
  person: PersonRef
}

/** Pontos em que uma linha de sucessão alcança uma tradição histórica. */
export const ORIGINS: Record<string, string> = {
  'thomas-cranmer': 'Cantuária',
  'matthew-parker': 'Cantuária',
  'william-barlow': 'Cantuária',
  'scipione-rebiba': 'Roma',
  'dominique-marie-varlet': 'Utrecht',
  'samuel-seabury': 'Escócia'
}

export interface SuccessionView {
  person: PersonRef
  steps: SuccessionStep[]
  end: PersonView['successionEnd']
  origin: Origin | null
  alt: SuccessionStep[]
  altOrigin: Origin | null
}

export function originOf(steps: SuccessionStep[]): Origin | null {
  for (const s of steps) {
    const label = ORIGINS[s.person.id]
    if (label) return { label, person: s.person }
  }
  return null
}

export function successionView(index: BaseIndex, id: string): SuccessionView | null {
  const view = personView(index, id)
  if (!view) return null
  return {
    person: { id: view.id, name: view.name },
    steps: view.succession,
    end: view.successionEnd,
    origin: originOf(view.succession),
    alt: view.successionAlt,
    altOrigin: originOf(view.successionAlt)
  }
}
