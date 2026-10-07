import {
  EVENT_LABEL,
  FIELD_LABEL,
  ORDER_LABEL,
  RELATION_LABEL,
  ROLE_LABEL,
  formatDate,
  formatPeriod
} from './labels'
import type {
  Base,
  TAffiliation,
  TJurisdiction,
  TOrdination,
  TPerson,
  TRelation,
  TSource,
  TSourceRef
} from './schemas'

/**
 * Visões prontas para as fichas: ids resolvidos em nomes, relações invertidas
 * e citações numeradas como notas de rodapé (cada par fonte + trecho vira uma nota).
 */

export interface PersonRef {
  id: string
  name: string
}

export interface JurisdictionRef {
  id: string
  name: string
  acronym?: string | null
}

export type SourceSummary = Pick<
  TSource,
  'id' | 'type' | 'title' | 'author' | 'publisher' | 'url' | 'archive_url' | 'published' | 'level'
>

export interface Footnote {
  n: number
  source: SourceSummary
  quote?: string
  page?: string
}

export interface DiscrepancyView {
  field: string
  value: string | string[] | null
  /** Quando o campo aponta para pessoas ou jurisdições, os nomes resolvidos. */
  refs?: (PersonRef | JurisdictionRef)[]
  cites: number[]
  notes?: string
}

interface ClaimView {
  status: TOrdination['status']
  cites: number[]
  notes?: string
  discrepancies: DiscrepancyView[]
}

export interface OrdinationView extends ClaimView {
  order: TOrdination['order']
  date: string | null
  place?: string | null
  jurisdiction: JurisdictionRef | null
  office?: TOrdination['office']
  mode?: TOrdination['mode']
  ordainedBy: PersonRef | null
  principalConsecrator: PersonRef | null
  coConsecrators: PersonRef[]
}

export interface AffiliationView extends ClaimView {
  jurisdiction: JurisdictionRef
  diocese: JurisdictionRef | null
  role: TAffiliation['role']
  roleDescription?: string
  start?: string | null
  end?: string | null
  endReason?: TAffiliation['end_reason']
}

export interface OrdainedView {
  person: PersonRef
  order: TOrdination['order']
  /** principal = sagrante principal; co = co-sagrante; ordainer = bispo ordenante. */
  role: 'principal' | 'co' | 'ordainer'
  date: string | null
  jurisdiction: JurisdictionRef | null
  status: TOrdination['status']
}

export interface SuccessionStep {
  person: PersonRef
  /** Data da sagração desta pessoa. */
  date: string | null
  status?: TOrdination['status']
}

export interface DatedView {
  date: string | null
  place?: string | null
  cites: number[]
}

export interface PersonView {
  id: string
  name: string
  fullName?: string | null
  aliases: string[]
  birth: DatedView | null
  death: DatedView | null
  wikidata?: string | null
  links: string[]
  biography?: string
  biographyCites: number[]
  ordinations: OrdinationView[]
  ordained: OrdainedView[]
  affiliations: AffiliationView[]
  events: (ClaimView & { type: string; date: string | null; jurisdiction: JurisdictionRef | null; description: string })[]
  /** Da própria pessoa até o sagrante principal mais antigo conhecido. */
  succession: SuccessionStep[]
  /** Por que a linha de sucessão parou. */
  successionEnd: 'unknown_consecrator' | 'no_episcopate' | 'cycle' | null
  footnotes: Footnote[]
}

export interface RelationView extends ClaimView {
  type: TRelation['type']
  other: JurisdictionRef
  date?: string | null
  end?: string | null
  ledBy: PersonRef[]
}

export interface MemberView extends ClaimView {
  person: PersonRef
  role: TAffiliation['role']
  roleDescription?: string
  diocese: JurisdictionRef | null
  start?: string | null
  end?: string | null
  endReason?: TAffiliation['end_reason']
}

export interface JurisdictionView {
  id: string
  acronym?: string | null
  name: string
  aliases: string[]
  type: TJurisdiction['type']
  tradition?: TJurisdiction['tradition']
  country?: string | null
  founded: DatedView | null
  dissolved: DatedView | null
  locatorSlug?: string | null
  wikidata?: string | null
  website?: string | null
  description?: string
  descriptionCites: number[]
  /** Relações declaradas por esta jurisdição (ela é a origem). */
  relations: RelationView[]
  /** Relações de outras jurisdições que apontam para esta. */
  inbound: RelationView[]
  members: MemberView[]
  footnotes: Footnote[]
}

