import { definitelyBefore } from './dates'
import { normalizeName } from './text'
import type { Base, TOrdination, TPerson, TSource, TSourceRef } from './schemas'

export interface Finding {
  /** "person:<id>", "jurisdiction:<id>" ou "source:<id>". */
  entity: string
  path?: string
  message: string
}

export interface Report {
  /** Bloqueiam o merge. */
  errors: Finding[]
  /** Suspeitas que merecem revisão humana. */
  warnings: Finding[]
  /** O que falta pesquisar. Nunca bloqueia. */
  gaps: Finding[]
}

const EPISCOPAL_ROLES = new Set([
  'bishop',
  'diocesan_bishop',
  'coadjutor_bishop',
  'suffragan_bishop',
  'auxiliary_bishop',
  'missionary_bishop',
  'primate',
  'archbishop'
])

const ORDER_SEQUENCE = ['diaconate', 'presbyterate', 'episcopate'] as const

export { normalizeName }

const ORDER_LABEL: Record<TOrdination['order'], string> = {
  diaconate: 'diaconato',
  presbyterate: 'presbiterato',
  episcopate: 'episcopado'
}

/** Ordenação "principal" de uma pessoa numa ordem (ignora condicionais/reordenações). */
function mainOrdination(p: TPerson, order: TOrdination['order']): TOrdination | undefined {
  const list = (p.ordinations ?? []).filter((o) => o.order === order)
  return list.find((o) => !o.mode || o.mode === 'normal') ?? list[0]
}

