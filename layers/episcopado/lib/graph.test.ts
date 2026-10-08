import { describe, expect, it } from 'vitest'
import { buildGraph, nodeId } from './graph'
import type { Base } from './schemas'

const src = [{ source: 's', quote: 'trecho' }]

const base: Base = {
  people: [
    // Sagrante sem ordenação cadastrada: bispo por implicação.
    { id: 'velho', name: 'Bispo Velho', affiliations: [{ jurisdiction: 'fora', role: 'bishop', status: 'confirmed', sources: src }] },
    {
      id: 'novo',
      name: 'Bispo Novo',
      ordinations: [
        { order: 'presbyterate', date: '2000', jurisdiction: 'br', ordained_by: 'velho', status: 'confirmed', sources: src },
        { order: 'episcopate', date: '2010', jurisdiction: 'br', principal_consecrator: 'velho', status: 'probable', sources: src }
      ],
      affiliations: [{ jurisdiction: 'br', role: 'diocesan_bishop', diocese: 'br-dio', status: 'confirmed', sources: src }]
    },
    { id: 'leigo', name: 'Leigo' }
  ],
  jurisdictions: [
    { id: 'br', name: 'Igreja no Brasil', acronym: 'IB', type: 'province', country: 'BR' },
    { id: 'br-dio', name: 'Diocese', type: 'diocese', country: 'BR' },
    { id: 'fora', name: 'Igreja de Fora', type: 'province', country: 'US' }
  ],
  sources: [{ id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' }]
}

describe('buildGraph', () => {
  const graph = buildGraph(base)
  const node = (kind: 'person' | 'jurisdiction', id: string) => graph.nodes.find((n) => n.id === nodeId(kind, id))!

  it('infere o episcopado de quem sagrou ou ordenou sem ordenação própria cadastrada', () => {
    expect(node('person', 'velho')).toMatchObject({ order: 'episcopate', inferredOrder: true })
    expect(node('person', 'novo')).toMatchObject({ order: 'episcopate' })
    expect(node('person', 'novo').inferredOrder).toBeUndefined()
    expect(node('person', 'leigo').order).toBeUndefined()
  })

  it('marca o núcleo brasileiro: jurisdições no Brasil e pessoas vinculadas a elas', () => {
    expect(node('jurisdiction', 'br').brazil).toBe(true)
    expect(node('jurisdiction', 'fora').brazil).toBeUndefined()
    expect(node('person', 'novo').brazil).toBe(true)
    expect(node('person', 'velho').brazil).toBeUndefined()
  })

  it('gera arestas de ordenação com status e ano', () => {
    expect(graph.edges).toContainEqual({ from: 'p:velho', to: 'p:novo', kind: 'consecration', status: 'probable', year: 2010 })
    expect(graph.edges).toContainEqual({ from: 'p:velho', to: 'p:novo', kind: 'presbyteral_ordination', status: 'confirmed', year: 2000 })
    expect(graph.edges.filter((e) => e.kind === 'affiliation')).toHaveLength(2)
  })
})

describe('buildGraph: dioceses e ligações implícitas', () => {
  const b: Base = {
    people: [
      // Como Edgar (IECB): vínculo só pela diocese, que não tem país nem relação cadastrada.
      { id: 'edgar', name: 'Edgar', ordinations: [{ order: 'episcopate', date: '2019', jurisdiction: 'igreja', status: 'confirmed', sources: src }], affiliations: [{ jurisdiction: 'igreja', diocese: 'mata', role: 'bishop', status: 'probable', sources: src }] },
      // Como Salomão Ferraz (ICAB): só ordenações, nenhum vínculo.
      { id: 'salomao', name: 'Salomão', ordinations: [{ order: 'episcopate', date: '1945', jurisdiction: 'icab', status: 'confirmed', sources: src }] }
    ],
    jurisdictions: [
      { id: 'igreja', name: 'Igreja', type: 'national_church', country: 'BR' },
      { id: 'mata', name: 'Diocese da Mata', type: 'diocese' },
      { id: 'sub', name: 'Paróquia-diocese', type: 'diocese', relations: [{ type: 'part_of', target: 'mata', status: 'confirmed', sources: src }] },
      { id: 'icab', name: 'ICAB', type: 'national_church', country: 'BR' }
    ],
    sources: base.sources
  }
  const g = buildGraph(b)
  const node = (id: string) => g.nodes.find((n) => n.id === id)!

  it('liga a diocese à igreja do vínculo e herda o país', () => {
    expect(g.edges).toContainEqual(expect.objectContaining({ from: 'j:mata', to: 'j:igreja', kind: 'part_of' }))
    expect(node('j:mata')).toMatchObject({ brazil: true, country: 'BR' })
    expect(node('j:sub')).toMatchObject({ brazil: true, country: 'BR' })
  })

  it('usa a jurisdição da ordenação quando não há vínculo', () => {
    expect(g.edges).toContainEqual(expect.objectContaining({ from: 'p:salomao', to: 'j:icab', kind: 'affiliation', label: 'episcopate' }))
    expect(node('p:salomao').brazil).toBe(true)
    // Edgar já tem vínculo com a igreja: a ordenação não duplica a aresta.
    expect(g.edges.filter((e) => e.from === 'p:edgar' && e.kind === 'affiliation')).toHaveLength(1)
  })
})
