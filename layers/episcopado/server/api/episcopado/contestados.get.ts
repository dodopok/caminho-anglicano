import { contestedClaims } from '../../../lib/app'

/** Todas as afirmações contestadas, com cada versão e quantas fontes a sustentam. */
export default defineEventHandler(async () => {
  const { index } = await useEpiscopado()
  return contestedClaims(index)
})
