/**
 * A base inteira (pessoas, jurisdições e fontes, como nos YAML) para uso offline.
 * O app guarda o snapshot e só baixa outro quando `manifest.version` muda.
 */
export default defineEventHandler(async (event) => {
  const { base, manifest } = await useEpiscopado()
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=86400')
  setHeader(event, 'X-Episcopado-Version', manifest.version)
  return { version: manifest.version, generatedAt: manifest.generatedAt, people: base.people, jurisdictions: base.jurisdictions, sources: base.sources }
})
