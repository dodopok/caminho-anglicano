import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPortalQuery, providePortalQuery } from '../../composables/usePortalQuery'
import { OrdoApiError } from '../../types/dashboard'
import type { UsageActivePoint, UsageFunnelsResponse, UsageTopResponse } from '../../types/usage'

// Every report goes through `request`; the router below answers by path, and
// a test overrides one route to make it fail, go missing (404) or change.
type Handler = (query: URLSearchParams) => unknown
const routes = new Map<string, Handler>()
const request = vi.fn(async (path: string) => {
  const url = new URL(path, 'https://api.test')
  const handler = routes.get(url.pathname)
  if (!handler) throw new OrdoApiError('Not found', 404)
  const answer = handler(url.searchParams)
  if (answer instanceof Error) throw answer
  return answer
})
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => ({ request }) }))

const { default: UsagePanel } = await import('./UsagePanel.vue')

const NOW = new Date('2026-11-26T15:00:00')
// "7 dias" ending today is read as the 7 days ending yesterday.
const period = { preset: '7d' as const, start: '2026-11-20', end: '2026-11-26' }
const WINDOW = { start: '2026-11-19', end: '2026-11-25' }
const PREVIOUS = { start: '2026-11-12', end: '2026-11-18' }
const isPrevious = (query: URLSearchParams) => query.get('end_date') === PREVIOUS.end

const days = (start: string, count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date(`${start}T12:00:00`)
  date.setDate(date.getDate() + index)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
})

const activePoint = (date: string, dau: number): UsageActivePoint => ({
  date,
  dau,
  wau: dau * 3,
  mau: dau * 6,
  by_client: { app: { dau: dau - 10, wau: dau * 2, mau: dau * 5 }, web: { dau: 20, wau: 50, mau: dau * 2 } },
  app_and_web: { dau: 2, wau: 5, mau: dau }
})
const activeSeries = (start: string, dau: number, zeros = 0) => days(start, 7).map((date, index) => activePoint(date, index < zeros ? 0 : dau))

const top = (scale: number): UsageTopResponse => ({
  period: { start_date: WINDOW.start, end_date: WINDOW.end },
  features: [
    { feature: 'office', count: Math.round(1000 * scale), errors: 1, user_days: Math.round(400 * scale) },
    { feature: 'rosary', count: scale > 1 ? 300 : 200, errors: 0, user_days: scale > 1 ? 120 : 90 },
    { feature: 'calendar', count: scale > 1 ? 180 : 240, errors: 0, user_days: 60 },
    { feature: 'pdf', count: 150, errors: scale > 1 ? 6 : 0, user_days: 50 }
  ],
  events: [
    { event: 'office_opened', source: 'client', count: 800, user_days: 300 },
    { event: 'office_completed', source: 'domain', count: 500, user_days: 240 },
    { event: 'share_performed', source: 'client', count: 20, user_days: 10 }
  ],
  counters: []
})

const funnels = (rate: number): UsageFunnelsResponse => ({
  period: { start_date: WINDOW.start, end_date: WINDOW.end },
  raw_window: { start_date: WINDOW.start, end_date: WINDOW.end },
  funnels: [
    { key: 'office', per_user: true, steps: [{ event: 'office_opened', count: 800, user_days: 300 }, { event: 'office_completed', count: 500, user_days: 240 }], started: 300, converted: Math.round(300 * rate), rate },
    { key: 'share', per_user: false, steps: [{ event: 'share_sheet_opened', count: 40, user_days: 30 }, { event: 'share_performed', count: 24, user_days: 20 }, { event: 'share_link_opened', count: 60, user_days: 50 }] },
    { key: 'paywall', per_user: true, steps: [{ event: 'paywall_viewed', count: 100, user_days: 100 }, { event: 'purchase_finished', count: 3, user_days: 3 }], started: 100, converted: 3, rate: 0.03 }
  ]
})

const seriesOf = (start: string, count: number, users = Math.round(count / 2)) => days(start, 7).map(date => ({ date, count, users }))

