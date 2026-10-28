import type { Base, TAffiliation, TJurisdiction, TOrdination, TPerson, TRelation } from '../schemas'
import { claimIds } from '../sql/build'

/**
 * Fichas enxutas para o agente: texto compacto com o `claim_id` de cada afirmação entre colchetes.
 * As fichas completas (`personView`) chegam a 1 MB (Robinson Cavalcanti, IEAB, Diocese do Recife);
 * aqui cada lista tem teto e o resto fica para a ferramenta `sql`. Alvo: ≤ 10 KB por ficha.
 */

export interface Brief {
  text: string
  /** Afirmações citáveis que o texto mostra. */
  claims: string[]
}

const LIMITS = { affiliations: 30, events: 15, ordained: 20, members: 30, relations: 40, bio: 600, description: 600, eventText: 200 }

const EPISCOPAL = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop'])

const cut = (s: string | undefined | null, n: number) => {
  if (!s) return ''
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n)}…` : flat
}
const sortKey = (d: string | null | undefined) => (d ? d.replace(/^c\./, '') : '9999')

interface Ordained {
  person: string
  order: TOrdination['order']
  date: string | null
  claim: string
  role: 'ordainer' | 'principal' | 'co'
}

interface Membership {
  person: string
  index: number
  a: TAffiliation
}

export interface Briefs {
  person(id: string): Brief | null
  jurisdiction(id: string): Brief | null
}

export function createBriefs(base: Base): Briefs {
  const people = new Map(base.people.map((p) => [p.id, p]))
  const jurisdictions = new Map(base.jurisdictions.map((j) => [j.id, j]))
  const ordained = new Map<string, Ordained[]>()
  const members = new Map<string, Membership[]>()
  const inbound = new Map<string, { from: string; index: number; r: TRelation }[]>()
  const push = <T>(map: Map<string, T[]>, key: string, value: T) => map.set(key, [...(map.get(key) ?? []), value])

  for (const p of base.people) {
    p.ordinations?.forEach((o, i) => {
      const claim = claimIds.ordination(p.id, i)
      const entry = { person: p.id, order: o.order, date: o.date, claim }
      if (o.ordained_by) push(ordained, o.ordained_by, { ...entry, role: 'ordainer' })
      if (o.principal_consecrator) push(ordained, o.principal_consecrator, { ...entry, role: 'principal' })
      for (const c of o.co_consecrators ?? []) push(ordained, c, { ...entry, role: 'co' })
    })
    p.affiliations?.forEach((a, i) => {
      push(members, a.jurisdiction, { person: p.id, index: i, a })
      if (a.diocese && a.diocese !== a.jurisdiction) push(members, a.diocese, { person: p.id, index: i, a })
    })
  }
  for (const j of base.jurisdictions) j.relations?.forEach((r, i) => push(inbound, r.target, { from: j.id, index: i, r }))

  const pname = (id: string | null | undefined) => (id ? `p:${id} (${people.get(id)?.name ?? '?'})` : '—')
  const jname = (id: string | null | undefined) => {
    if (!id) return '—'
    const j = jurisdictions.get(id)
    return `j:${id} (${j ? (j.acronym ?? j.name) : '?'})`
  }
  const disc = (list: TOrdination['discrepancies']) =>
    list?.length ? ` · divergências: ${list.map((d) => `${d.field}=${Array.isArray(d.value) ? d.value.join('/') : (d.value ?? 'nulo')}`).join('; ')}` : ''
  const period = (start?: string | null, end?: string | null) => (start || end ? `${start ?? '?'}–${end ?? ''}` : 'sem datas')

  function person(id: string): Brief | null {
    const p = people.get(id)
    if (!p) return null
    const claims: string[] = []
    const lines: string[] = []
    const claim = (c: string) => (claims.push(c), `[${c}]`)

    lines.push(`PESSOA p:${p.id} · ${p.name}`)
    const extra = [p.full_name && `nome completo: ${p.full_name}`, p.aliases?.length && `também: ${p.aliases.slice(0, 5).join('; ')}`].filter(Boolean)
    if (extra.length) lines.push(extra.join(' · '))
    const vital = [
      p.birth && `nascimento: ${p.birth.date ?? '?'}${p.birth.place ? ` em ${p.birth.place}` : ''} ${claim(`p:${p.id}/birth`)}`,
      p.death && `falecimento: ${p.death.date ?? '?'}${p.death.place ? ` em ${p.death.place}` : ''} ${claim(`p:${p.id}/death`)}`
    ].filter(Boolean)
    if (vital.length) lines.push(vital.join(' · '))
    if (p.biography) lines.push(`resumo ${p.sources?.length ? claim(`p:${p.id}`) : ''}: ${cut(p.biography, LIMITS.bio)}`)

    const ords = p.ordinations ?? []
    lines.push(ords.length ? 'ORDENAÇÕES' : 'ORDENAÇÕES: nenhuma registrada')
    ords.forEach((o, i) => {
      const who = o.order === 'episcopate'
        ? `sagrante principal ${pname(o.principal_consecrator)}${o.co_consecrators?.length ? ` · co-sagrantes ${o.co_consecrators.map(pname).join(', ')}` : ''}`
        : `por ${pname(o.ordained_by)}`
      const meta = [o.office && `ofício ${o.office}`, o.mode && o.mode !== 'normal' && `modo ${o.mode}`, o.place && `local ${o.place}`].filter(Boolean).join(' · ')
      lines.push(`${claim(claimIds.ordination(p.id, i))} ${o.order} ${o.date ?? 'sem data'} · jurisdição ${jname(o.jurisdiction)} · ${who}${meta ? ` · ${meta}` : ''} · ${o.status}${disc(o.discrepancies)}`)
    })

    const affs = (p.affiliations ?? []).map((a, i) => ({ a, i }))
    if (affs.length) {
      // Cargos episcopais primeiro; depois por data.
      const chosen = [...affs]
        .sort((x, y) => Number(EPISCOPAL.has(y.a.role)) - Number(EPISCOPAL.has(x.a.role)) || sortKey(x.a.start ?? x.a.end).localeCompare(sortKey(y.a.start ?? y.a.end)))
        .slice(0, LIMITS.affiliations)
        .sort((x, y) => sortKey(x.a.start ?? x.a.end).localeCompare(sortKey(y.a.start ?? y.a.end)))
      lines.push(`VÍNCULOS (${chosen.length} de ${affs.length}${affs.length > chosen.length ? '; o resto via sql em affiliations' : ''})`)
      for (const { a, i } of chosen) {
        const role = a.role === 'other' && a.role_description ? `other (${cut(a.role_description, 80)})` : a.role
        const where = a.diocese && a.diocese !== a.jurisdiction ? `${jname(a.diocese)} em ${jname(a.jurisdiction)}` : jname(a.jurisdiction)
        lines.push(`${claim(claimIds.affiliation(p.id, i))} ${role} · ${where} · ${period(a.start, a.end)}${a.end_reason ? ` · fim: ${a.end_reason}` : ''} · ${a.status}${disc(a.discrepancies)}`)
      }
    }

    const events = (p.events ?? []).map((e, i) => ({ e, i }))
    if (events.length) {
      const chosen = [...events]
        .sort((x, y) => Number(x.e.type === 'other') - Number(y.e.type === 'other') || sortKey(x.e.date).localeCompare(sortKey(y.e.date)))
        .slice(0, LIMITS.events)
        .sort((x, y) => sortKey(x.e.date).localeCompare(sortKey(y.e.date)))
      lines.push(`EVENTOS (${chosen.length} de ${events.length}${events.length > chosen.length ? '; o resto via sql em events' : ''})`)
      for (const { e, i } of chosen) lines.push(`${claim(claimIds.event(p.id, i))} ${e.date ?? 'sem data'} ${e.type}: ${cut(e.description, LIMITS.eventText)} · ${e.status}`)
    }

    const done = ordained.get(p.id) ?? []
    if (done.length) {
      const count = (f: (o: Ordained) => boolean) => done.filter(f).length
      lines.push(
        `ORDENOU/SAGROU: ${count((o) => o.order === 'diaconate')} diaconatos, ${count((o) => o.order === 'presbyterate')} presbiteratos, ` +
          `${count((o) => o.role === 'principal')} sagrações como sagrante principal, ${count((o) => o.role === 'co')} como co-sagrante` +
          (done.length > LIMITS.ordained ? ` (exemplos abaixo; lista completa via sql em ordinations/co_consecrators)` : '')
      )
      const sample = [...done].sort((x, y) => Number(y.order === 'episcopate') - Number(x.order === 'episcopate') || sortKey(x.date).localeCompare(sortKey(y.date))).slice(0, LIMITS.ordained)
      for (const o of sample) lines.push(`${claim(o.claim)} ${pname(o.person)} · ${o.order} ${o.date ?? 'sem data'} · como ${o.role}`)
    }
    return { text: lines.join('\n'), claims }
  }

  function jurisdiction(id: string): Brief | null {
    const j = jurisdictions.get(id)
    if (!j) return null
    const claims: string[] = []
    const lines: string[] = []
    const claim = (c: string) => (claims.push(c), `[${c}]`)
    const facts = (d: TJurisdiction['founded'], label: string, c: string) => (d ? `${label}: ${d.date ?? '?'}${d.place ? ` em ${d.place}` : ''} ${claim(c)}` : null)

    lines.push(`JURISDIÇÃO j:${j.id} · ${j.acronym ? `${j.acronym} — ` : ''}${j.name}`)
    lines.push(
      [`tipo ${j.type}`, j.tradition && `tradição ${j.tradition}`, j.country && `país ${j.country}`, facts(j.founded, 'fundação', `j:${j.id}/founded`), facts(j.dissolved, 'extinção', `j:${j.id}/dissolved`)]
        .filter(Boolean)
        .join(' · ')
    )
    if (j.description) lines.push(`descrição ${j.sources?.length ? claim(`j:${j.id}`) : ''}: ${cut(j.description, LIMITS.description)}`)

    const out = (j.relations ?? []).map((r, i) => ({ r, i }))
    if (out.length) {
      lines.push(`RELAÇÕES (desta jurisdição para outras)`)
      for (const { r, i } of out.slice(0, LIMITS.relations)) {
        lines.push(`${claim(claimIds.relation(j.id, i))} ${r.type} ${jname(r.target)} · ${period(r.date, r.end)}${r.led_by?.length ? ` · liderada por ${r.led_by.map(pname).join(', ')}` : ''} · ${r.status}`)
      }
    }
    const inc = inbound.get(j.id) ?? []
    if (inc.length) {
      lines.push(`RELAÇÕES (de outras para esta; ${Math.min(inc.length, LIMITS.relations)} de ${inc.length})`)
      for (const { from, index, r } of [...inc].sort((x, y) => sortKey(x.r.date).localeCompare(sortKey(y.r.date))).slice(0, LIMITS.relations)) {
        lines.push(`${claim(claimIds.relation(from, index))} ${jname(from)} ${r.type} esta · ${period(r.date, r.end)}${r.led_by?.length ? ` · liderada por ${r.led_by.map(pname).join(', ')}` : ''} · ${r.status}`)
      }
    }

    const ms = members.get(j.id) ?? []
    if (ms.length) {
      const byRole = new Map<string, number>()
      for (const m of ms) byRole.set(m.a.role, (byRole.get(m.a.role) ?? 0) + 1)
      const peopleCount = new Set(ms.map((m) => m.person)).size
      lines.push(`MEMBROS: ${ms.length} vínculos de ${peopleCount} pessoas; por papel: ${[...byRole].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(', ')}`)
      const chosen = [...ms]
        .sort((x, y) => Number(EPISCOPAL.has(y.a.role)) - Number(EPISCOPAL.has(x.a.role)) || sortKey(x.a.start ?? x.a.end).localeCompare(sortKey(y.a.start ?? y.a.end)))
        .slice(0, LIMITS.members)
      lines.push(`exemplos (${chosen.length}; bispos primeiro, por data; o resto via sql em affiliations):`)
      for (const m of chosen) {
        const where = m.a.diocese && m.a.diocese !== j.id && m.a.jurisdiction === j.id ? ` · ${jname(m.a.diocese)}` : ''
        lines.push(`${claim(claimIds.affiliation(m.person, m.index))} ${pname(m.person)} · ${m.a.role}${where} · ${period(m.a.start, m.a.end)}${m.a.end_reason ? ` · fim: ${m.a.end_reason}` : ''} · ${m.a.status}`)
      }
    }
    return { text: lines.join('\n'), claims }
  }

  return { person, jurisdiction }
}

export type { TPerson }