export function validateBase(base: Base): Report {
  const errors: Finding[] = []
  const warnings: Finding[] = []
  const gaps: Finding[] = []

  const people = new Map<string, TPerson>()
  const jurisdictions = new Set<string>()
  const sources = new Map<string, TSource>()
  const usedSources = new Set<string>()

  // --- Ids únicos (incluindo ids antigos) ---------------------------------
  const register = (seen: Set<string>, ids: string[], entity: string) => {
    for (const id of ids) {
      if (seen.has(id)) errors.push({ entity, message: `id duplicado: "${id}"` })
      seen.add(id)
    }
  }
  const personIds = new Set<string>()
  for (const p of base.people) {
    register(personIds, [p.id, ...(p.former_ids ?? [])], `person:${p.id}`)
    people.set(p.id, p)
  }
  const jurisdictionIds = new Set<string>()
  for (const j of base.jurisdictions) {
    register(jurisdictionIds, [j.id, ...(j.former_ids ?? [])], `jurisdiction:${j.id}`)
    jurisdictions.add(j.id)
  }
  const sourceIds = new Set<string>()
  for (const s of base.sources) {
    register(sourceIds, [s.id], `source:${s.id}`)
    sources.set(s.id, s)
  }

  // --- Helpers de referência ----------------------------------------------
  const requirePerson = (id: string | null | undefined, entity: string, path: string) => {
    if (id && !people.has(id)) errors.push({ entity, path, message: `pessoa inexistente: "${id}"` })
  }
  const requireJurisdiction = (id: string | null | undefined, entity: string, path: string) => {
    if (id && !jurisdictions.has(id)) errors.push({ entity, path, message: `jurisdição inexistente: "${id}"` })
  }
  const checkSources = (refs: TSourceRef[] | undefined, entity: string, path: string) => {
    for (const [i, ref] of (refs ?? []).entries()) {
      const source = sources.get(ref.source)
      if (!source) {
        errors.push({ entity, path: `${path}.sources[${i}]`, message: `fonte inexistente: "${ref.source}"` })
        continue
      }
      usedSources.add(ref.source)
      if (!ref.quote && source.type !== 'personal_testimony' && source.type !== 'wikidata') {
        warnings.push({ entity, path: `${path}.sources[${i}]`, message: `referência a "${ref.source}" sem trecho citado` })
      }
    }
  }
  const checkClaim = (claim: { sources: TSourceRef[]; discrepancies?: { sources: TSourceRef[] }[] }, entity: string, path: string) => {
    checkSources(claim.sources, entity, path)
    for (const [k, d] of (claim.discrepancies ?? []).entries()) checkSources(d.sources, entity, `${path}.discrepancies[${k}]`)
  }

  // --- Pessoas -------------------------------------------------------------
  for (const p of base.people) {
    const entity = `person:${p.id}`
    checkSources(p.sources, entity, 'sources')
    checkSources(p.birth?.sources, entity, 'birth')
    checkSources(p.death?.sources, entity, 'death')
    if (p.photo?.source && !sources.has(p.photo.source)) {
      errors.push({ entity, path: 'photo.source', message: `fonte inexistente: "${p.photo.source}"` })
    }
    const death = p.death?.date ?? null
    const birth = p.birth?.date ?? null

    for (const [i, o] of (p.ordinations ?? []).entries()) {
      const path = `ordinations[${i}]`
      const label = ORDER_LABEL[o.order]
      checkClaim(o, entity, path)
      requireJurisdiction(o.jurisdiction, entity, `${path}.jurisdiction`)

      const ordainers = o.order === 'episcopate' ? [o.principal_consecrator, ...(o.co_consecrators ?? [])] : [o.ordained_by]
      for (const id of ordainers) requirePerson(id, entity, path)
      if (ordainers.includes(p.id)) errors.push({ entity, path, message: 'pessoa aparece como ordenante de si mesma' })
      if (o.principal_consecrator && o.co_consecrators?.includes(o.principal_consecrator)) {
        errors.push({ entity, path, message: 'sagrante principal repetido entre os co-sagrantes' })
      }

      if (o.date && death && definitelyBefore(death, o.date)) {
        errors.push({ entity, path, message: `${label} em ${o.date} é posterior ao falecimento (${death})` })
      }
      if (o.date && birth && definitelyBefore(o.date, birth)) {
        errors.push({ entity, path, message: `${label} em ${o.date} é anterior ao nascimento (${birth})` })
      }

      // O ordenante precisa ser bispo (e estar vivo) na data.
      for (const id of ordainers) {
        const ordainer = id ? people.get(id) : undefined
        if (!ordainer) continue
        const consecration = mainOrdination(ordainer, 'episcopate')
        if (!consecration) {
          gaps.push({ entity: `person:${ordainer.id}`, message: `ordenou/sagrou ${p.id}, mas não tem sagração episcopal cadastrada` })
        } else if (o.date && consecration.date && definitelyBefore(o.date, consecration.date)) {
          errors.push({ entity, path, message: `${ordainer.id} só foi sagrado bispo em ${consecration.date}, depois deste ${label} (${o.date})` })
        }
        const ordainerDeath = ordainer.death?.date
        if (o.date && ordainerDeath && definitelyBefore(ordainerDeath, o.date)) {
          errors.push({ entity, path, message: `${ordainer.id} faleceu em ${ordainerDeath}, antes deste ${label} (${o.date})` })
        }
      }

      // Lacunas da própria ordenação.
      if (!o.date) gaps.push({ entity, path, message: `${label} sem data` })
      if (o.order === 'episcopate' && !o.principal_consecrator) gaps.push({ entity, path, message: 'sagração sem sagrante principal' })
      if (o.order !== 'episcopate' && !o.ordained_by) gaps.push({ entity, path, message: `${label} sem bispo ordenante` })
      if (!o.jurisdiction) gaps.push({ entity, path, message: `${label} sem jurisdição` })
    }

    // Sequência diaconato → presbiterato → episcopado.
    const mains = ORDER_SEQUENCE.map((order) => mainOrdination(p, order))
    for (let a = 0; a < mains.length; a++) {
      for (let b = a + 1; b < mains.length; b++) {
        const earlier = mains[a]
        const later = mains[b]
        if (earlier?.date && later?.date && definitelyBefore(later.date, earlier.date)) {
          errors.push({
            entity,
            message: `${ORDER_LABEL[later.order]} (${later.date}) antes de ${ORDER_LABEL[earlier.order]} (${earlier.date})`
          })
        }
      }
    }
    const highest = mains.findLastIndex(Boolean)
    for (let i = 0; i < highest; i++) {
      if (!mains[i]) gaps.push({ entity, message: `falta registrar o ${ORDER_LABEL[ORDER_SEQUENCE[i]]}` })
    }

    for (const [i, a] of (p.affiliations ?? []).entries()) {
      const path = `affiliations[${i}]`
      checkClaim(a, entity, path)
      requireJurisdiction(a.jurisdiction, entity, `${path}.jurisdiction`)
      requireJurisdiction(a.diocese, entity, `${path}.diocese`)
      if (a.start && a.end && definitelyBefore(a.end, a.start)) {
        errors.push({ entity, path, message: `fim (${a.end}) antes do início (${a.start})` })
      }
      if (EPISCOPAL_ROLES.has(a.role) && !mains[2]) {
        gaps.push({ entity, path, message: `vínculo como ${a.role} sem sagração episcopal cadastrada` })
      }
    }

    for (const [i, e] of (p.events ?? []).entries()) {
      checkClaim(e, entity, `events[${i}]`)
      requireJurisdiction(e.jurisdiction, entity, `events[${i}].jurisdiction`)
    }
  }

  // --- Jurisdições --------------------------------------------------------
  for (const j of base.jurisdictions) {
    const entity = `jurisdiction:${j.id}`
    checkSources(j.sources, entity, 'sources')
    checkSources(j.founded?.sources, entity, 'founded')
    checkSources(j.dissolved?.sources, entity, 'dissolved')
    if (!j.founded?.date) gaps.push({ entity, message: 'sem data de fundação' })
    for (const [i, r] of (j.relations ?? []).entries()) {
      const path = `relations[${i}]`
      checkClaim(r, entity, path)
      requireJurisdiction(r.target, entity, `${path}.target`)
      if (r.target === j.id) errors.push({ entity, path, message: 'relação da jurisdição com ela mesma' })
      for (const id of r.led_by ?? []) requirePerson(id, entity, `${path}.led_by`)
      if (r.date && r.end && definitelyBefore(r.end, r.date)) {
        errors.push({ entity, path, message: `fim (${r.end}) antes da data (${r.date})` })
      }
    }
  }

  // --- Ciclos de sagração (A sagrou B que sagrou A) -------------------------
  const consecrated = new Map<string, string[]>()
  for (const p of base.people) {
    for (const o of p.ordinations ?? []) {
      if (o.order !== 'episcopate') continue
      for (const c of [o.principal_consecrator, ...(o.co_consecrators ?? [])]) {
        if (c) consecrated.set(c, [...(consecrated.get(c) ?? []), p.id])
      }
    }
  }
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (id: string, trail: string[]) => {
    state.set(id, 'visiting')
    for (const child of consecrated.get(id) ?? []) {
      if (state.get(child) === 'visiting') {
        errors.push({ entity: `person:${child}`, message: `ciclo de sagração: ${[...trail, id, child].join(' → ')}` })
      } else if (!state.has(child)) {
        visit(child, [...trail, id])
      }
    }
    state.set(id, 'done')
  }
  for (const id of consecrated.keys()) if (!state.has(id)) visit(id, [])

  // --- Possíveis duplicatas -------------------------------------------------
  const findDuplicates = (kind: 'person' | 'jurisdiction', items: { id: string; names: (string | null | undefined)[] }[]) => {
    const byName = new Map<string, Set<string>>()
    for (const item of items) {
      for (const name of item.names) {
        if (!name) continue
        const key = normalizeName(name)
        byName.set(key, new Set([...(byName.get(key) ?? []), item.id]))
      }
    }
    for (const [name, ids] of byName) {
      if (ids.size > 1) warnings.push({ entity: `${kind}:${[...ids][0]}`, message: `possível duplicata ("${name}"): ${[...ids].join(', ')}` })
    }
  }
  findDuplicates('person', base.people.map((p) => ({ id: p.id, names: [p.name, p.full_name, ...(p.aliases ?? [])] })))
  findDuplicates('jurisdiction', base.jurisdictions.map((j) => ({ id: j.id, names: [j.name, j.acronym, ...(j.aliases ?? [])] })))

  // --- Fontes ---------------------------------------------------------------
  for (const s of base.sources) {
    if (!usedSources.has(s.id)) warnings.push({ entity: `source:${s.id}`, message: 'fonte não é usada por nenhuma afirmação' })
    if (s.url && !s.archive_url) gaps.push({ entity: `source:${s.id}`, message: 'sem snapshot arquivado (Wayback Machine)' })
  }

  return { errors, warnings, gaps }
}
