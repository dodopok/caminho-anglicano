import { searchNodes } from '../../../lib/search'
import { normalizeName } from '../../../lib/text'
import type { SourceSummary } from '../../../lib/views'

/**
 * Busca por nome, apelido ou sigla (`?q=`), agrupada em pessoas, jurisdições e fontes.
 * O app também busca localmente sobre o grafo; este endpoint serve ao Spotlight, à Siri e ao site.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const limit = Math.min(Math.max(Number(query.limite) || 12, 1), 50)
  if (!q) return { q, people: [], jurisdictions: [], sources: [] }
  const { index, graph } = await useEpiscopado()
  const results = searchNodes(graph.nodes, q, limit * 2)
  const nq = normalizeName(q)
  const sources: SourceSummary[] = []
  if (nq) {
    for (const s of index.sources.values()) {
      if (normalizeName([s.title, s.author ?? '', s.publisher ?? '', s.id].join(' ')).includes(nq)) {
        sources.push({ id: s.id, type: s.type, title: s.title, author: s.author, publisher: s.publisher, url: s.url, archive_url: s.archive_url, published: s.published, level: s.level })
        if (sources.length >= limit) break
      }
    }
  }
  return {
    q,
    people: results.filter((r) => r.node.kind === 'person').slice(0, limit).map((r) => ({ ...r.node, score: r.score })),
    jurisdictions: results.filter((r) => r.node.kind === 'jurisdiction').slice(0, limit).map((r) => ({ ...r.node, score: r.score })),
    sources
  }
})
