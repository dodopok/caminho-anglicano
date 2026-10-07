/** Normaliza nomes para busca e deduplicação: sem acentos, títulos eclesiásticos ou pontuação. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(dom|d\.|rev\.?|revmo\.?|rvmo\.?|rt\.? rev\.?|the|most|right|reverend|bispo|bishop|arcebispo|archbishop|padre|pe\.|frei)\s+/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
