import { describe, expect, it } from 'vitest'
import type { GraphNode } from './graph'
import { searchNodes } from './search'

const nodes: GraphNode[] = [
  { id: 'p:miguel-uchoa', kind: 'person', label: 'Miguel Uchôa', search: ['Miguel Ângelo de Andrade Uchôa Cavalcanti', 'Dom Miguel'], order: 'episcopate' },
  { id: 'p:miguel-silva', kind: 'person', label: 'Miguel Silva', search: [] },
  { id: 'j:iab', kind: 'jurisdiction', label: 'IAB', search: ['Igreja Anglicana no Brasil', 'IAB'] }
]

describe('searchNodes', () => {
  it('encontra sem acento e por prefixo', () => {
    expect(searchNodes(nodes, 'uchoa')[0].node.id).toBe('p:miguel-uchoa')
    expect(searchNodes(nodes, 'Dom Miguel Uch')[0].node.id).toBe('p:miguel-uchoa')
  })

  it('encontra jurisdição por sigla ou nome', () => {
    expect(searchNodes(nodes, 'iab')[0].node.id).toBe('j:iab')
    expect(searchNodes(nodes, 'anglicana brasil')[0].node.id).toBe('j:iab')
  })

  it('ordena o melhor resultado primeiro e ignora consulta vazia', () => {
    expect(searchNodes(nodes, 'miguel').map((r) => r.node.id)).toEqual(['p:miguel-uchoa', 'p:miguel-silva'])
    expect(searchNodes(nodes, '   ')).toEqual([])
  })
})
