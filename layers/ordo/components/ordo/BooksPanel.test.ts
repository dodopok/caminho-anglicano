import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPortalHead, providePortalHead } from '../../composables/usePortalHead'
import { createPortalQuery, providePortalQuery } from '../../composables/usePortalQuery'
import { OrdoApiError } from '../../types/dashboard'
import type { AdminPrayerBook, AdminPrayerBookDetailResponse } from '../../types/books'
import type { DashboardData } from '../../types/dashboard'

// Every API read goes through `request`; the router answers by path, and a
// test removes a route to make it answer 404 (the API before the endpoint).
type Handler = (query: URLSearchParams, path: string) => unknown
const routes = new Map<string, Handler>()
const request = vi.fn(async (path: string) => {
  const url = new URL(path, 'https://api.test')
  const handler = routes.get(url.pathname) || [...routes.entries()].find(([key]) => key.endsWith('/*') && url.pathname.startsWith(key.slice(0, -1)))?.[1]
  if (!handler) throw new OrdoApiError('Not found', 404)
  const answer = handler(url.searchParams, url.pathname)
  if (answer instanceof Error) throw answer
  return answer
})
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => ({ request }) }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { ordoApiBaseUrl: 'https://api.test', ordoCmsBaseUrl: 'https://cms.test/api' } }))
const cmsFetch = vi.fn(async (url: string) => {
  const code = String(url).split('/').pop()
  return new Response(JSON.stringify({ data: code === 'loc_2015' ? [{ id: 1, title: 'Catecismo', slug: 'catecismo', prayer_book_code: code, order: 1 }] : [] }), { status: 200 })
})
vi.stubGlobal('fetch', cmsFetch)

const { default: BooksPanel } = await import('./BooksPanel.vue')

const NOW = new Date('2026-11-26T15:00:00')
const period = { preset: '30d' as const, start: '2026-10-28', end: '2026-11-26' }

const book = (code: string, name: string, language: string, extra: Partial<AdminPrayerBook> = {}): AdminPrayerBook => ({
  code,
  name,
  language,
  year: 2015,
  jurisdiction: 'Igreja de exemplo',
  thumbnail_url: `https://caminhoanglicano.com.br/locs/thumbs/${code}.png`,
  pdf: { published: true, pages: 100, bytes: 1_000_000 },
  documents_count: 2,
  narration_pct: 100,
  flag: null,
  metrics: { users_current: 500, onboarding_users: 600, new_users: 40, praying_users: 200, completions: 1000, d7_rate: 40, d7_eligible: 30 },
  previous: { new_users: 30, praying_users: 180, completions: 900 },
  spark: [1, 2, 3, 4],
  ...extra
})

const BOOKS = [
  book('loc_2015', 'IEAB - 2015', 'pt-BR', { is_default: true }),
  book('locb_2008', 'LOCb - 2008', 'pt-BR', { metrics: { users_current: 100, new_users: 10, praying_users: 50, completions: 300 } }),
  book('loc_2019_en', 'ACNA - 2019', 'en', { metrics: { users_current: 300, new_users: 20, praying_users: 120, completions: 700 } }),
  book('loc_2027', 'REB - 2027', 'pt-BR', { release_gated: true, pdf: null, documents_count: 0, narration_pct: 91, flag: { key: 'prayer_book_loc_2027', rule: 'off', users_count: 6 }, previous: null, metrics: { users_current: 6, new_users: 0, praying_users: 6, completions: 84, d7_rate: 83, d7_eligible: 6 } })
]

const detail = (code: string): AdminPrayerBookDetailResponse => ({
  period: { start_date: '2026-10-28', end_date: '2026-11-26' },
  generated_at: '2026-11-26T10:42:00-03:00',
  prayer_book: BOOKS.find(item => item.code === code)!,
  series: [{ date: '2026-11-25', praying_users: 10, completions: 20, new_users: 1 }, { date: '2026-11-26', praying_users: 12, completions: 22, new_users: 0 }],
  by_office_type: { morning: 60, evening: 40 },
  retention: code === 'loc_2027'
    ? { book: { users: 6, d1: { users: 5, eligible: 6, rate: 83.3 }, d7: { users: 5, eligible: 6, rate: 83.3 }, d30: { users: 0, eligible: 0, rate: null } }, all: { d7: { users: 30, eligible: 100, rate: 30 } } }
    : { book: { users: 40, d1: { users: 20, eligible: 40, rate: 50 }, d7: { users: 16, eligible: 40, rate: 40 }, d30: { users: 8, eligible: 40, rate: 20 } }, all: { d7: { users: 30, eligible: 100, rate: 30 } } },
  switches: { onboarding_users: 600, users_current: 500, came_from: { total: 50, books: [{ code: 'locb_2008', name: 'LOCb - 2008', users: 50 }] }, went_to: { total: 150, books: [{ code: 'loc_2019_en', name: 'ACNA - 2019', users: 150 }] } },
  premium_users: 70,
  clients: { app: 70, web: 30, other: 0, total: 100 },
  readiness: { cover: true, offices: ['morning', 'evening'], lectionary_until: '2026-12-23', narration_pct: 100, pdf: true, documents: 2 },
  documents: [{ slug: 'artigos', title: 'Os Trinta e Nove Artigos', order: 1 }, { slug: 'catecismo', title: 'Catecismo', order: 2 }]
})

