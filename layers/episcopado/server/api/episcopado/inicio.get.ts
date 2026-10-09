import { homeView } from '../../../lib/app'

/** Tudo o que a tela de início do app mostra, numa chamada só. */
export default defineEventHandler(async () => {
  const { index, graph, manifest } = await useEpiscopado()
  return homeView(index, graph, manifest, new Date(), { days: 7, contested: 8 })
})
