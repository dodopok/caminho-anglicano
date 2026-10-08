import { personView } from '../../../../lib/views'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const { index } = await useEpiscopado()
  const view = personView(index, id)
  if (view) return view
  const current = index.formerPeople.get(id)
  if (current) return { redirect: current }
  throw createError({ statusCode: 404, statusMessage: 'Pessoa não encontrada' })
})
