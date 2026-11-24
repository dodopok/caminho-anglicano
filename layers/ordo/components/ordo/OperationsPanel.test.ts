import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPortalQuery, providePortalQuery, type PortalQuery } from '../../composables/usePortalQuery'
import type { CustomRosaryPrayer, DashboardData } from '../../types/dashboard'

const rosaries: CustomRosaryPrayer[] = [
  {
    id: 1,
    title: 'Salmos 23',
    description: 'O Senhor é o meu pastor.',
    locale: 'pt-BR',
    share_status: 'pending_review',
    created_at: '2026-01-20T12:00:00Z',
    expanded_steps_count: 36,
    author: { id: 7, name: 'Marcos Teixeira', email: 'marcos@example.com', submissions_count: 12, approved_count: 9, rejected_count: 1, pending_count: 2 },
    similar_titles: [{ title: 'Salmo 23 (Tradicional)', source: 'catalog', score: 0.92 }]
  },
  {
    id: 2,
    title: 'Salmo 6',
    locale: 'pt-BR',
    share_status: 'pending_review',
    created_at: '2026-09-26T12:00:00Z',
    author: { id: 8, name: 'Ana Lima', submissions_count: 1 },
    similar_titles: []
  }
]

const api = {
  fetchCustomRosaries: vi.fn(),
  fetchCustomRosary: vi.fn(),
  fetchRosaryCategories: vi.fn(),
  approveCustomRosary: vi.fn(),
  rejectCustomRosary: vi.fn(),
  fetchLifeRules: vi.fn()
}

vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => api }))

const { default: OperationsPanel } = await import('./OperationsPanel.vue')

const dashboard: DashboardData = {
  moderation: {
    custom_rosaries: {
      pending_now: 200,
      oldest_pending_age_seconds: 2 * 86_400 + 5 * 3_600,
      approved_in_period: 8,
      rejected_in_period: 2,
      approval_rate: 80,
      average_response_time_seconds: 5_400,
      reentries_in_period: 1,
      approved_without_strapi: 0,
      reviewed_per_day: [{ date: '2026-11-23', approved: 3, rejected: 1 }, { date: '2026-11-24', approved: 5, rejected: 0 }],
      average_reviews_per_day: 4.5,
      estimated_days_to_clear: 45
    },
    life_rules: { pending_now: 1 }
  },
  life_rules: {
    public_rules: 12,
    total_adoptions: 210,
    top_adopted: [
      { id: 1, title: 'Regra de São Bento', adoptions: 90 },
      { id: 2, title: 'Regra breve', adoptions: 40 },
      { id: 3, title: 'Regra da tarde', adoptions: 20 },
      { id: 4, title: 'Regra da noite', adoptions: 5 }
    ],
    exams: { completed_in_period: 6, users_with_completed_exams: 4, average_score: 7.25 }
  },
  health: {
    notifications: { failures_last_24_hours: 0 },
    audio_sessions: { failed: 3, running: 1, stale_running: 2 },
    api_keys: { expiring_next_30_days: 1 }
  },
  notifications: {
    total_in_period: 100,
    success_rate: 97,
    delivery_status_counts: { sent: 97, failed: 3 },
    conversion_by_type: [{ notification_type: 'streak_reminder', sent: 80, followed_by_prayer: 20, rate: 25, window_minutes: 120 }]
  }
}

