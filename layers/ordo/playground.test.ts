// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// The playground's mock mode (fake session, fixtures) must never reach the
// site. These checks keep it fenced inside layers/ordo/.playground.

const LAYER = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(LAYER, '../..')

const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (['.playground', 'node_modules', '.nuxt', '.output'].includes(entry.name)) return []
  const path = join(dir, entry.name)
  return entry.isDirectory() ? sourceFiles(path) : [path]
})

describe('modo mock do playground', () => {
  it('o site estende a layer do Ordo, nunca o playground', () => {
    const config = readFileSync(join(ROOT, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain("'./layers/ordo'")
    expect(config).not.toMatch(/\.playground|mock/i)
  })

  it('nada da layer fora do playground cita os mocks', () => {
    const offenders = sourceFiles(LAYER)
      .filter(file => file !== fileURLToPath(import.meta.url) && !file.endsWith('README.md'))
      .filter(file => /\.playground|mock-token|ordoPortalMock|mocks\/index/.test(readFileSync(file, 'utf8')))
      .map(file => relative(ROOT, file))
    expect(offenders).toEqual([])
  })

  it('a configuração do playground se recusa a carregar na Vercel', async () => {
    const previous = process.env.VERCEL
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    process.env.VERCEL = '1'
    try {
      await expect(import('./.playground/nuxt.config')).rejects.toThrow(/Vercel/)
    } finally {
      if (previous === undefined) delete process.env.VERCEL
      else process.env.VERCEL = previous
      vi.unstubAllGlobals()
    }
  })

  it('a API simulada responde a cada aba e diz o que falta', async () => {
    // @ts-expect-error plain ES module without types
    const { respond } = await import('./.playground/mocks/index.mjs')
    const get = (path: string) => {
      const url = new URL(path, 'http://localhost')
      return respond({ pathname: url.pathname, query: url.searchParams })
    }
    expect(get('/api/v1/dashboard?start_date=2026-10-28&end_date=2026-11-26&sections=overview,users').status).toBe(200)
    expect(get('/api/v1/admin/audio/summary').status).toBe(200)
    expect(get('/api/v1/admin/usage/active_users?start_date=2026-10-28&end_date=2026-11-25').status).toBe(200)
    expect(get('/api/v1/admin/custom_rosary_prayers?limit=20&offset=0').status).toBe(200)
    expect(get('/api/v1/admin/feature_flags').status).toBe(200)
    expect(respond({ pathname: '/api/v1/admin/feature_flags', query: '', scenario: { flags: 'sem-api' } }).status).toBe(404)
    const books = get('/api/v1/admin/prayer_books?start_date=2026-10-28&end_date=2026-11-26&compare=previous')
    expect(books.status).toBe(200)
    expect(books.json.prayer_books.some((book: { release_gated: boolean }) => book.release_gated)).toBe(true)
    expect(get('/api/v1/admin/prayer_books/loc_2015?start_date=2026-10-28&end_date=2026-11-26').json.series).toHaveLength(30)
    expect(get('/api/v1/admin/prayer_books/nao_existe').status).toBe(404)
    const missing = get('/api/v1/nao-existe')
    expect(missing.status).toBe(404)
    expect(missing.json.error).toContain('/api/v1/nao-existe')
  })

  it('o cenário sem-api de Livros responde 404 no endpoint novo e mantém o catálogo público', async () => {
    // @ts-expect-error plain ES module without types
    const { respond, DEFAULT_SCENARIO } = await import('./.playground/mocks/index.mjs')
    const scenario = { ...DEFAULT_SCENARIO, books: 'sem-api' }
    expect(respond({ pathname: '/api/v1/admin/prayer_books', query: '', scenario }).status).toBe(404)
    expect(respond({ pathname: '/api/v1/admin/prayer_books/loc_2015', query: '', scenario }).status).toBe(404)
    expect(respond({ pathname: '/api/v1/prayer_books', query: '', scenario }).status).toBe(200)
  })
})