export interface BaseIndex {
  people: Map<string, TPerson>
  jurisdictions: Map<string, TJurisdiction>
  sources: Map<string, TSource>
  /** Ids antigos → id atual (para redirecionar links). */
  formerPeople: Map<string, string>
  formerJurisdictions: Map<string, string>
}

export function indexBase(base: Base): BaseIndex {
  const index: BaseIndex = {
    people: new Map(base.people.map((p) => [p.id, p])),
    jurisdictions: new Map(base.jurisdictions.map((j) => [j.id, j])),
    sources: new Map(base.sources.map((s) => [s.id, s])),
    formerPeople: new Map(),
    formerJurisdictions: new Map()
  }
  for (const p of base.people) for (const f of p.former_ids ?? []) index.formerPeople.set(f, p.id)
  for (const j of base.jurisdictions) for (const f of j.former_ids ?? []) index.formerJurisdictions.set(f, j.id)
  return index
}

const PERSON_FIELDS = new Set(['ordained_by', 'principal_consecrator', 'co_consecrators', 'led_by'])
const JURISDICTION_FIELDS = new Set(['jurisdiction', 'diocese', 'target'])

/** Acumula notas de rodapé, reaproveitando o número quando fonte + trecho se repetem. */
class Footnotes {
  readonly list: Footnote[] = []
  private readonly seen = new Map<string, number>()

  constructor(private readonly index: BaseIndex) {}

  cite(refs: TSourceRef[] | undefined): number[] {
    const numbers: number[] = []
    for (const ref of refs ?? []) {
      const source = this.index.sources.get(ref.source)
      if (!source) continue
      const key = `${ref.source}\u0000${ref.quote ?? ''}\u0000${ref.page ?? ''}`
      let n = this.seen.get(key)
      if (!n) {
        n = this.list.length + 1
        this.seen.set(key, n)
        this.list.push({ n, source: summarize(source), quote: ref.quote, page: ref.page })
      }
      if (!numbers.includes(n)) numbers.push(n)
    }
    return numbers
  }
}

function summarize(s: TSource): SourceSummary {
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    author: s.author,
    publisher: s.publisher,
    url: s.url,
    archive_url: s.archive_url,
    published: s.published,
    level: s.level
  }
}

function personRef(index: BaseIndex, id: string): PersonRef {
  return { id, name: index.people.get(id)?.name ?? id }
}

function jurisdictionRef(index: BaseIndex, id: string): JurisdictionRef {
  const j = index.jurisdictions.get(id)
  return { id, name: j?.name ?? id, acronym: j?.acronym }
}

function claim(
  index: BaseIndex,
  notes: Footnotes,
  c: { status: TOrdination['status']; sources: TSourceRef[]; notes?: string; discrepancies?: NonNullable<TOrdination['discrepancies']> }
): ClaimView {
  return {
    status: c.status,
    cites: notes.cite(c.sources),
    notes: c.notes,
    discrepancies: (c.discrepancies ?? []).map((d) => {
      const values = d.value === null ? [] : Array.isArray(d.value) ? d.value : [d.value]
      const refs = PERSON_FIELDS.has(d.field)
        ? values.map((v) => personRef(index, v))
        : JURISDICTION_FIELDS.has(d.field)
          ? values.map((v) => jurisdictionRef(index, v))
          : undefined
      return { field: d.field, value: d.value, refs, cites: notes.cite(d.sources), notes: d.notes }
    })
  }
}

function mainEpiscopate(p: TPerson): TOrdination | undefined {
  const list = (p.ordinations ?? []).filter((o) => o.order === 'episcopate')
  return list.find((o) => !o.mode || o.mode === 'normal') ?? list[0]
}

const byDate = <T extends { date?: string | null }>(a: T, b: T) => (a.date ?? '9999').localeCompare(b.date ?? '9999')
const byStart = <T extends { start?: string | null }>(a: T, b: T) => (a.start ?? '9999').localeCompare(b.start ?? '9999')

