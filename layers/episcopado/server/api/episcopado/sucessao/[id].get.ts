import { successionView } from '../../../../lib/app'

/** Linha de sucessão de uma pessoa, com a origem reconhecida (Cantuária, Roma, Utrecht, Escócia). */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const { index } = await useEpiscopado()
  const view = successionView(index, id)
  if (view) return view
  const current = index.formerPeople.get(id)
  if (current) return { redirect: current }
  throw createError({ statusCode: 404, statusMessage: 'Pessoa não encontrada' })
})
