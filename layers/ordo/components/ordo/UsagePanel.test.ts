import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPortalQuery, providePortalQuery } from '../../composables/usePortalQuery'
import { OrdoApiError } from '../../types/dashboard'
import type { UsageActiveUsersResponse, UsageFunnelsResponse, UsageTopResponse } from '../../types/usage'

const api = {
  fetchUsageTop: vi.fn(),
  fetchUsageSeries: vi.fn(),
  fetchUsageBreakdown: vi.fn(),
  fetchUsageActiveUsers: vi.fn(),
  fetchUsageFunnels: vi.fn(),
  fetchUsageContent: vi.fn(),
  fetchAudioPrayerBooks: vi.fn()
}
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => api }))

const { default: UsagePanel } = await import('./UsagePanel.vue')

const period = { preset: '7d' as const, start: '2026-11-19', end: '2026-11-25' }
const echo = { start_date: period.start, end_date: period.end }

const top: UsageTopResponse = {
  period: echo,
  features: [{ feature: 'office', count: 1200, errors: 3, user_days: 400 }, { feature: 'journal', count: 90, errors: 0, user_days: 30 }],
  events: [{ event: 'office_opened', source: 'client', count: 800, user_days: 300 }],
  counters: []
}

const day = (date: string, dau: number) => ({
  date,
  dau,
  wau: dau * 3,
  mau: dau * 6,
  by_client: { app: { dau: dau - 2, wau: dau * 2, mau: dau * 5 }, web: { dau: 2, wau: 5, mau: 9 } },
  app_and_web: { dau: 1, wau: 2, mau: 4 }
})

const active: UsageActiveUsersResponse = {
  period: echo,
  series: [day('2026-11-23', 50), day('2026-11-24', 60), { ...day('2026-11-25', 0), wau: 0, mau: 0, app_and_web: { dau: 0, wau: 0, mau: 0 } }]
}

const funnels: UsageFunnelsResponse = {
  period: echo,
  raw_window: echo,
  funnels: [
    { key: 'office', per_user: true, steps: [{ event: 'office_opened', count: 800, user_days: 300 }, { event: 'office_completed', count: 500, user_days: 240 }], started: 300, converted: 210, rate: 0.7 },
    { key: 'share', per_user: false, steps: [{ event: 'share_sheet_opened', count: 40, user_days: 30 }, { event: 'share_performed', count: 25, user_days: 20 }, { event: 'share_link_opened', count: 70, user_days: 60 }] }
  ]
}

const mountPanel = async (url: Record<string, string> = { aba: 'uso' }) => {
  const Page = defineComponent({
    setup () {
      providePortalQuery(createPortalQuery({ read: () => url, write: () => {} }))
      return () => h(UsagePanel, { period, monthly: false, reloadKey: 0 })
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchUsageTop.mockResolvedValue(top)
  api.fetchUsageActiveUsers.mockResolvedValue(active)
  api.fetchUsageFunnels.mockResolvedValue(funnels)
  api.fetchUsageSeries.mockResolvedValue({ period: echo, filter: {}, series: [{ date: '2026-11-24', count: 10, users: 4 }] })
  api.fetchUsageBreakdown.mockImplementation(async (_period: unknown, dimension: string) => ({
    period: echo,
    dimension,
    filter: {},
    rows: dimension === 'book' ? [{ value: 'loc_2015', count: 30 }, { value: null, count: 2 }] : [{ value: 'app', count: 10 }]
  }))
  api.fetchUsageContent.mockResolvedValue({
    period: echo,
    filter: {},
    rows: [
      { content_kind: 'saint', content_slug: 'santo-agostinho', event: 'post_opened', count: 9, user_days: 8 },
      { content_kind: null, content_slug: 'catecismo', event: 'document_opened', count: 4, user_days: 4 }
    ]
  })
  api.fetchAudioPrayerBooks.mockResolvedValue({ data: [{ id: '1', code: 'loc_2015', name: 'LOC 2015' }] })
})

describe('UsagePanel', () => {
  it('reads every report for the period and shows people from the last closed day', async () => {
    const wrapper = await mountPanel()

    expect(api.fetchUsageTop).toHaveBeenCalledWith(echo, 20)
    expect(api.fetchUsageBreakdown).toHaveBeenCalledTimes(5)
    expect(api.fetchUsageSeries).toHaveBeenCalledWith(echo, {})
    const text = wrapper.text()
    // 24 Nov, not the still-open 25th.
    expect(text).toContain('Pessoas no dia')
    expect(text).toContain('60')
    expect(text).toContain('360')
    expect(text).toContain('Ofício')
    expect(text).toContain('Abriu um ofício')
    expect(text).toContain('70%')
    expect(text).toContain('santo-agostinho')
    expect(text).toContain('catecismo')
    expect(text).toContain('LOC 2015')
    expect(text).toContain('Não informado')
  })

  it('reopens the series of the feature in the URL', async () => {
    await mountPanel({ aba: 'uso', serie: 'journal' })

    expect(api.fetchUsageSeries).toHaveBeenCalledWith(echo, { feature: 'journal' })
  })

  it('says the reports are not deployed when the API answers 404 everywhere', async () => {
    const missing = new OrdoApiError('Not found', 404)
    Object.values(api).forEach(fn => fn.mockRejectedValue(missing))

    const wrapper = await mountPanel()

    expect(wrapper.find('.op-state h2').text()).toBe('O painel de uso ainda não está nesta API')
  })

  it('keeps the other cards when one report fails', async () => {
    api.fetchUsageFunnels.mockRejectedValue(new OrdoApiError('Erro interno', 500))

    const wrapper = await mountPanel()

    expect(wrapper.find('.op-state').exists()).toBe(false)
    expect(wrapper.text()).toContain('Funis: Erro interno')
    expect(wrapper.text()).toContain('Abriu um ofício')
  })
})
