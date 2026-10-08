export default defineEventHandler(async () => {
  const { graph } = await useEpiscopado()
  return graph
})
