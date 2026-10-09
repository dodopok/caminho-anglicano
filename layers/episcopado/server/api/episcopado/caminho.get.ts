import { shortestPath, type PathMode } from '../../../lib/paths'

/**
 * Como X e Y se ligam: caminho mais curto entre dois nós (`?de=p:miguel-uchoa&para=p:thomas-cranmer`).
 * `modo=sagracoes` (padrão) segue só sagrações e ordenações; `modo=tudo` aceita vínculos e relações.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const from = typeof query.de === 'string' ? query.de : ''
  const to = typeof query.para === 'string' ? query.para : ''
  const mode: PathMode = query.modo === 'tudo' ? 'all' : 'ordinations'
  if (!/^[pj]:[a-z0-9-]+$/.test(from) || !/^[pj]:[a-z0-9-]+$/.test(to)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe `de` e `para` como ids de nó ("p:…" ou "j:…")' })
  }
  const { graph } = await useEpiscopado()
  const ids = new Set(graph.nodes.map((n) => n.id))
  if (!ids.has(from) || !ids.has(to)) throw createError({ statusCode: 404, statusMessage: 'Nó não encontrado' })
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const result = shortestPath(graph, from, to, mode)
  if (!result) return { from, to, mode, steps: null }
  return {
    ...result,
    steps: result.steps.map((s) => {
      const n = byId.get(s.id)!
      return { ...s, label: n.label, kind: n.kind, order: n.order, jurisdictionType: n.jurisdictionType, year: n.startYear }
    })
  }
})