const DASHBOARD: DashboardData = {
  users: { active_users_in_period: 900 },
  onboarding: { choices: { prayer_books: { loc_2015: 33, bas_1985_en: 4 } } },
  completions: { by_prayer_book: [{ code: 'loc_2015', name: 'LOC 2015', completions: 1200 }] },
  shared_offices: { by_prayer_book: { loc_2015: 12 } }
}

const install = ({ admin = true } = {}) => {
  routes.clear()
  if (admin) {
    routes.set('/api/v1/admin/prayer_books', () => ({
      period: { start_date: '2026-10-28', end_date: '2026-11-26' },
      generated_at: '2026-11-26T10:42:00-03:00',
      totals: { books: 4, users_current: 906, new_users: 70, praying_users: 350, previous: { new_users: 60, praying_users: 330 } },
      prayer_books: BOOKS
    }))
    routes.set('/api/v1/admin/prayer_books/*', (_query, path) => {
      const code = decodeURIComponent(path.split('/').pop() || '')
      return BOOKS.some(item => item.code === code) ? detail(code) : new OrdoApiError('Prayer Book not found', 404, { code: 'PRAYER_BOOK_NOT_FOUND' })
    })
  }
  routes.set('/api/v1/prayer_books', () => ({ data: [{ id: '1', code: 'loc_2015', name: 'LOC 2015', language: 'pt-BR', pdf_url: 'https://api.test/pdf' }, { id: '2', code: 'bas_1985_en', name: 'BAS 1985', language: 'en' }] }))
  routes.set('/api/v1/admin/audio/readiness', () => ({
    days: 28,
    start_date: '2026-11-26',
    end_date: '2026-12-23',
    computed_at: '2026-11-26T00:52:00-03:00',
    books: [{ prayer_book_code: 'loc_2015', name: 'LOC 2015', offices: ['morning', 'evening'], readers: 4120, bibles: [{ bible_version: 'nvi', name: 'NVI', default: true, featured: true, computed: true, share: 0.7, totals: { ready_clips: 10, missing_clips: 0, missing_characters: 0, percentage: 100 }, by_office: { morning: { ready_clips: 5, missing_clips: 0, missing_characters: 0, percentage: 100 }, evening: { ready_clips: 5, missing_clips: 0, missing_characters: 0, percentage: 100 } } }] }]
  }))
  routes.set('/api/v1/admin/usage/breakdown', query => ({ period: {}, dimension: 'book', filter: { event: query.get('event') }, rows: [{ value: 'loc_2015', count: query.get('event') === 'pdf_opened' ? 321 : 45 }] }))
  routes.set('/api/v1/admin/usage/content', () => ({ period: {}, filter: {}, rows: [{ content_kind: 'document', content_slug: 'catecismo', event: 'document_opened', count: 9, user_days: 7 }] }))
}

