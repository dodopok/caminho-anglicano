import { validateBase } from '../../../lib/validate'

/** O que falta pesquisar: as lacunas do validador, agrupáveis por entidade. */
export default defineEventHandler(async () => {
  const { base } = await useEpiscopado()
  const { gaps } = validateBase(base)
  return gaps
})
