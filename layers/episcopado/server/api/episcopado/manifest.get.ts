/** Versão e contagens da base: o app compara com o que tem em cache antes de baixar de novo. */
export default defineEventHandler(async () => {
  const { manifest } = await useEpiscopado()
  return manifest
})
