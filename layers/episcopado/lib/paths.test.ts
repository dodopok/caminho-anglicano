import { describe, expect, it } from 'vitest'
import type { Graph } from './graph'
import { shortestPath } from './paths'

const graph: Graph = {
  nodes: [
    { id: 'p:a', kind: 'person', label: 'A', search: [] },
    { id: 'p:b', kind: 'person', label: 'B', search: [] },
    { id: 'p:c', kind: 'person', label: 'C', search: [] },
    { id: 'p:d', kind: 'person', label: 'D', search: [] },
    { id: 'p:e', kind: 'person', label: 'E', search: [] },
    { id: 'j:x', kind: 'jurisdiction', label: 'X', search: [] }
  ],
  edges: [
    // Cadeia de sagrações A → B → D → C.
    { from: 'p:a', to: 'p:b', kind: 'consecration', status: 'confirmed', year: 2000 },
    { from: 'p:b', to: 'p:d', kind: 'co_consecration', status: 'probable', year: 2010 },
    { from: 'p:d', to: 'p:c', kind: 'consecration', status: 'confirmed', year: 2020 },
    // Atalho por vínculo: A e C na mesma jurisdição.
    { from: 'p:a', to: 'j:x', kind: 'affiliation', status: 'confirmed' },
    { from: 'p:c', to: 'j:x', kind: 'affiliation', status: 'confirmed' },
    // Cópia com as dioceses ocultas nunca entra no caminho.
    { from: 'p:e', to: 'p:c', kind: 'consecration', status: 'confirmed', rollup: true }
  ]
}

describe('shortestPath', () => {
  it('encontra o caminho mais curto por qualquer ligação, dizendo por onde passou', () => {
    const r = shortestPath(graph, 'p:a', 'p:c')!
    expect(r.steps.map((s) => s.id)).toEqual(['p:a', 'j:x', 'p:c'])
    expect(r.steps[1].via).toMatchObject({ kind: 'affiliation', reversed: false })
    expect(r.steps[2].via).toMatchObject({ kind: 'affiliation', reversed: true })
  })

  it('só por sagrações, segue a cadeia de sagrantes (contra a seta é "reversed")', () => {
    const r = shortestPath(graph, 'p:c', 'p:a', 'ordinations')!
    expect(r.steps.map((s) => s.id)).toEqual(['p:c', 'p:d', 'p:b', 'p:a'])
    expect(r.steps[1].via).toMatchObject({ kind: 'consecration', year: 2020, reversed: true })
    expect(r.steps[2].via).toMatchObject({ kind: 'co_consecration', year: 2010, status: 'probable' })
  })

  it('devolve null sem caminho ou com nó inexistente, e um passo só quando origem = destino', () => {
    expect(shortestPath(graph, 'p:e', 'p:a')).toBeNull()
    expect(shortestPath(graph, 'p:a', 'p:zz')).toBeNull()
    expect(shortestPath(graph, 'p:a', 'p:a')!.steps).toEqual([{ id: 'p:a' }])
  })
})
