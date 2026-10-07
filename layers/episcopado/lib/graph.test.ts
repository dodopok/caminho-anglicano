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