const mountPanel = async (url: Record<string, string> = { aba: 'livros' }, dashboard: DashboardData = DASHBOARD) => {
  const writes: Array<Record<string, string>> = []
  let current = { ...url }
  const head = createPortalHead()
  const Page = defineComponent({
    setup () {
      providePortalQuery(createPortalQuery({ read: () => current, write: (query) => { current = query; writes.push(query) } }))
      providePortalHead(head)
      return () => h(BooksPanel, { dashboard, period, reloadKey: 0, now: NOW })
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  await flushPromises()
  return { wrapper, writes, head, last: () => writes[writes.length - 1] }
}

const calls = (pathname: string) => request.mock.calls.map(([path]) => new URL(path, 'https://api.test')).filter(url => url.pathname === pathname)

beforeEach(() => {
  vi.clearAllMocks()
  install()
})

describe('aba Livros: galeria', () => {
  it('lê o endpoint novo com o período e a comparação, e mostra os livros em pré-lançamento', async () => {
    const { wrapper, head } = await mountPanel()
    const [list] = calls('/api/v1/admin/prayer_books')
    expect(list.searchParams.get('start_date')).toBe('2026-10-28')
    expect(list.searchParams.get('end_date')).toBe('2026-11-26')
    expect(list.searchParams.get('compare')).toBe('previous')
    // The public catalog is only the fallback.
    expect(calls('/api/v1/prayer_books')).toHaveLength(0)

    const cards = wrapper.findAll('.op-book')
    expect(cards).toHaveLength(4)
    expect(wrapper.find('.op-summary__copy strong').text()).toBe('4 livros em 2 idiomas. Mais da metade de quem tem um livro escolhido usa o IEAB - 2015.')
    const gated = cards.find(card => card.text().includes('REB - 2027'))!
    expect(gated.text()).toContain('Pré-lançamento')
    const ieab = cards.find(card => card.text().includes('IEAB - 2015'))!
    expect(ieab.find('.op-book__big').text()).toBe('500usam hoje')
    expect(ieab.text()).toContain('Padrão')
    expect(ieab.find('img').attributes('src')).toBe('/locs/thumbs/loc_2015.webp')
    expect(ieab.attributes('href')).toBe('?aba=livros&livro=loc_2015')
    // The four numbers of the catalog come from the endpoint's totals.
    expect(wrapper.findAll('.op-tiles .op-metric__value').map(item => item.text())).toEqual(['4', '906', '70', '350'])
    expect(head.head.value.live?.text).toMatch(/^Dados de \d{2}:\d{2} · atualizam a cada 10 min$/)
    wrapper.unmount()
  })

  it('sem o endpoint novo (404), mostra o catálogo público com "em breve", nunca um erro', async () => {
    install({ admin: false })
    const { wrapper } = await mountPanel()
    expect(calls('/api/v1/prayer_books')).toHaveLength(1)
    expect(wrapper.find('.op-inline-error').exists()).toBe(false)
    expect(wrapper.find('.op-state--error').exists()).toBe(false)
    expect(wrapper.find('.op-inline-note').text()).toContain('Em breve')
    const cards = wrapper.findAll('.op-book')
    expect(cards.map(card => card.find('.op-book__name').text())).toEqual(['LOC 2015', 'BAS 1985'])
    // "Usam hoje" comes from Áudio's readers; a book without them reads "—", not 0.
    expect(cards[0].find('.op-book__big').text()).toBe('4.120usam hoje')
    expect(cards[1].find('.op-book__big').text()).toBe('—usam hoje')
    expect(cards[0].text()).toContain('Linha em breve')
    expect(cards[0].text()).not.toContain('rezaram')
    // No pre-release filter before the API can list those books.
    expect(wrapper.text()).not.toContain('Pré-lançamento')
    expect(wrapper.findAll('.op-tiles .op-metric__value').map(item => item.text())).toEqual(['2', '4.120', '37', '900'])
    wrapper.unmount()
  })

  it('mostra o erro de verdade no próprio aviso e segue com o catálogo', async () => {
    routes.set('/api/v1/admin/prayer_books', () => new OrdoApiError('Erro interno', 500))
    const { wrapper } = await mountPanel()
    expect(wrapper.find('.op-inline-error').text()).toContain('Erro interno')
    expect(wrapper.findAll('.op-book')).toHaveLength(2)
    wrapper.unmount()
  })

  it('sem livro nenhum e sem catálogo, diz que não conseguiu ler', async () => {
    install({ admin: false })
    routes.delete('/api/v1/prayer_books')
    routes.set('/api/v1/prayer_books', () => new OrdoApiError('Fora do ar', 503))
    const { wrapper } = await mountPanel()
    expect(wrapper.find('.op-state--error').text()).toContain('Não foi possível ler os livros')
    wrapper.unmount()
  })

  it('guarda busca, idioma, filtros e a vista na URL', async () => {
    const { wrapper, writes, last } = await mountPanel()
    const input = wrapper.find('input[type="search"]')
    await input.setValue('acna')
    await flushPromises()
    expect(last()).toMatchObject({ aba: 'livros', busca: 'acna' })
    expect(wrapper.findAll('.op-book').map(card => card.find('.op-book__name').text())).toEqual(['ACNA - 2019'])

    await wrapper.find('select[aria-label="Idioma"]').setValue('en')
    await wrapper.findAll('.op-chip').find(chip => chip.text() === 'Pré-lançamento')!.trigger('click')
    await flushPromises()
    expect(last()).toMatchObject({ idioma: 'en', prelancamento: '1' })
    expect(wrapper.find('.op-empty').text()).toContain('Nenhum livro com esses filtros')

    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    await flushPromises()
    expect(last()).toMatchObject({ vista: 'ranking' })
    expect(writes.length).toBeGreaterThan(2)
    wrapper.unmount()
  })

  it('abre um livro pela capa, guardando o código na URL', async () => {
    const { wrapper, last } = await mountPanel()
    await wrapper.findAll('.op-book')[0].trigger('click', { button: 0 })
    await flushPromises()
    expect(last()).toMatchObject({ aba: 'livros', livro: 'loc_2015' })
    wrapper.unmount()
  })
})

describe('aba Livros: ranking', () => {
  it('compara os três que mais rezaram até alguém escolher, e grava a escolha', async () => {
    const { wrapper, last } = await mountPanel({ aba: 'livros', vista: 'ranking' })
    const compared = calls('/api/v1/admin/prayer_books/loc_2015').length + calls('/api/v1/admin/prayer_books/loc_2019_en').length + calls('/api/v1/admin/prayer_books/locb_2008').length
    expect(compared).toBe(3)
    expect(wrapper.findAll('.op-compare__chip').map(chip => chip.text())).toEqual(['IEAB - 2015 loc_2015', 'ACNA - 2019 loc_2019_en', 'LOCb - 2008 locb_2008'])
    expect(wrapper.findAll('.op-chart__svg path')).toHaveLength(3)

    await wrapper.findAll('.op-compare__chip')[1].trigger('click')
    await flushPromises()
    expect(last()).toMatchObject({ comparar: 'loc_2015,locb_2008' })

    const sortButton = wrapper.findAll('.op-rank__sort').find(button => button.text().startsWith('Usam hoje'))!
    await sortButton.trigger('click')
    await flushPromises()
    expect(last()).toMatchObject({ ordem: 'usam' })
    wrapper.unmount()
  })

  it('ordena pela URL e mostra a parte de quem reza', async () => {
    const { wrapper } = await mountPanel({ aba: 'livros', vista: 'ranking', ordem: 'usam' })
    const names = wrapper.findAll('.op-only-wide tbody tr').map(tr => tr.find('.op-rank__name a').text())
    expect(names).toEqual(['IEAB - 2015', 'ACNA - 2019', 'LOCb - 2008', 'REB - 2027'])
    expect(wrapper.find('#livros-parte').text()).toBe('Quatro livros reúnem 100% de quem reza')
    wrapper.unmount()
  })

  it('sem o endpoint novo, a parte de quem reza e a comparação ficam "em breve"', async () => {
    install({ admin: false })
    const { wrapper } = await mountPanel({ aba: 'livros', vista: 'ranking' })
    expect(wrapper.findAll('.op-soon-state')).toHaveLength(2)
    expect(calls('/api/v1/admin/prayer_books/loc_2015')).toHaveLength(0)
    expect(wrapper.findAll('.op-only-wide tbody tr')).toHaveLength(2)
    wrapper.unmount()
  })
})

describe('aba Livros: um livro', () => {
  it('lê o detalhe, titula a página e mostra série, retorno, trocas e documentos', async () => {
    const { wrapper, head } = await mountPanel({ aba: 'livros', livro: 'loc_2015' })
    expect(calls('/api/v1/admin/prayer_books/loc_2015')[0].searchParams.get('compare')).toBe('previous')
    expect(head.head.value).toMatchObject({ title: 'IEAB - 2015', crumb: 'loc_2015' })
    expect(head.head.value.actions?.map(action => action.label)).toEqual(['Abrir PDF', 'Cobertura de áudio'])
    expect(wrapper.find('.op-bookhero img').attributes('alt')).toBe('Capa do IEAB - 2015')
    expect(wrapper.find('.op-hbars').text()).toContain('40%')
    expect(wrapper.find('.op-flow__mid').text()).toBe('vieram+50foram−150')
    // The detail brings the documents: the CMS is not asked.
    expect(cmsFetch).not.toHaveBeenCalled()
    expect(wrapper.findAll('.op-rank tbody tr').map(tr => tr.text())).toEqual(['Os Trinta e Nove Artigos0', 'Catecismo9'])
    expect(wrapper.text()).toContain('70% · 30%')
    wrapper.unmount()
  })

  it('um livro em pré-lançamento diz o que falta e quem já vê', async () => {
    const { wrapper, head } = await mountPanel({ aba: 'livros', livro: 'loc_2027' })
    expect(head.head.value.description).toContain('Em pré-lançamento')
    const band = wrapper.find('.op-summary--warn').text()
    expect(band).toContain('9% da narração')
    expect(band).toContain('PDF')
    expect(band).toContain('6 pessoas de teste veem o livro')
    expect(wrapper.find('#livro-quem-ve').exists()).toBe(true)
    expect(wrapper.text()).toContain('Poucas pessoas para medir')
    expect(wrapper.text()).toContain('Nenhum PDF publicado')
    wrapper.unmount()
  })

  it('sem o endpoint novo, o detalhe usa o que já existe e lê os documentos no CMS', async () => {
    install({ admin: false })
    const { wrapper } = await mountPanel({ aba: 'livros', livro: 'loc_2015' })
    expect(cmsFetch).toHaveBeenCalledWith('https://cms.test/api/prayer-book-documents/by-code/loc_2015', expect.anything())
    expect(wrapper.find('.op-inline-error').exists()).toBe(false)
    expect(wrapper.findAll('.op-soon-state').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.find('#livro-dia-a-dia').exists()).toBe(true)
    expect(wrapper.findAll('.op-rank tbody tr').map(tr => tr.text())).toEqual(['Catecismo9'])
    wrapper.unmount()
  })

  it('um código que não existe diz isso e oferece voltar', async () => {
    const { wrapper, last } = await mountPanel({ aba: 'livros', livro: 'nao_existe' })
    expect(wrapper.find('.op-state h2').text()).toBe('Livro não encontrado')
    await wrapper.find('.op-state button').trigger('click')
    await flushPromises()
    expect(last().livro).toBeUndefined()
    wrapper.unmount()
  })
})

// Read from disk: Vitest hands CSS imports to the test as empty strings.
const css = readFileSync(resolve(__dirname, '../../assets/portal.css'), 'utf8')
const section = css.slice(css.indexOf('/* ---------- Livros'), css.indexOf('/* ---------- Login'))
const narrowRule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const block of section.split('@media (max-width: 900px) {').slice(1)) {
    const match = new RegExp(`(?:^|\\n)\\s*${escaped} \\{([^}]*)\\}`).exec(block)
    if (match) return match[1]
  }
  return null
}
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`).exec(section)?.[1] ?? null
}

describe('aba Livros no celular', () => {
  it('cabe em 390 px: duas colunas que encolhem, detalhe e trocas numa coluna só', () => {
    expect(narrowRule('.op-books')).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(narrowRule('.op-card.op-bookhero')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(narrowRule('.op-flow')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(narrowRule('.op-books-tab__search')).toMatch(/width:\s*100%/)
    // The ranking's wide table only exists on a wide screen; the phone gets the list.
    expect(css).toMatch(/@media \(max-width: 900px\) \{[^@]*\.op-only-wide \{ display: none !important; \}/)
    // Cards and names never push the row wider than the screen.
    expect(rule('.op-book')).toMatch(/min-width:\s*0/)
    expect(rule('.op-book__name')).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('mostra 4 livros por grupo e "Ver os N" no celular', () => {
    expect(narrowRule('.op-books:not(.is-open) > li:nth-child(n+5)')).toMatch(/display:\s*none/)
    expect(narrowRule('.op-books__more')).toMatch(/display:\s*flex/)
  })

  it('todo campo tem 16 px no celular (sem zoom no iPhone)', () => {
    const fields = /@media \(max-width: 900px\) \{\s*\.ordo-shell :is\(input, select, textarea\),\s*\.ordo-shell \.op-field,\s*\.ordo-shell \.op-filters \.op-field,[^}]*font-size: 16px/
    expect(css).toMatch(fields)
  })

  it('as capas vão de ponta a ponta: sem borda, moldura nem margem, só o cartão arredonda', () => {
    const cover = rule('.op-cover')!
    expect(cover).toMatch(/width:\s*100%/)
    expect(cover).toMatch(/object-fit:\s*cover/)
    expect(cover).not.toMatch(/border|padding|margin|box-shadow/)
    expect(rule('.op-book__shelf')).not.toMatch(/padding|border:/)
    expect(rule('.op-book')).toMatch(/overflow:\s*hidden/)
    expect(rule('.op-bookhero__shelf')).not.toMatch(/padding|border:/)
  })

  it('cartões neutros: nenhuma borda lateral colorida', () => {
    expect(section).not.toMatch(/border-left/)
  })
})
