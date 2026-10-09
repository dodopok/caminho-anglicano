import { describe, expect, it } from 'vitest'
import type { Graph } from './graph'
import { layoutPositions } from './positions'

const graph: Graph = {
  nodes: [
    { id: 'j:iab', kind: 'jurisdiction', label: 'IAB', search: [], brazil: true, country: 'BR' },
    { id: 'p:a', kind: 'person', label: 'A', search: [], brazil: true, order: 'episcopate' },
    { id: 'p:b', kind: 'person', label: 'B', search: [], brazil: true, order: 'episcopate' },
    { id: 'p:fora', kind: 'person', label: 'Fora', search: [], order: 'episcopate' },
    { id: 'p:solto', kind: 'person', label: 'Solto', search: [], brazil: true }
  ],
  edges: [
    { from: 'p:a', to: 'p:b', kind: 'consecration', status: 'confirmed' },
    { from: 'p:a', to: 'j:iab', kind: 'affiliation', status: 'confirmed' },
    { from: 'p:fora', to: 'p:a', kind: 'consecration', status: 'confirmed' },
    { from: 'p:b', to: 'j:iab', kind: 'affiliation', status: 'confirmed', rollup: true }
  ]
}

describe('layoutPositions', () => {
  it('posiciona só os nós da abrangência com alguma ligação', () => {
    const br = layoutPositions(graph, 'brazil', 50)
    expect(Object.keys(br.nodes).sort()).toEqual(['j:iab', 'p:a', 'p:b'])
    const all = layoutPositions(graph, 'all', 50)
    expect(Object.keys(all.nodes).sort()).toEqual(['j:iab', 'p:a', 'p:b', 'p:fora'])
  })

  it('é determinístico e separa os nós', () => {
    const a = layoutPositions(graph, 'all', 50)
    const b = layoutPositions(graph, 'all', 50)
    expect(a).toEqual(b)
    const [ax, ay] = a.nodes['p:a']
    const [bx, by] = a.nodes['p:b']
    expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(1)
    expect(Number.isFinite(ax) && Number.isFinite(ay)).toBe(true)
  })
})
