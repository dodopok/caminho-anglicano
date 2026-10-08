import type { GraphNode } from './graph'
import { normalizeName } from './text'

export interface SearchResult {
  node: GraphNode
  score: number
}

/**
 * Busca nós por nome, apelido ou sigla, sem acento e por prefixo de palavra.
 * Pontua: nome exato > começa com a consulta > todas as palavras > parte das palavras.
 */
export function searchNodes(nodes: GraphNode[], query: string, limit = 12): SearchResult[] {
  const q = normalizeName(query)
  if (!q) return []
  const qTokens = q.split(' ')
  const results: SearchResult[] = []

  for (const node of nodes) {
    let best = 0
    for (const name of [node.label, ...node.search]) {
      const n = normalizeName(name)
      if (!n) continue
      const tokens = n.split(' ')
      let score: number
      if (n === q) score = 100
      else if (n.startsWith(q)) score = 80
      else {
        const hits = qTokens.filter((t) => tokens.some((w) => w.startsWith(t))).length
        score = hits === qTokens.length ? 60 : (hits / qTokens.length) * 40
      }
      best = Math.max(best, score)
    }
    if (best >= 30) {
      // Jurisdições e bispos primeiro em caso de empate.
      const bonus = node.kind === 'jurisdiction' ? 2 : node.order === 'episcopate' ? 1 : 0
      results.push({ node, score: best + bonus })
    }
  }

  return results.sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label, 'pt-BR')).slice(0, limit)
}
