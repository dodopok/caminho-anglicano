import { sourceView } from '../../../../lib/views'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const { index } = await useEpiscopado()
  const view = sourceView(index, id)
  if (view) return view
  throw createError({ statusCode: 404, statusMessage: 'Fonte não encontrada' })
})
