import { describe, expect, it } from 'vitest'
import { contestedClaims, homeView, manifest, originOf, starters, successionView } from './app'
import { buildGraph } from './graph'
import type { Base } from './schemas'
import { indexBase } from './views'

const s1 = [{ source: 's', quote: 'um' }]
const s2 = [{ source: 't', quote: 'dois' }]

const base: Base = {
  people: [
    { id: 'matthew-parker', name: 'Matthew Parker', ordinations: [{ order: 'episcopate', date: '1559-12-17', jurisdiction: null, principal_consecrator: null, status: 'confirmed', sources: s1 }] },
    {
      id: 'ana',
      name: 'Ana',
      ordinations: [{ order: 'episcopate', date: '2012-12-08', jurisdiction: 'iab', principal_consecrator: 'matthew-parker', status: 'confirmed', sources: s1 }],
      affiliations: [{ jurisdiction: 'iab', role: 'primate', start: '2018', status: 'confirmed', sources: s1 }]
    },
    {
      id: 'bento',
      name: 'Bento',
      ordinations: [
        { order: 'episcopate', date: '2017-06-10', jurisdiction: 'iab', principal_consecrator: 'ana', status: 'contested', sources: [...s1, ...s2], discrepancies: [{ field: 'date', value: '2017-06-11', sources: s2 }, { field: 'principal_consecrator', value: 'matthew-parker', sources: s1 }] }
      ],
      affiliations: [{ jurisdiction: 'iab', role: 'bishop', start: '2017', status: 'confirmed', sources: s1 }]
    }
  ],
  jurisdictions: [
    { id: 'ieab', name: 'Igreja Velha', acronym: 'IEAB', type: 'province', country: 'BR', founded: { date: '1890', sources: s1 } },
    { id: 'iab', name: 'Igreja Nova', acronym: 'IAB', type: 'province', country: 'BR', relations: [{ type: 'schism_from', target: 'ieab', date: '2005', status: 'contested', sources: s1, discrepancies: [{ field: 'date', value: '2018', sources: s2 }] }] },
    { id: 'dio', name: 'Diocese', type: 'diocese', country: 'BR', relations: [{ type: 'part_of', target: 'iab', status: 'confirmed', sources: s1 }] },
    { id: 'fora', name: 'Fora', type: 'province', country: 'US' }
  ],
  sources: [
    { id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' },
    { id: 't', type: 'book', title: 'Livro', level: 'secondary' }
  ]
}
const index = indexBase(base)
const graph = buildGraph(base)

describe('manifest', () => {
  it('conta a base e o intervalo de anos', () => {
    const m = manifest(index, graph, 'v1', '2026-10-09T00:00:00.000Z')
    expect(m.counts).toMatchObject({ people: 3, jurisdictions: 4, sources: 2, bishops: 3, contested: 2 })
    expect(m.yearRange.min).toBe(1559)
  })
})

describe('starters', () => {
  it('lista só as jurisdições brasileiras de nível igreja, com bispos e grau', () => {
    const list = starters(index, graph)
    expect(list.map((s) => s.id)).toEqual(['iab', 'ieab'])
    expect(list[0]).toMatchObject({ acronym: 'IAB', bishops: 2, members: 2, founded: null })
    expect(list[0].degree).toBeGreaterThan(list[1].degree)
  })
})

describe('contestedClaims', () => {
  it('traz cada versão com suas fontes, as mais recentes primeiro', () => {
    const list = contestedClaims(index)
    expect(list.map((c) => c.claim)).toEqual(['Episcopado de Bento', 'Cisma de IEAB (IAB)'])
    expect(list[0].versions).toEqual([
      { field: 'data', value: '10 jun. 2017', sources: 2 },
      { field: 'data', value: '11 jun. 2017', sources: 1 },
      { field: 'sagrante principal', value: 'Matthew Parker', sources: 1 }
    ])
    expect(list[0]).toMatchObject({ entity: { kind: 'person', id: 'bento' }, section: 'ordenacoes', sources: 2 })
    expect(list[1].versions[1]).toEqual({ field: 'data', value: '2018', sources: 1 })
  })
})

describe('successionView', () => {
  it('reconhece a origem da linha', () => {
    const v = successionView(index, 'bento')!
    expect(v.steps.map((s) => s.person.id)).toEqual(['bento', 'ana', 'matthew-parker'])
    expect(v.origin).toEqual({ label: 'Cantuária', person: { id: 'matthew-parker', name: 'Matthew Parker' } })
    expect(v.end).toBe('unknown_consecrator')
    expect(originOf([])).toBeNull()
    expect(successionView(index, 'ninguem')).toBeNull()
  })
})

describe('homeView', () => {
  it('reúne manifesto, pontos de partida, efemérides da semana e contestados', () => {
    const home = homeView(index, graph, manifest(index, graph, 'v1', 'agora'), new Date(Date.UTC(2026, 11, 8)), { contested: 1 })
    expect(home.thisWeek.map((e) => e.person.id)).toEqual(['ana'])
    expect(home.contested).toHaveLength(1)
    expect(home.starters[0].id).toBe('iab')
  })
})
