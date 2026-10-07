import { sourceList } from '../../../lib/views'

/** Bibliografia completa, com quantas afirmações cada fonte sustenta. */
export default defineEventHandler(async () => {
  const { index } = await useEpiscopado()
  return sourceList(index)
})
