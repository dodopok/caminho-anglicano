import { describe, expect, it } from 'vitest'
import type { Base } from './schemas'
import { indexBase, jurisdictionView, personView } from './views'

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
