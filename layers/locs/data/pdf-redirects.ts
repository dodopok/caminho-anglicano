// PDFs dos LOCs que passaram a ser servidos pela API do Ordo (bucket do
// Railway). Os endereços antigos continuam valendo: o app instalado, links
// compartilhados e consumidores externos podem ter guardado a URL do site.
// A API responde 302 para um link assinado do bucket.

export const ORDO_PDF_API = 'https://api.caminhoanglicano.com.br/api/v1/prayer_books'

// Caminho antigo no site -> código do livro na API.
export const movedLocPdfs: Record<string, string> = {
  '/locs/pdfs/loc-2015.pdf': 'loc_2015',
  // Cópia idêntica do loc-2015.pdf (apagada).
  '/locs/pdfs/LOC BR IEAB - 2019 (atualizado 2021).pdf': 'loc_2015',
  // Primeira impressão de 2015 (apagada): leva à reimpressão de 2021.
  '/locs/pdfs/loc-2015-old.pdf': 'loc_2015',
  '/locs/pdfs/loc-1979.pdf': 'loc_1979_en',
  '/locs/pdfs/locb-2008.pdf': 'locb_2008',
  '/locs/pdfs/bcp-1662.pdf': 'loc_1662_en',
  '/locs/pdfs/loc-1987.pdf': 'loc_1987',
  '/locs/pdfs/welsh-1984.pdf': 'loc_1984_en',
  // Caminho errado que a API publicou para o LOC 1984 (sempre deu 404).
  '/locs/pdf/welsh-1984.pdf': 'loc_1984_en',
  // Iguais aos PDFs oficiais da ACNA (apagados).
  '/locs/pdfs/LOC EN ACNA 2019.pdf': 'loc_2019_en',
  '/locs/pdfs/LOC ACNA - ESPANHOL-10-10-23.pdf': 'loc_2019_es'
}

export function locPdfApiUrl(code: string): string {
  return `${ORDO_PDF_API}/${code}/pdf`
}

// A rota da Vercel compara uma expressão regular com o caminho pedido, que
// pode chegar com espaço e parênteses literais ou codificados (%20, %28, %29).
export function locPdfRouteSource(path: string): string {
  const encoded: Record<string, string> = { ' ': '%20', '(': '%28', ')': '%29' }
  const escaped = path.replace(/[.*+?^${}()|[\]\\ ]/g, (char) => {
    const literal = char === ' ' ? ' ' : `\\${char}`
    return char in encoded ? `(?:${literal}|${encoded[char]})` : literal
  })

  return `^${escaped}$`
}

// Rotas no formato do Build Output API da Vercel. Entram antes do
// `handle: filesystem`, então redirecionam mesmo enquanto o arquivo antigo
// ainda existe em public/. Temporárias (302) até confirmar que nada quebrou.
export function locPdfRedirectRoutes() {
  return Object.entries(movedLocPdfs).map(([path, code]) => ({
    src: locPdfRouteSource(path),
    status: 302,
    headers: { Location: locPdfApiUrl(code) }
  }))
}
