import { buildTree } from '../../../lib/tree'

/** Árvore das jurisdições no tempo (`?escopo=brasil|tudo`): faixas, cismas e filiações. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { index, manifest } = await useEpiscopado()
  return { version: manifest.version, ...buildTree(index, query.escopo === 'tudo' ? 'all' : 'brazil') }
})