export function personView(index: BaseIndex, id: string): PersonView | null {
  const p = index.people.get(id)
  if (!p) return null
  const notes = new Footnotes(index)
  const ref = (pid: string | null | undefined) => (pid ? personRef(index, pid) : null)
  const jref = (jid: string | null | undefined) => (jid ? jurisdictionRef(index, jid) : null)

  const biographyCites = notes.cite(p.sources)
  const dated = (d: TPerson['birth']): DatedView | null =>
    d ? { date: d.date, place: d.place, cites: notes.cite(d.sources) } : null
  const birth = dated(p.birth)
  const death = dated(p.death)

  const ordinations: OrdinationView[] = (p.ordinations ?? []).map((o) => ({
    ...claim(index, notes, o),
    order: o.order,
    date: o.date,
    place: o.place,
    jurisdiction: jref(o.jurisdiction),
    office: o.office,
    mode: o.mode,
    ordainedBy: ref(o.ordained_by),
    principalConsecrator: ref(o.principal_consecrator),
    coConsecrators: (o.co_consecrators ?? []).map((c) => personRef(index, c))
  }))

  const affiliations: AffiliationView[] = (p.affiliations ?? [])
    .map((a) => ({
      ...claim(index, notes, a),
      jurisdiction: jurisdictionRef(index, a.jurisdiction),
      diocese: jref(a.diocese),
      role: a.role,
      roleDescription: a.role_description,
      start: a.start,
      end: a.end,
      endReason: a.end_reason
    }))
    .sort(byStart)

  const events = (p.events ?? [])
    .map((e) => ({
      ...claim(index, notes, e),
      type: e.type,
      date: e.date,
      jurisdiction: jref(e.jurisdiction),
      description: e.description
    }))
    .sort(byDate)

  // Quem esta pessoa ordenou ou sagrou (relação invertida).
  const ordained: OrdainedView[] = []
  for (const other of index.people.values()) {
    for (const o of other.ordinations ?? []) {
      const role =
        o.principal_consecrator === id ? 'principal' : o.co_consecrators?.includes(id) ? 'co' : o.ordained_by === id ? 'ordainer' : null
      if (role) {
        ordained.push({
          person: personRef(index, other.id),
          order: o.order,
          role,
          date: o.date,
          jurisdiction: jref(o.jurisdiction),
          status: o.status
        })
      }
    }
  }
  ordained.sort(byDate)

  // Linha de sucessão pelos sagrantes principais.
  const succession: SuccessionStep[] = []
  let successionEnd: PersonView['successionEnd'] = null
  const visited = new Set<string>()
  let current: TPerson | undefined = p
  while (current) {
    if (visited.has(current.id)) {
      successionEnd = 'cycle'
      break
    }
    visited.add(current.id)
    const consecration = mainEpiscopate(current)
    succession.push({ person: personRef(index, current.id), date: consecration?.date ?? null, status: consecration?.status })
    if (!consecration) {
      successionEnd = 'no_episcopate'
      break
    }
    if (!consecration.principal_consecrator) {
      successionEnd = 'unknown_consecrator'
      break
    }
    current = index.people.get(consecration.principal_consecrator)
  }
  // Quem nem é bispo não tem linha de sucessão a mostrar.
  if (succession.length === 1 && successionEnd === 'no_episcopate') succession.length = 0

  return {
    id: p.id,
    name: p.name,
    fullName: p.full_name,
    aliases: p.aliases ?? [],
    birth,
    death,
    wikidata: p.wikidata,
    links: p.links ?? [],
    biography: p.biography,
    biographyCites,
    ordinations,
    ordained,
    affiliations,
    events,
    succession,
    successionEnd,
    footnotes: notes.list
  }
}

export function jurisdictionView(index: BaseIndex, id: string): JurisdictionView | null {
  const j = index.jurisdictions.get(id)
  if (!j) return null
  const notes = new Footnotes(index)
  const descriptionCites = notes.cite(j.sources)
  const dated = (d: TJurisdiction['founded']): DatedView | null =>
    d ? { date: d.date, place: d.place, cites: notes.cite(d.sources) } : null

  const relationView = (r: TRelation, other: string): RelationView => ({
    ...claim(index, notes, r),
    type: r.type,
    other: jurisdictionRef(index, other),
    date: r.date,
    end: r.end,
    ledBy: (r.led_by ?? []).map((pid) => personRef(index, pid))
  })

  const relations = (j.relations ?? []).map((r) => relationView(r, r.target)).sort(byDate)
  const inbound: RelationView[] = []
  for (const other of index.jurisdictions.values()) {
    for (const r of other.relations ?? []) {
      if (r.target === id) inbound.push(relationView(r, other.id))
    }
  }
  inbound.sort(byDate)

  const members: MemberView[] = []
  for (const p of index.people.values()) {
    for (const a of p.affiliations ?? []) {
      if (a.jurisdiction !== id && a.diocese !== id) continue
      members.push({
        ...claim(index, notes, a),
        person: personRef(index, p.id),
        role: a.role,
        roleDescription: a.role_description,
        diocese: a.diocese && a.diocese !== id ? jurisdictionRef(index, a.diocese) : null,
        start: a.start,
        end: a.end,
        endReason: a.end_reason
      })
    }
  }
  members.sort(byStart)

  return {
    id: j.id,
    acronym: j.acronym,
    name: j.name,
    aliases: j.aliases ?? [],
    type: j.type,
    tradition: j.tradition,
    country: j.country,
    founded: dated(j.founded),
    dissolved: dated(j.dissolved),
    locatorSlug: j.locator_slug,
    wikidata: j.wikidata,
    website: j.website,
    description: j.description,
    descriptionCites,
    relations,
    inbound,
    members,
    footnotes: notes.list
  }
}