const install = () => {
  routes.clear()
  routes.set('/api/v1/admin/usage/active_users', query => ({ period: {}, series: isPrevious(query) ? activeSeries(PREVIOUS.start, 90) : activeSeries(WINDOW.start, 100) }))
  routes.set('/api/v1/admin/usage/top', query => {
    const answer = top(isPrevious(query) ? 1 : 1.1)
    return query.get('feature') ? answer : answer
  })
  routes.set('/api/v1/admin/usage/status', () => ({ rollup: { first_day: '2026-10-01', last_closed_day: '2026-11-25', rolled_at: '2026-11-26T00:31:00-03:00' }, sources: [], days: [] }))
  routes.set('/api/v1/admin/usage/series', query => {
    const start = isPrevious(query) ? PREVIOUS.start : WINDOW.start
    if (query.get('group_by')) return { period: {}, filter: {}, series: [] }
    if (query.get('event') === 'office_completed') return { period: {}, filter: {}, series: seriesOf(start, isPrevious(query) ? 100 : 110) }
    if (query.get('event') === 'narration_started') return { period: {}, filter: {}, series: seriesOf(start, 20) }
    if (query.get('event') === 'narration_ended') return { period: {}, filter: {}, series: seriesOf(start, 10) }
    return { period: {}, filter: {}, series: seriesOf(start, 50) }
  })
  routes.set('/api/v1/admin/usage/breakdown', query => {
    const dimension = query.get('dimension')
    if (['premium', 'logged_in', 'office_type'].includes(dimension || '')) return new OrdoApiError('dimension must be one of…', 400, { code: 'INVALID_DIMENSION' })
    const rows: Record<string, Array<{ value: string | null; count: number }>> = {
      client: [{ value: 'app', count: 700 }, { value: 'web', count: 250 }, { value: 'api_key', count: 40 }],
      platform: [{ value: 'ios', count: 400 }, { value: 'web_desktop', count: 200 }],
      language: [{ value: 'pt-BR', count: 600 }, { value: null, count: 3 }],
      book: [{ value: 'loc_2015', count: isPrevious(query) ? 400 : 500 }, { value: 'bas_1985_en', count: 100 }],
      app_version: [{ value: '1.45.0', count: 70 }, { value: '1.44.2', count: 20 }, { value: '1.43.1', count: 6 }, { value: '1.40.0', count: 4 }]
    }
    return { period: {}, dimension, filter: {}, rows: rows[dimension || ''] || [] }
  })
  routes.set('/api/v1/admin/usage/funnels', query => funnels(isPrevious(query) ? 0.66 : 0.71))
  routes.set('/api/v1/admin/usage/content', query => query.get('slug')
    ? new OrdoApiError('Not found', 404)
    : {
        period: {},
        filter: {},
        rows: [
          { content_kind: 'saint', content_slug: 'santo-andre-apostolo', event: 'post_opened', count: isPrevious(query) ? 20 : 90, user_days: 70 },
          { content_kind: 'saint', content_slug: 'todos-os-santos', event: 'post_opened', count: 120, user_days: 100 },
          { content_kind: null, content_slug: 'trinta-e-nove-artigos', event: 'document_opened', count: 12, user_days: 10 }
        ]
      })
  routes.set('/api/v1/prayer_books', () => ({ data: [{ id: '1', code: 'loc_2015', name: 'LOC 2015' }] }))
  routes.set('/api/v1/dashboard', () => ({ period: {}, sections: ['completions'], data: { completions: { by_office_type: { morning: 30, evening: 10 } } } }))
  routes.set('/api/v1/calendar/2026/11', () => [{ date: '2026-11-29', celebration_name: null, week_name: '1º Domingo do Advento' }, { date: '2026-11-30', celebration_name: 'Santo André, apóstolo', week_name: null }])
  routes.set('/api/v1/calendar/2026/12', () => [])
}

