import { describe, expect, it } from 'vitest'
import type { Base } from './schemas'
import { buildTree } from './tree'
import { indexBase } from './views'

const s = [{ source: 's', quote: 'trecho' }]
const base: Base = {
  people: [{ id: 'a', name: 'Ana', affiliations: [{ jurisdiction: 'iab', role: 'primate', status: 'confirmed', sources: s }, { jurisdiction: 'iab', role: 'bishop', status: 'confirmed', sources: s }] }],
  jurisdictions: [
    { id: 'tec', name: 'Igreja Episcopal', acronym: 'TEC', type: 'province', country: 'US', founded: { date: '1789', sources: s } },
    { id: 'ieab', name: 'Igreja Velha', acronym: 'IEAB', type: 'province', country: 'BR', founded: { date: '1890-06-01', sources: s }, relations: [{ type: 'successor_of', target: 'tec', date: '1965', status: 'confirmed', sources: s }, { type: 'member_of', target: 'coa', date: '1965', status: 'confirmed', sources: s }] },
    { id: 'iab', name: 'Igreja Nova', acronym: 'IAB', type: 'province', country: 'BR', founded: { date: '2018', sources: s }, relations: [{ type: 'schism_from', target: 'ieab', date: '2005', status: 'confirmed', sources: s }] },
    { id: 'reb', name: 'Rede', acronym: 'REB', type: 'national_church', country: 'BR', relations: [{ type: 'schism_from', target: 'iab', date: '2024', status: 'probable', sources: s }] },
    { id: 'dio', name: 'Diocese', type: 'diocese', country: 'BR', relations: [{ type: 'part_of', target: 'iab', status: 'confirmed', sources: s }] },
    { id: 'coa', name: 'Comunhão Anglicana', acronym: 'COA', type: 'communion', country: 'GB' },
    { id: 'fora', name: 'Fora', type: 'national_church', country: 'AR', founded: { date: '1900', sources: s } }
  ],
  sources: [{ id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' }]
}
const index = indexBase(base)

describe('buildTree', () => {
  it('no Brasil, traz as brasileiras e suas mães, sem dioceses, filhas depois das mães', () => {
    const tree = buildTree(index, 'brazil')
    expect(tree.nodes.map((n) => n.id)).toEqual(['tec', 'ieab', 'iab', 'reb', 'coa'])
    const iab = tree.nodes.find((n) => n.id === 'iab')!
    expect(iab).toMatchObject({ parent: 'ieab', parentType: 'schism_from', parentYear: 2005, founded: 2018, bishops: 1 })
    // Sem fundação: começa no ano do cisma.
    expect(tree.nodes.find((n) => n.id === 'reb')!.founded).toBe(2024)
    expect(tree.yearRange.min).toBe(1789)
  })

  it('na rede inteira, inclui as demais', () => {
    expect(buildTree(index, 'all').nodes.map((n) => n.id)).toContain('fora')
  })
})
