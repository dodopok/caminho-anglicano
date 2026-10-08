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
    expect(graph.edges.filter((e) => e.kind === 'affiliation' && !e.rollup)).toHaveLength(2)
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
    expect(g.edges.filter((e) => e.from === 'p:edgar' && e.kind === 'affiliation' && !e.rollup)).toHaveLength(1)
  })
})

describe('buildGraph: bispo inferido pelo cargo', () => {
  it('trata como bispo quem tem cargo episcopal, mesmo sem sagração registrada', () => {
    const g = buildGraph({
      ...base,
      people: [{ id: 'jonas', name: 'Jonas', affiliations: [{ jurisdiction: 'br', role: 'bishop', status: 'probable', sources: src }] }]
    })
    expect(g.nodes.find((n) => n.id === 'p:jonas')).toMatchObject({ order: 'episcopate', inferredOrder: true })
  })
})

describe('buildGraph: dioceses ocultas', () => {
  const b: Base = {
    people: [
      { id: 'clerigo', name: 'Clérigo', affiliations: [{ jurisdiction: 'ieab', diocese: 'ieab-recife', role: 'clergy', start: '1990', status: 'confirmed', sources: src }] },
      { id: 'missionario', name: 'Missionário', ordinations: [{ order: 'episcopate', date: '1899', jurisdiction: 'distrito', status: 'confirmed', sources: src }] }
    ],
    jurisdictions: [
      { id: 'tec', name: 'Igreja Episcopal', type: 'province', country: 'US' },
      { id: 'ieab', name: 'IEAB', type: 'province', country: 'BR', relations: [{ type: 'successor_of', target: 'distrito', status: 'confirmed', sources: src }] },
      { id: 'ieab-recife', name: 'Diocese do Recife', type: 'diocese', relations: [{ type: 'part_of', target: 'ieab', status: 'confirmed', sources: src }] },
      // Diocese de uma igreja estrangeira que é a igreja local: continua visível.
      { id: 'distrito', name: 'Distrito Missionário', type: 'missionary_district', country: 'BR', relations: [{ type: 'part_of', target: 'tec', status: 'confirmed', sources: src }] },
      // Diocese autônoma: não pertence a nenhuma igreja.
      { id: 'autonoma', name: 'Diocese Autônoma', type: 'diocese', country: 'BR' },
      // Cisma de uma diocese: com as dioceses ocultas, sai da igreja a que ela pertencia.
      { id: 'nova', name: 'Igreja Nova', type: 'national_church', country: 'BR', relations: [{ type: 'schism_from', target: 'ieab-recife', date: '2002', status: 'confirmed', sources: src }] },
      // Diocese que mudou de igreja: a ligação sobe para a igreja da época.
      {
        id: 'migrante',
        name: 'Diocese Migrante',
        type: 'diocese',
        country: 'BR',
        relations: [
          { type: 'part_of', target: 'ieab', end: '2000', status: 'confirmed', sources: src },
          { type: 'part_of', target: 'nova', date: '2002', status: 'confirmed', sources: src },
          { type: 'schism_from', target: 'autonoma', date: '2010', status: 'confirmed', sources: src }
        ]
      },
      // Igreja que o mantenedor marcou como diocese de outra.
      { id: 'forcada', name: 'Forçada', type: 'national_church', country: 'BR', acts_as_church: false, relations: [{ type: 'part_of', target: 'ieab', status: 'confirmed', sources: src }] }
    ],
    sources: base.sources
  }
  const g = buildGraph(b)
  const node = (id: string) => g.nodes.find((n) => n.id === id)!
  const rollups = g.edges.filter((e) => e.rollup)

  it('marca só as dioceses que pertencem a uma igreja do mesmo país (ou forçadas)', () => {
    expect(node('j:ieab-recife').diocesan).toBe(true)
    expect(node('j:migrante').diocesan).toBe(true)
    expect(node('j:forcada').diocesan).toBe(true)
    expect(node('j:distrito').diocesan).toBeUndefined()
    expect(node('j:autonoma').diocesan).toBeUndefined()
    expect(node('j:ieab').diocesan).toBeUndefined()
  })

  it('leva vínculos e cismas para a igreja, sem laços nem duplicatas', () => {
    expect(rollups).toContainEqual(expect.objectContaining({ from: 'p:clerigo', to: 'j:ieab', kind: 'affiliation', year: 1990 }))
    expect(rollups).toContainEqual(expect.objectContaining({ from: 'j:nova', to: 'j:ieab', kind: 'schism_from' }))
    expect(rollups.some((e) => e.from === e.to)).toBe(false)
    expect(rollups.some((e) => e.from === 'j:ieab-recife' || e.to === 'j:ieab-recife')).toBe(false)
  })

  it('escolhe a igreja pela data da ligação', () => {
    expect(rollups).toContainEqual(expect.objectContaining({ from: 'j:nova', to: 'j:autonoma', kind: 'schism_from', year: 2010 }))
    expect(rollups).not.toContainEqual(expect.objectContaining({ from: 'j:ieab', to: 'j:autonoma' }))
  })

  it('não mexe em quem já é igreja', () => {
    expect(rollups.some((e) => e.from === 'p:missionario')).toBe(false)
  })
})
