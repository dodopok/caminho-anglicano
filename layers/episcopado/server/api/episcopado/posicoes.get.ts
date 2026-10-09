import type { LayoutScope } from '../../../lib/positions'

/** Posições globais do grafo (`?escopo=brasil|tudo`), para o app desenhar a rede sem rodar o layout. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scope: LayoutScope = query.escopo === 'tudo' ? 'all' : 'brazil'
  const [{ manifest }, positions] = await Promise.all([useEpiscopado(), useEpiscopadoPositions(scope)])
  return { version: manifest.version, ...positions }
})
