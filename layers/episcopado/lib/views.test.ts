import { describe, expect, it } from 'vitest'
import type { Base } from './schemas'
import { groupMembers, indexBase, oldestReachableLine, jurisdictionView, personView, sourceList, sourceView, type MemberView } from './views'

const s1 = [{ source: 's', quote: 'trecho um' }]
const s2 = [{ source: 's', quote: 'trecho dois' }]

const base: Base = {
  people: [
    { id: 'a', name: 'Ana', ordinations: [{ order: 'episcopate', date: '1990', jurisdiction: 'velha', principal_consecrator: null, status: 'confirmed', sources: s1 }] },
    {
      id: 'b',
      name: 'Bento',
      ordinations: [
        {
          order: 'episcopate',
          date: '2012-12-08',
          jurisdiction: 'nova',
          principal_consecrator: 'a',
          co_consecrators: ['c'],
          status: 'contested',
          sources: s1,
          discrepancies: [{ field: 'date', value: '2018-12-08', sources: s2 }]
        }
      ],
      affiliations: [{ jurisdiction: 'nova', role: 'primate', start: '2018', status: 'probable', sources: s1 }]
    },
    { id: 'c', name: 'Caio' }
  ],
  jurisdictions: [
    { id: 'velha', name: 'Igreja Velha', type: 'national_church' },
    { id: 'nova', name: 'Igreja Nova', acronym: 'IN', type: 'province', relations: [{ type: 'schism_from', target: 'velha', date: '2005', led_by: ['b'], status: 'confirmed', sources: s2 }] }
  ],
  sources: [{ id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' }]
}

const index = indexBase(base)

describe('personView', () => {
  it('resolve nomes, numera notas e reaproveita fonte + trecho repetidos', () => {
    const v = personView(index, 'b')!
    expect(v.ordinations[0].principalConsecrator).toEqual({ id: 'a', name: 'Ana' })
    expect(v.ordinations[0].coConsecrators).toEqual([{ id: 'c', name: 'Caio' }])
    expect(v.ordinations[0].cites).toEqual([1])
    expect(v.ordinations[0].discrepancies[0]).toMatchObject({ field: 'date', value: '2018-12-08', cites: [2] })
    expect(v.affiliations[0].cites).toEqual([1])
    expect(v.footnotes.map((f) => f.quote)).toEqual(['trecho um', 'trecho dois'])
  })

  it('monta a linha de sucessão até o sagrante desconhecido', () => {
    const v = personView(index, 'b')!
    expect(v.succession.map((s) => s.person.id)).toEqual(['b', 'a'])
    expect(v.successionEnd).toBe('unknown_consecrator')
  })

  it('lista quem a pessoa sagrou, como principal ou co-sagrante', () => {
    expect(personView(index, 'a')!.ordained).toMatchObject([{ person: { id: 'b' }, role: 'principal' }])
    expect(personView(index, 'c')!.ordained).toMatchObject([{ person: { id: 'b' }, role: 'co' }])
    expect(personView(index, 'c')!.succession).toEqual([])
  })

  it('retorna null para id desconhecido', () => {
    expect(personView(index, 'x')).toBeNull()
  })

  it('ordena a trajetória pelo início ou término, com saídas antes de entradas na mesma data', () => {
    const affiliation = (jurisdiction: string, role_description: string, start?: string, end?: string) =>
      ({ jurisdiction, role: 'other' as const, role_description, start, end, status: 'confirmed' as const, sources: jurisdiction === 'iab' ? s2 : s1 })
    const b: Base = { ...base, people: [{
      id: 'douglas', name: 'Douglas', affiliations: [
        affiliation('reb', 'clérigo', '2024-12'),
        affiliation('reb', 'presbítero', '2025-10'),
        affiliation('reb', 'custódio'),
        affiliation('iab', 'aspirante', undefined, '2024-12'),
        affiliation('iab', 'postulante', undefined, '2024-12'),
        affiliation('iab', 'membro', '2022-08', '2024-12'),
        affiliation('reb', 'presidente', '2026'),
        affiliation('reb', 'liturgia')
      ]
    }] }
    const v = personView(indexBase(b), 'douglas')!
    expect(v.affiliations.map((a) => a.roleDescription)).toEqual([
      'membro', 'aspirante', 'postulante', 'clérigo', 'presbítero', 'presidente', 'custódio', 'liturgia'
    ])
    expect(v.affiliations[1]).toMatchObject({ start: undefined, end: '2024-12', cites: [2] })
    expect(v.footnotes.map((f) => f.quote)).toEqual(['trecho um', 'trecho dois'])
  })

  it('ordena eventos com datas aproximadas e preserva a ordem dos empates e dos eventos sem data', () => {
    const dates = [null, '1900', 'c.1890', '1889', '1895/1898', '1890-03-16', '1890-03', '1890-03', null]
    const b: Base = { ...base, people: [{ id: 'k', name: 'K', events: dates.map((date, i) => ({
      type: 'other', date, description: String(i), status: 'confirmed', sources: s1
    })) }] }
    const v = personView(indexBase(b), 'k')!
    expect(v.events.map((e) => e.description)).toEqual(['3', '2', '6', '7', '5', '4', '1', '0', '8'])
    expect(v.events[1].date).toBe('c.1890')
  })

  it('mostra datas de nascimento divergentes com o nome do fato', () => {
    const b: Base = {
      ...base,
      people: [{ id: 'k', name: 'Kratz', birth: { date: '1920-12-19', sources: s1, discrepancies: [{ field: 'date', value: '1922', sources: s2 }] } }]
    }
    const v = personView(indexBase(b), 'k')!
    expect(v.birth).toMatchObject({ date: '1920-12-19', cites: [1], discrepancies: [{ field: 'birth.date', value: '1922', cites: [2] }] })
  })
})

describe('sourceView', () => {
  it('lista tudo o que a fonte sustenta, inclusive versões divergentes, com o trecho', () => {
    const v = sourceView(index, 's')!
    expect(v.source.title).toBe('Notícia')
    expect(v.entities).toBe(3)
    expect(v.claims).toContainEqual({
      entity: { kind: 'person', id: 'b', name: 'Bento' },
      section: 'ordenacoes',
      claim: 'Episcopado, 8 dez. 2012',
      detail: 'IN · por Ana',
      status: 'contested',
      quote: 'trecho um',
      page: undefined
    })
    expect(v.claims).toContainEqual(expect.objectContaining({ claim: 'Episcopado, 8 dez. 2012', discrepancy: 'data: 8 dez. 2018', quote: 'trecho dois' }))
    expect(v.claims).toContainEqual(expect.objectContaining({ entity: expect.objectContaining({ id: 'b' }), section: 'trajetoria', claim: 'Primaz — IN, desde 2018', status: 'probable' }))
    expect(v.claims).toContainEqual(expect.objectContaining({ entity: { kind: 'jurisdiction', id: 'nova', name: 'IN' }, section: 'origem', claim: 'Cisma de Igreja Velha, 2005' }))
    // Pessoas primeiro, depois jurisdições.
    expect(v.claims.map((c) => c.entity.kind)).toEqual(['person', 'person', 'person', 'person', 'jurisdiction'])
  })

  it('retorna null para fonte desconhecida', () => {
    expect(sourceView(index, 'x')).toBeNull()
  })
})

describe('sourceList', () => {
  it('conta afirmações e entidades por fonte', () => {
    expect(sourceList(index)).toMatchObject([{ id: 's', claims: 5, entities: 3, level: 'secondary' }])
  })
})

describe('jurisdictionView', () => {
  it('inverte relações e lista membros', () => {
    const velha = jurisdictionView(index, 'velha')!
    expect(velha.inbound).toMatchObject([{ type: 'schism_from', other: { id: 'nova' }, ledBy: [{ id: 'b', name: 'Bento' }] }])
    const nova = jurisdictionView(index, 'nova')!
    expect(nova.relations).toMatchObject([{ type: 'schism_from', other: { id: 'velha', name: 'Igreja Velha' } }])
    expect(nova.members).toMatchObject([{ person: { id: 'b' }, role: 'primate' }])
  })
})

describe('groupMembers', () => {
  const m = (id: string, role: MemberView['role'], start: string | null, extra: Partial<MemberView> = {}): MemberView => ({
    person: { id, name: id.toUpperCase() }, role, diocese: null, start, status: 'confirmed', cites: [1], discrepancies: [], ...extra
  })

  it('junta papéis da mesma pessoa no mesmo período numa linha só', () => {
    const [eric] = groupMembers([
      m('eric', 'diocesan_bishop', '2024-12-20', { cites: [18, 19] }),
      m('eric', 'founder', '2024-12-20', { cites: [22], status: 'probable' })
    ])
    expect(eric.lines).toHaveLength(1)
    expect(eric.lines[0].roles.map((r) => r.role)).toEqual(['diocesan_bishop', 'founder'])
    expect(eric.lines[0].cites).toEqual([18, 19, 22])
    expect(eric.lines[0].status).toBe('probable')
    expect(eric).toMatchObject({ episcopal: true, current: true })
  })

  it('mantém períodos diferentes como linhas separadas e ordena por início', () => {
    const groups = groupMembers([
      m('b', 'priest', '2010', { end: '2015' }),
      m('a', 'priest', '2005'),
      m('b', 'bishop', '2015')
    ])
    expect(groups.map((g) => g.person.id)).toEqual(['a', 'b'])
    expect(groups[1].lines.map((l) => l.start)).toEqual(['2010', '2015'])
    expect(groups[1].episcopal).toBe(true)
  })
})

describe('linha alternativa de sucessão', () => {
  const ep = (date: string, principal: string | null, co: string[] = []) => ({
    order: 'episcopate' as const, date, jurisdiction: 'velha', principal_consecrator: principal, co_consecrators: co, status: 'confirmed' as const, sources: s1
  })
  const b: Base = {
    ...base,
    people: [
      { id: 'raiz', name: 'Raiz', ordinations: [ep('1559', null)] },
      { id: 'meio', name: 'Meio', ordinations: [ep('1700', 'raiz')] },
      { id: 'sem-linha', name: 'Sem Linha', ordinations: [ep('1976', null)] },
      { id: 'alvo', name: 'Alvo', ordinations: [ep('1997', 'sem-linha', ['meio'])] }
    ]
  }
  const idx = indexBase(b)

  it('sobe por co-sagrantes até a sagração mais antiga alcançável', () => {
    expect(oldestReachableLine(idx, 'alvo').map((s) => [s.person.id, s.via])).toEqual([
      ['alvo', undefined], ['meio', 'co'], ['raiz', 'principal']
    ])
  })

  it('só aparece na ficha quando a linha principal para e a alternativa vai mais longe', () => {
    const v = personView(idx, 'alvo')!
    expect(v.successionEnd).toBe('unknown_consecrator')
    expect(v.successionAlt.map((s) => s.person.id)).toEqual(['alvo', 'meio', 'raiz'])
    expect(personView(idx, 'meio')!.successionAlt).toEqual([])
  })
})