// ---------------------------------------------------------------------------
// Fontes: tudo o que uma fonte sustenta, e a bibliografia com contagens.
// ---------------------------------------------------------------------------

export type EntityKind = 'person' | 'jurisdiction'

export interface EntityRef {
  kind: EntityKind
  id: string
  name: string
}

/** Seção da ficha onde a afirmação aparece (vira âncora no link). */
export type ClaimSection =
  | 'resumo'
  | 'ordenacoes'
  | 'trajetoria'
  | 'eventos'
  | 'origem'

export interface SupportedClaim {
  entity: EntityRef
  section: ClaimSection
  /** Descrição curta da afirmação ("Episcopado, 8 dez. 2012"). */
  claim: string
  /** Complemento (local, descrição do evento...). */
  detail?: string
  status: TOrdination['status'] | null
  quote?: string
  page?: string
  /** Quando a fonte sustenta uma versão divergente, qual ("data: 8 dez. 2018"). */
  discrepancy?: string
}

export interface SourceView {
  source: TSource
  claims: SupportedClaim[]
  /** Quantas entidades distintas a fonte sustenta. */
  entities: number
}

export interface SourceListItem extends SourceSummary {
  accessed?: string | null
  language?: string
  claims: number
  entities: number
}

interface Citation {
  ref: TSourceRef
  claim: Omit<SupportedClaim, 'quote' | 'page'>
}

function discrepancyText(index: BaseIndex, d: { field: string; value?: string | string[] | null }): string {
  const label = FIELD_LABEL[d.field] ?? d.field
  if (d.value === null || d.value === undefined) return `${label}: não informado`
  const values = Array.isArray(d.value) ? d.value : [d.value]
  const text = values
    .map((v) => {
      if (PERSON_FIELDS.has(d.field)) return personRef(index, v).name
      if (JURISDICTION_FIELDS.has(d.field)) return jurisdictionRef(index, v).acronym ?? jurisdictionRef(index, v).name
      return /^(c\.)?\d{4}/.test(v) ? formatDate(v) : v
    })
    .join(', ')
  return `${label}: ${text}`
}