const mountPanel = async () => {
  const wrapper = mount(OperationsPanel, { props: { dashboard, periodLabel: '30 dias' }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

// The panel inside a page that owns the URL, as `/portal-do-ordo?…` would be.
const mountAt = async (url: Record<string, string>) => {
  const writes: Array<Record<string, string>> = []
  let query: PortalQuery | null = null
  const Page = defineComponent({
    setup () {
      query = providePortalQuery(createPortalQuery({ read: () => url, write: next => { writes.push(next) } }))
      return () => h(OperationsPanel, { dashboard, periodLabel: '30 dias' })
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await flushPromises()
  return { wrapper, writes, query: query! }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchCustomRosaries.mockResolvedValue({ custom_rosary_prayers: rosaries, pagination: { total: 200, limit: 20, offset: 0, count: 2 } })
  api.fetchCustomRosary.mockImplementation(async (id: number) => ({ custom_rosary_prayer: { ...rosaries.find(item => item.id === id), expanded_steps: [
    { position: 1, display_title: 'Cruz', text: 'O Senhor é o meu pastor; nada me faltará.' },
    { position: 2, display_title: 'Semana', text: 'Guia-me pelas veredas da justiça.' },
    { position: 3, display_title: 'Semana', text: 'Guia-me pelas veredas da justiça.' }
  ] } }))
  api.fetchRosaryCategories.mockResolvedValue({ rosary_categories: [{ documentId: 'cat_psalms', slug: 'psalms', name: 'Salmos' }] })
  api.fetchLifeRules.mockResolvedValue({ life_rules: [], pagination: { total: 0, limit: 8, offset: 0, count: 0 } })
})

describe('OperationsPanel', () => {
  it('reopens the life rules with their filter after a reload', async () => {
    const { wrapper } = await mountAt({ aba: 'operacao', vista: 'regras', situacao: 'todas', busca: 'jejum' })

    expect(wrapper.find('[aria-label="Regras de vida"]').exists()).toBe(true)
    expect(api.fetchLifeRules).toHaveBeenCalledWith(expect.objectContaining({ status: 'all', search: 'jejum' }))
  })

  it('reopens the rosary that was in review, with the queue as it was', async () => {
    const { wrapper } = await mountAt({ aba: 'operacao', ordem: 'novos', rosario: '2' })

    expect(api.fetchCustomRosaries).toHaveBeenCalledWith(expect.objectContaining({ sort: 'created_at', direction: 'desc' }))
    expect(wrapper.find('.op-bench__review h2').text()).toBe('Salmo 6')
  })

  it('writes the open rosary and the sub-tab into the URL', async () => {
    const { wrapper, writes } = await mountAt({ aba: 'operacao' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(writes.at(-1)).toMatchObject({ aba: 'operacao', rosario: '1' })

    await wrapper.findAll('[role="tab"]').find(tab => tab.text().includes('Regras de vida'))?.trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(writes.at(-1)).toEqual({ aba: 'operacao', vista: 'regras' })
  })

  it('says what is waiting in one line', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.find('.ops-summary').text()).toBe('200 rosários em revisão · o mais antigo espera há 2 d 5 h · 1 regra de vida nova')
  })

  it('shows the review pace and when the queue would clear', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('a fila zera em ~45 dias')
  })

  it('opens the oldest rosary beside the queue, with who wrote it and their history', async () => {
    const wrapper = await mountPanel()
    const review = wrapper.find('.op-bench__review')

    expect(review.find('h2').text()).toBe('Salmos 23')
    expect(review.find('.op-author').text()).toContain('Marcos Teixeira')
    expect(review.find('.op-author').text()).toContain('12 enviados · 9 aprovados · 1 rejeitado · 2 na fila')
  })

  it('warns about a title that looks like one already published', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.find('.op-checks').text()).toContain('“Salmo 23 (Tradicional)” (publicado)')
    expect(wrapper.findAll('.op-qitem')[0].text()).toContain('parecido')
  })

  it('folds repeated beads into one line with the count', async () => {
    const wrapper = await mountPanel()
    const steps = wrapper.findAll('.op-steps > li')

    expect(steps).toHaveLength(2)
    expect(steps[1].text()).toContain('2 contas, mesmo texto')
    expect(steps[1].text()).toContain('× 2')
  })

  it('approves with the A key and moves to the next rosary', async () => {
    api.approveCustomRosary.mockResolvedValue({ custom_rosary_prayer: { ...rosaries[0], share_status: 'approved' } })
    const wrapper = await mountPanel()

    await wrapper.find('.op-bench').trigger('keydown', { key: 'a' })
    await flushPromises()

    expect(api.approveCustomRosary).toHaveBeenCalledWith(1, { mode: 'existing', slug: 'psalms', documentId: 'cat_psalms' }, 'salmos-23')
    expect(wrapper.find('.op-bench__review h2').text()).toBe('Salmo 6')
    expect(wrapper.find('.op-review__notice').text()).toContain('“Salmos 23” aprovado.')
  })

  it('asks for the order the moderator chose', async () => {
    const wrapper = await mountPanel()
    const newest = wrapper.findAll('button').find(button => button.text() === 'Mais novos')

    await newest?.trigger('click')

    expect(api.fetchCustomRosaries).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'created_at', direction: 'desc' }))
  })

  it('flags only the health signals that ask for action', async () => {
    const wrapper = await mountPanel()
    const health = wrapper.findAll('.op-card').find(card => card.text().includes('O que pode estar quebrado'))

    expect(health?.findAll('.op-tone-warn')).toHaveLength(3)
    expect(health?.findAll('.op-tone-ok')).toHaveLength(1)
  })

  it('keeps the life-rule card to the three most adopted', async () => {
    const wrapper = await mountPanel()
    const rules = wrapper.findAll('.op-card').find(card => card.text().includes('Adoção e exames'))

    expect(rules?.text()).toContain('Regra de São Bento')
    expect(rules?.text()).not.toContain('Regra da noite')
  })

  it('shows the life-rule queue as read only', async () => {
    const wrapper = await mountPanel()

    await wrapper.findAll('button[role="tab"]')[1].trigger('click')

    expect(wrapper.text()).toContain('Fila só de leitura')
    expect(api.fetchLifeRules).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', limit: 8, offset: 0 }))
  })
})