const mountPanel = async (url: Record<string, string> = { aba: 'uso' }, chosen: { preset: '7d' | '30d' | '90d' | '12m' | 'all' | 'custom'; start: string; end: string } = period) => {
  const writes: Array<Record<string, string>> = []
  let current = { ...url }
  const Page = defineComponent({
    setup () {
      providePortalQuery(createPortalQuery({ read: () => current, write: query => { current = query; writes.push(query) } }))
      return () => h(UsagePanel, { period: chosen, monthly: false, reloadKey: 0, now: NOW })
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return { wrapper, writes }
}

const calls = (pathname: string) => request.mock.calls.map(([path]) => new URL(path, 'https://api.test')).filter(url => url.pathname === pathname)

beforeEach(() => {
  vi.clearAllMocks()
  install()
})

describe('UsagePanel · Resumo', () => {
  it('reads the 7 days up to yesterday and the 7 before, and says the period in one sentence', async () => {
    const { wrapper } = await mountPanel()

    const actives = calls('/api/v1/admin/usage/active_users').map(url => `${url.searchParams.get('start_date')}..${url.searchParams.get('end_date')}`)
    expect(actives).toEqual(expect.arrayContaining([`${WINDOW.start}..${WINDOW.end}`, `${PREVIOUS.start}..${PREVIOUS.end}`]))
    const text = wrapper.text()
    // WAU of the last closed day is the people of a 7-day window: 300.
    expect(text).toContain('300 pessoas usaram o Ordo e rezaram 770 ofícios nos últimos 7 dias.')
    expect(text).toContain('10% mais ofícios')
    expect(text).toContain('11% mais pessoas')
    expect(text).toContain('O que mais cresceu foi o Rosário (+50%) e o Ofício (+10%); o Calendário caiu 25%.')
    expect(text).toContain('Pessoas ativas')
    expect(text).toContain('Narrações começadas')
    expect(text).toContain('50% ouvidas até o fim · só web, por ora')
  })

  it('lists what moved most and ranks the features with their change', async () => {
    const { wrapper } = await mountPanel()
    const text = wrapper.text()

    expect(text).toContain('Rosário +50%.')
    expect(text).toContain('Calendário −25%.')
    expect(text).toContain('Erros em PDF: 4%')
    const ranking = wrapper.find('.op-rank tbody')
    expect(ranking.findAll('tr')[0].text()).toContain('Ofício')
    expect(ranking.text()).toContain('+10%')
  })

  it('ranks by people-days when the URL asks for it', async () => {
    routes.set('/api/v1/admin/usage/top', () => ({ ...top(1), features: [{ feature: 'office', count: 900, errors: 0, user_days: 10 }, { feature: 'journal', count: 10, errors: 0, user_days: 50 }] }))
    const { wrapper } = await mountPanel({ aba: 'uso', medida: 'pessoas' })

    expect(wrapper.find('.op-rank tbody tr').text()).toContain('Diário')
  })

  it('falls back to one series per feature when the API has no grouped series', async () => {
    await mountPanel()

    const features = calls('/api/v1/admin/usage/series').map(url => url.searchParams.get('feature')).filter(Boolean)
    expect(features).toEqual(expect.arrayContaining(['office', 'rosary', 'calendar', 'pdf']))
  })

  it('stripes the days before the telemetry and says the comparison is unavailable', async () => {
    routes.set('/api/v1/admin/usage/status', () => new OrdoApiError('Not found', 404))
    routes.set('/api/v1/admin/usage/active_users', query => ({ period: {}, series: isPrevious(query) ? activeSeries(PREVIOUS.start, 0) : activeSeries(WINDOW.start, 100, 3) }))
    const { wrapper } = await mountPanel()

    expect(wrapper.find('.op-chart__gap').exists()).toBe(true)
    expect(wrapper.text()).toContain('comparação indisponível: o período anterior não tem dados')
    expect(wrapper.text()).toContain('esses dias aparecem riscados, não como zero')
  })
})

describe('UsagePanel · status days', () => {
  it('stripes the days the status calls no_data and shades the closing ones', async () => {
    routes.set('/api/v1/admin/usage/status', () => ({
      rollup: { first_day: '2026-11-21', last_closed_day: '2026-11-25' },
      sources: [],
      days: [...days(PREVIOUS.start, 7).map(date => ({ date, state: 'no_data' })), ...days(WINDOW.start, 7).map((date, index) => ({ date, state: index < 2 ? 'no_data' : index >= 4 ? 'closing' : 'closed' })), { date: '2026-11-26', state: 'open' }]
    }))
    const { wrapper } = await mountPanel()

    expect(wrapper.find('.op-chart__gap').exists()).toBe(true)
    expect(wrapper.find('.op-chart__closing').exists()).toBe(true)
    expect(wrapper.text()).toContain('últimos 3 dias: podem mudar até o próximo resumo')
    expect(wrapper.text()).toContain('comparação indisponível')
  })
})

describe('UsagePanel · honest states', () => {
  it('says the counting starts tonight before the first rollup', async () => {
    routes.set('/api/v1/admin/usage/status', () => ({
      rollup: { first_day: null, first_event_at: '2026-11-25T18:12:00-03:00', last_closed_day: null, next_run_at: '2026-11-27T00:30:00-03:00' },
      sources: [
        { source: 'request', client: 'app', today: 51200, last_hour: 3100, first_day: null, first_event_at: null, last_event_at: '2026-11-26T15:03:59-03:00' },
        { source: 'client', client: 'web', today: 3900, last_hour: 210, first_day: null, first_event_at: null },
        { source: 'client', client: 'app', today: 0, last_hour: 0, first_day: null, first_event_at: null }
      ],
      days: []
    }))
    routes.set('/api/v1/admin/usage/active_users', () => ({ period: {}, series: [] }))
    routes.set('/api/v1/admin/usage/top', () => ({ ...top(1), features: [], events: [] }))
    routes.set('/api/v1/admin/usage/series', () => ({ period: {}, filter: {}, series: [] }))
    const { wrapper } = await mountPanel()
    const text = wrapper.text()

    expect(text).toContain('O Uso começa a contar nesta madrugada.')
    expect(text).toContain('25 de novembro')
    expect(text).toContain('27 de novembro')
    expect(text).toContain('Servidor: pedidos à API')
    expect(text).toContain('espera a 1.46')
    expect(text).toContain('primeiro número em 27 nov.')
  })

  // Production after a deploy: the status lost its bookkeeping and reports
  // `last_closed_day: null`, but the reports have the numbers. Data wins, and
  // every period reads it the same way.
  it.each([
    ['7 dias', { preset: '7d' as const, start: '2026-11-20', end: '2026-11-26' }],
    ['Sempre', { preset: 'all' as const, start: '2025-01-01', end: '2026-11-26' }]
  ])('shows the numbers when the status says null but the reports have data (%s)', async (_, chosen) => {
    routes.set('/api/v1/admin/usage/status', () => ({ rollup: { first_day: null, last_closed_day: null, next_run_at: '2026-11-27T00:30:00-03:00' }, sources: [], days: [] }))
    const { wrapper } = await mountPanel({ aba: 'uso' }, chosen)
    const text = wrapper.text()

    expect(text).not.toContain('O Uso começa a contar nesta madrugada.')
    expect(wrapper.find('.op-usage__kpis').exists()).toBe(true)
    expect(text).toContain('usaram o Ordo')
  })

  it('keeps the first-rollup state when the status says null and the reports are empty', async () => {
    routes.set('/api/v1/admin/usage/status', () => ({ rollup: { first_day: null, last_closed_day: null }, sources: [], days: [] }))
    routes.set('/api/v1/admin/usage/active_users', () => ({ period: {}, series: activeSeries(WINDOW.start, 0) }))
    routes.set('/api/v1/admin/usage/top', () => ({ ...top(1), features: [], events: [] }))
    routes.set('/api/v1/admin/usage/series', () => ({ period: {}, filter: {}, series: [] }))
    const { wrapper } = await mountPanel()

    expect(wrapper.text()).toContain('O Uso começa a contar nesta madrugada.')
  })

  it('infers the same state from empty reports when the status endpoint is not deployed', async () => {
    routes.set('/api/v1/admin/usage/status', () => new OrdoApiError('Not found', 404))
    routes.set('/api/v1/admin/usage/active_users', () => ({ period: {}, series: [] }))
    routes.set('/api/v1/admin/usage/top', () => ({ ...top(1), features: [], events: [] }))
    routes.set('/api/v1/admin/usage/series', () => ({ period: {}, filter: {}, series: [] }))
    const { wrapper } = await mountPanel()

    expect(wrapper.text()).toContain('O Uso começa a contar nesta madrugada.')
    expect(wrapper.text()).toContain('Status da telemetria em breve')
    expect(wrapper.find('.op-state--error').exists()).toBe(false)
  })

  it('says the reports are not deployed when the API answers 404 everywhere', async () => {
    routes.clear()
    const { wrapper } = await mountPanel()

    expect(wrapper.find('.op-state h2').text()).toBe('O painel de uso ainda não está nesta API')
  })

  it('shows an error, not "em breve", when the reports fail for real', async () => {
    routes.set('/api/v1/admin/usage/active_users', () => new OrdoApiError('Erro interno', 500))
    routes.set('/api/v1/admin/usage/top', () => new OrdoApiError('Erro interno', 500))
    const { wrapper } = await mountPanel()

    expect(wrapper.find('.op-state--error').text()).toContain('Erro interno')
  })
})

describe('UsagePanel · sections', () => {
  it('opens a feature from the URL and goes back to all of them', async () => {
    const { wrapper, writes } = await mountPanel({ aba: 'uso', secao: 'recursos', recurso: 'office' })

    expect(calls('/api/v1/admin/usage/series').some(url => url.searchParams.get('feature') === 'office')).toBe(true)
    expect(calls('/api/v1/admin/usage/breakdown').some(url => url.searchParams.get('dimension') === 'client' && url.searchParams.get('feature') === 'office')).toBe(true)
    const text = wrapper.text()
    expect(text).toContain('Rezados até o fim')
    expect(text).toContain('71%')
    expect(text).toContain('Por ofício rezado')
    expect(text).toContain('Abriu um ofício')
    expect(text).not.toContain('share_performed')
    // office_type is not split by the rollup yet: "em breve", no error.
    expect(text).toContain('em breve')

    await wrapper.findAll('button').find(button => button.text() === 'Todos os recursos')!.trigger('click')
    await flushPromises()
    expect(writes.at(-1)).toEqual({ aba: 'uso', secao: 'recursos' })
  })

  it('writes the section to the URL and never the default', async () => {
    const { wrapper, writes } = await mountPanel()

    await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Funis')!.trigger('click')
    await flushPromises()
    expect(writes.at(-1)).toEqual({ aba: 'uso', secao: 'funis' })

    await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Resumo')!.trigger('click')
    await flushPromises()
    expect(writes.at(-1)).toEqual({ aba: 'uso' })
  })

  it('splits people into app only, web only and both, and marks narration coverage as coming soon', async () => {
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'publico' })
    const text = wrapper.text()

    // Last day: app 500, web 200, both 100 in 30 days → 400 app only, 100 web only.
    expect(text).toContain('600 pessoas, a maioria só no app')
    expect(text).toContain('Só no app · 400 · 67%')
    expect(text).toContain('Fora das pessoas')
    expect(text).toContain('40')
    expect(text).toContain('LOC 2015')
    expect(text).toContain('+25%')
    expect(text).toContain('mais antigas')
    expect(text).toContain('Ainda não dá para ver')
    expect(wrapper.findAll('.op-soon').length).toBeGreaterThan(0)
  })

  it('reads the narration coverage from Áudio when it is deployed', async () => {
    routes.set('/api/v1/admin/audio/readiness', () => ({ books: [{ prayer_book_code: 'loc_2015', bibles: [{ default: true, computed: true, totals: { percentage: 100 } }] }, { prayer_book_code: 'bas_1985_en', bibles: [{ default: true, computed: true, totals: { percentage: 0 } }] }] }))
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'publico' })

    const pills = wrapper.findAll('.op-rank .op-pill').map(pill => pill.text())
    expect(pills).toEqual(['100%', 'sem voz'])
  })

  it('tells each funnel in words and keeps the proposed one as "em breve"', async () => {
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'funis' })
    const text = wrapper.text()

    expect(text).toContain('7 de cada 10')
    expect(text).toContain('29% fecharam sem marcar')
    expect(text).toContain('6')
    expect(text).toContain('2,5 vezes')
    expect(text).toContain('3 de cada 100')
    expect(text).toContain('parcial: só web')
    expect(text).toContain('+5,0 p.p.')
    expect(text).toContain('Primeiro acesso')
    expect(text).toContain('em breve')
  })

  it('draws the first-access funnel once the API has it', async () => {
    routes.set('/api/v1/admin/usage/funnels', () => ({
      ...funnels(0.7),
      funnels: [...funnels(0.7).funnels, { key: 'first_access', per_user: true, steps: [{ event: 'onboarding_started', count: 50, user_days: 50, reached: 50 }, { event: 'onboarding_completed', count: 40, user_days: 40, reached: 40 }, { event: 'office_completed', count: 20, user_days: 20, reached: 20 }], started: 50, converted: 20, rate: 0.4 }]
    }))
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'funis' })

    expect(wrapper.text()).toContain('Em 4 de cada 10 dias em que alguém começa o primeiro acesso')
    expect(wrapper.text()).toContain('50% terminaram sem rezar no mesmo dia')
    expect(wrapper.find('.op-usage__proposed').exists()).toBe(false)
  })

  it('keeps the other cards when the funnels fail', async () => {
    routes.set('/api/v1/admin/usage/funnels', () => new OrdoApiError('Erro interno', 500))
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'funis' })

    expect(wrapper.text()).toContain('Funis: Erro interno')
    expect(wrapper.find('.op-state').exists()).toBe(false)
  })

  it('names content from its slug, compares it and shows what is coming', async () => {
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'conteudo' })
    const text = wrapper.text()

    expect(text).toContain('Santos e datas · 2')
    expect(text).toContain('Todos os Santos')
    expect(text).toContain('Santo Andre Apostolo')
    expect(text).toContain('+350%')
    // The per-slug series is not deployed: the trend column says so.
    expect(wrapper.find('.op-rank thead .op-soon').exists()).toBe(true)
    expect(text).toContain('30 nov. · Santo André, apóstolo.')
    expect(text).toContain('Já é o 2º mais aberto')
    expect(text).toContain('Trinta e Nove Artigos')
  })

  it('names content by the title the API sends, and by the slug when the title is null', async () => {
    routes.set('/api/v1/admin/usage/content', query => query.get('slug')
      ? new OrdoApiError('Not found', 404)
      : {
          period: {},
          filter: {},
          rows: [
            { content_kind: 'saint', content_slug: 'santo-andre-apostolo', event: 'post_opened', count: 90, user_days: 70, title: 'Santo André, Apóstolo' },
            { content_kind: 'saint', content_slug: 'todos-os-santos', event: 'post_opened', count: 120, user_days: 100, title: null },
            { content_kind: null, content_slug: 'trinta-e-nove-artigos', event: 'document_opened', count: 12, user_days: 10, title: 'Os Trinta e Nove Artigos de Religião' }
          ]
        })
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'conteudo' })
    const names = wrapper.findAll('.op-rank tbody .op-rank__name').map(cell => cell.text())

    expect(names[0]).toContain('Todos os Santos')
    expect(names[1]).toContain('Santo André, Apóstolo')
    expect(names[1]).toContain('santo-andre-apostolo')
    expect(wrapper.text()).not.toContain('Santo Andre Apostolo')
    expect(wrapper.find('.op-ranklist').text()).toContain('Os Trinta e Nove Artigos de Religião')
    // The search finds the title too.
    await wrapper.find('input[type="search"]').setValue('andré')
    expect(wrapper.findAll('.op-rank tbody tr')).toHaveLength(1)
  })

  it('takes the title from `content?slug=` when the list has none', async () => {
    routes.set('/api/v1/admin/usage/content', query => {
      const slug = query.get('slug')
      if (slug) {
        return {
          period: {},
          filter: { content_slug: slug },
          title: slug === 'santo-andre-apostolo' ? 'Santo André, Apóstolo' : null,
          rows: [{ content_kind: 'saint', content_slug: slug, event: 'post_opened', count: 1, user_days: 1, title: null }],
          series: days(WINDOW.start, 7).map(date => ({ date, count: 3 }))
        }
      }
      return {
        period: {},
        filter: {},
        rows: [
          { content_kind: 'saint', content_slug: 'santo-andre-apostolo', event: 'post_opened', count: 90, user_days: 70 },
          { content_kind: 'saint', content_slug: 'todos-os-santos', event: 'post_opened', count: 120, user_days: 100 }
        ]
      }
    })
    const { wrapper } = await mountPanel({ aba: 'uso', secao: 'conteudo' })
    await flushPromises()
    const text = wrapper.text()

    expect(calls('/api/v1/admin/usage/content').some(url => url.searchParams.get('slug') === 'santo-andre-apostolo')).toBe(true)
    expect(text).toContain('Santo André, Apóstolo')
    expect(text).toContain('Todos os Santos')
    expect(wrapper.find('.op-rank thead .op-soon').exists()).toBe(false)
  })
})
