import { describe, expect, it } from 'vitest'
import { locPdfRedirectRoutes, locPdfRouteSource, movedLocPdfs } from './pdf-redirects'

function matches(path: string, request: string): boolean {
  return new RegExp(locPdfRouteSource(path)).test(request)
}

describe('locPdfRouteSource', () => {
  it('matches the literal path only', () => {
    expect(matches('/locs/pdfs/loc-2015.pdf', '/locs/pdfs/loc-2015.pdf')).toBe(true)
    expect(matches('/locs/pdfs/loc-2015.pdf', '/locs/pdfs/loc-2015xpdf')).toBe(false)
    expect(matches('/locs/pdfs/loc-2015.pdf', '/locs/pdfs/loc-2015.pdf.bak')).toBe(false)
  })

  it('accepts spaces and parentheses literal or percent-encoded', () => {
    const path = '/locs/pdfs/LOC BR IEAB - 2019 (atualizado 2021).pdf'

    expect(matches(path, path)).toBe(true)
    expect(matches(path, '/locs/pdfs/LOC%20BR%20IEAB%20-%202019%20(atualizado%202021).pdf')).toBe(true)
    expect(matches(path, '/locs/pdfs/LOC%20BR%20IEAB%20-%202019%20%28atualizado%202021%29.pdf')).toBe(true)
  })
})

describe('locPdfRedirectRoutes', () => {
  it('sends every moved PDF to its book on the API with a temporary redirect', () => {
    const routes = locPdfRedirectRoutes()

    expect(routes).toHaveLength(Object.keys(movedLocPdfs).length)
    expect(routes).toContainEqual({
      src: '^/locs/pdf/welsh-1984\\.pdf$',
      status: 302,
      headers: { Location: 'https://api.caminhoanglicano.com.br/api/v1/prayer_books/loc_1984_en/pdf' }
    })
  })

  it('keeps the PDFs that stay on the site out of it', () => {
    const paths = Object.keys(movedLocPdfs)

    expect(paths).not.toContain('/locs/pdfs/loc-1783.pdf')
    expect(paths).not.toContain('/locs/pdfs/loc-2009.pdf')
    expect(paths).not.toContain('/locs/pdfs/BCP 1928.pdf')
  })
})