/** Percorre todas as citações da base, com uma descrição legível da afirmação citada. */
function* citations(index: BaseIndex): Generator<Citation> {
  const emit = function* (
    refs: TSourceRef[] | undefined,
    claim: Citation['claim'],
    discrepancies?: NonNullable<TOrdination['discrepancies']>
  ): Generator<Citation> {
    for (const ref of refs ?? []) yield { ref, claim }
    for (const d of discrepancies ?? []) {
      const discrepancy = discrepancyText(index, d)
      for (const ref of d.sources) yield { ref, claim: { ...claim, discrepancy } }
    }
  }
  const jname = (id: string | null | undefined) => {
    if (!id) return ''
    const j = jurisdictionRef(index, id)
    return j.acronym ?? j.name
  }

  for (const p of index.people.values()) {
    const entity: EntityRef = { kind: 'person', id: p.id, name: p.name }
    yield* emit(p.sources, { entity, section: 'resumo', claim: 'Biografia', status: null })
    if (p.birth) yield* emit(p.birth.sources, { entity, section: 'resumo', claim: `Nascimento${p.birth.date ? `, ${formatDate(p.birth.date)}` : ''}`, detail: p.birth.place ?? undefined, status: null })
    if (p.death) yield* emit(p.death.sources, { entity, section: 'resumo', claim: `Falecimento${p.death.date ? `, ${formatDate(p.death.date)}` : ''}`, detail: p.death.place ?? undefined, status: null })
    for (const o of p.ordinations ?? []) {
      const who = o.order === 'episcopate' ? o.principal_consecrator : o.ordained_by
      const detail = [o.jurisdiction ? jname(o.jurisdiction) : '', who ? `por ${personRef(index, who).name}` : ''].filter(Boolean).join(' · ')
      yield* emit(
        o.sources,
        { entity, section: 'ordenacoes', claim: `${ORDER_LABEL[o.order]}${o.date ? `, ${formatDate(o.date)}` : ''}`, detail: detail || undefined, status: o.status },
        o.discrepancies
      )
    }
    for (const a of p.affiliations ?? []) {
      const role = a.role === 'other' && a.role_description ? a.role_description : ROLE_LABEL[a.role]
      const period = formatPeriod(a.start, a.end)
      yield* emit(
        a.sources,
        { entity, section: 'trajetoria', claim: `${role} — ${jname(a.diocese ?? a.jurisdiction)}${period ? `, ${period}` : ''}`, status: a.status },
        a.discrepancies
      )
    }
    for (const e of p.events ?? []) {
      yield* emit(
        e.sources,
        { entity, section: 'eventos', claim: `${EVENT_LABEL[e.type]}${e.date ? `, ${formatDate(e.date)}` : ''}`, detail: e.description, status: e.status },
        e.discrepancies
      )
    }
  }

  for (const j of index.jurisdictions.values()) {
    const entity: EntityRef = { kind: 'jurisdiction', id: j.id, name: j.acronym ?? j.name }
    yield* emit(j.sources, { entity, section: 'resumo', claim: 'Descrição', status: null })
    if (j.founded) yield* emit(j.founded.sources, { entity, section: 'resumo', claim: `Fundação${j.founded.date ? `, ${formatDate(j.founded.date)}` : ''}`, detail: j.founded.place ?? undefined, status: null })
    if (j.dissolved) yield* emit(j.dissolved.sources, { entity, section: 'resumo', claim: `Extinção${j.dissolved.date ? `, ${formatDate(j.dissolved.date)}` : ''}`, status: null })
    for (const r of j.relations ?? []) {
      const period = formatPeriod(r.date, r.end).replace(/^desde /, '')
      yield* emit(
        r.sources,
        { entity, section: 'origem', claim: `${RELATION_LABEL[r.type]} ${jname(r.target)}${period ? `, ${period}` : ''}`, status: r.status },
        r.discrepancies
      )
    }
  }
}

/** Ficha de uma fonte: metadados e cada afirmação que ela sustenta, com o trecho citado. */
export function sourceView(index: BaseIndex, id: string): SourceView | null {
  const source = index.sources.get(id)
  if (!source) return null
  const claims: SupportedClaim[] = []
  const entities = new Set<string>()
  for (const { ref, claim } of citations(index)) {
    if (ref.source !== id) continue
    claims.push({ ...claim, quote: ref.quote, page: ref.page })
    entities.add(`${claim.entity.kind}:${claim.entity.id}`)
  }
  // Pessoas antes de jurisdições; dentro de cada entidade, a ordem do arquivo.
  const rank = (k: EntityKind) => (k === 'person' ? 0 : 1)
  claims.sort((a, b) => rank(a.entity.kind) - rank(b.entity.kind) || a.entity.name.localeCompare(b.entity.name, 'pt-BR'))
  return { source, claims, entities: entities.size }
}

/** Bibliografia: toda fonte com quantas afirmações e entidades sustenta. */
export function sourceList(index: BaseIndex): SourceListItem[] {
  const counts = new Map<string, { claims: number; entities: Set<string> }>()
  for (const { ref, claim } of citations(index)) {
    const c = counts.get(ref.source) ?? { claims: 0, entities: new Set<string>() }
    c.claims++
    c.entities.add(`${claim.entity.kind}:${claim.entity.id}`)
    counts.set(ref.source, c)
  }
  return [...index.sources.values()]
    .map((s) => ({
      ...summarize(s),
      accessed: s.accessed,
      language: s.language,
      claims: counts.get(s.id)?.claims ?? 0,
      entities: counts.get(s.id)?.entities.size ?? 0
    }))
    .sort((a, b) => b.claims - a.claims || a.title.localeCompare(b.title, 'pt-BR'))
}
