import { jurisdictionView } from '../../../../lib/views'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const { index } = await useEpiscopado()
  const view = jurisdictionView(index, id)
  if (view) return view
  const current = index.formerJurisdictions.get(id)
  if (current) return { redirect: current }
  throw createError({ statusCode: 404, statusMessage: 'Jurisdição não encontrada' })
})
