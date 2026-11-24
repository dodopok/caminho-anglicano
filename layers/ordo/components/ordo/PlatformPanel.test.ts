import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { DashboardData, DeveloperUsageResponse } from '../../types/dashboard'

const api = { fetchDeveloperUsage: vi.fn() }
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => api }))

const { default: PlatformPanel } = await import('./PlatformPanel.vue')

const period = { preset: '30d' as const, start: '2026-10-26', end: '2026-11-24' }

const dashboard: DashboardData = {
  premium: { active_now: 40 },
  api: { requests_in_period: 1200, top_endpoints: [{ endpoint: 'calendar#day', requests: 900 }] },
  developers: {
    registered: 5,
    approved: 4,
    with_api_keys: 2,
    keys_by_developer: [{ id: 1, name: 'Ana Lima', keys: 2 }],
    usage_by_developer: {
      scope: 'period',
      developers: [
        { id: 1, name: 'Ana Lima', company_name: 'Paróquia da Sé', keys: 2, active_keys: 1, requests_in_period: 900, previous_period_requests: 600, active_days_in_period: 21, last_used_at: new Date().toISOString() },
        { id: 2, name: 'Bruno', keys: 1, active_keys: 1, requests_in_period: 0, previous_period_requests: 0, active_days_in_period: 0, last_used_at: null }
      ]
    }
  }
}

const usage: DeveloperUsageResponse = {
  period: { start_date: period.start, end_date: period.end },
  developer: { id: 1, name: 'Ana Lima', email: 'ana@example.com', company_name: 'Paróquia da Sé', legacy_free: false, plan: { code: 'parish', status: 'active' }, max_keys: 3 },
  totals: { requests_in_period: 900, previous_period_requests: 600, active_days_in_period: 21, keys_used_in_period: 1, lifetime_requests: 5000, last_used_at: new Date().toISOString(), peak_day: { date: '2026-11-20', requests: 120 }, daily_limit: 1000, days_near_limit: 2 },
  daily: { '2026-11-20': 120, '2026-11-21': 80 },
  keys: [
    { id: 10, name: 'Site da paróquia', key_preview: 'estevao_a1b2c3d4…9f9f', active: true, billing_active: true, requests_in_period: 900, active_days_in_period: 21, lifetime_requests: 4800, daily_limit: 1000, daily: { '2026-11-20': 120 } },
    { id: 11, name: 'Teste antigo', active: false, requests_in_period: 0, lifetime_requests: 200, daily: {} }
  ],
  endpoints: [{ endpoint: 'calendar#day', requests: 700, keys: 1 }, { endpoint: 'readings#index', requests: 200, keys: 1 }],
  weekdays: { 0: 50, 1: 200, 2: 150, 3: 150, 4: 150, 5: 150, 6: 50 }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchDeveloperUsage.mockResolvedValue(usage)
})

describe('PlatformPanel', () => {
  it('lists developers busiest first, with activity and the move against the previous window', () => {
    const wrapper = mount(PlatformPanel, { props: { dashboard, period } })
    const rows = wrapper.findAll('.dev-row')

    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Ana Lima')
    expect(rows[0].text()).toContain('21 de 30 dias')
    expect(rows[0].text()).toContain('+50%')
    expect(rows[1].text()).toContain('Nunca usou')
  })

  it('names the endpoints the way the docs do', () => {
    const wrapper = mount(PlatformPanel, { props: { dashboard, period } })

    expect(wrapper.text()).toContain('Calendário · um dia')
  })

  it('opens a developer\'s keys, endpoints and days of use', async () => {
    const wrapper = mount(PlatformPanel, { props: { dashboard, period }, attachTo: document.body })
    await wrapper.find('.dev-row').trigger('click')
    await flushPromises()

    expect(api.fetchDeveloperUsage).toHaveBeenCalledWith('1', { start_date: period.start, end_date: period.end })
    const sheet = wrapper.find('[role="dialog"]')
    expect(sheet.text()).toContain('Paróquia')
    expect(sheet.text()).toContain('Site da paróquia')
    expect(sheet.text()).toContain('Desligada')
    expect(sheet.text()).toContain('Leituras · lista')
    expect(sheet.text()).toContain('Usa mais às segundas')
    expect(sheet.text()).toContain('Domingo')

    await sheet.find('button[aria-label="Fechar"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
