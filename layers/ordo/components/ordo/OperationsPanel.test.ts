import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OperationsPanel from './OperationsPanel.vue'
import type { DashboardData } from '../../types/dashboard'

const dashboard: DashboardData = {
  moderation: {
    custom_rosaries: {
      pending_now: 3,
      oldest_pending_age_seconds: 2 * 86_400 + 5 * 3_600,
      approved_in_period: 8,
      rejected_in_period: 2,
      approval_rate: 80,
      average_response_time_seconds: 5_400,
      reentries_in_period: 1,
      approved_without_strapi: 0
    },
    life_rules: { pending_now: 1 }
  },
  life_rules: {
    total_rules: 40,
    public_rules: 12,
    approved_rules: 30,
    pending_rules: 1,
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
  notifications: { total_in_period: 100, sent: 97, failed: 3, success_rate: 97, delivery_status_counts: { sent: 97, failed: 3 } },
  custom_rosaries: { created_in_period: 9, public_in_period: 4, average_blocks: 3, average_expanded_steps: 12, users_near_limit: 2, by_share_status: { pending_review: 3, approved: 20 } }
}

const mountPanel = () => mount(OperationsPanel, {
  props: {
    dashboard,
    lifeRules: [],
    lifeRulesPagination: { total: 1, limit: 6, offset: 0, count: 0 },
    lifeRulesLoading: false,
    lifeRuleStatus: 'pending',
    lifeRuleSearch: '',
    lifeRuleCurrentPage: 1,
    lifeRuleTotalPages: 1,
    customRosaries: [],
    customRosariesLoading: false,
    customRosaryStatus: 'pending_review',
    customRosarySearch: '',
    customRosarySort: 'created_at',
    customRosarySortDirection: 'desc',
    customRosaryCurrentPage: 1,
    customRosaryTotalPages: 1,
    customRosaryExplorerRosaries: [],
    customRosaryExplorerLoading: false,
    customRosaryExplorerSearch: '',
    customRosaryExplorerSort: 'created_at',
    customRosaryExplorerSortDirection: 'desc',
    customRosaryExplorerCurrentPage: 1,
    customRosaryExplorerTotalPages: 1,
    selectedRosaryStatusItems: [
      { key: 'pending_review', label: 'Em revisão', value: 3 },
      { key: 'approved', label: 'Aprovado', value: 20 }
    ]
  }
})

describe('OperationsPanel', () => {
  it('says what is waiting in one line instead of a row of cards', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.ordo-section-intro').text()).toContain('3 rosários em revisão · mais antigo há 2 d 5 h · 1 regra pendente')
    expect(wrapper.find('.ordo-metric-card').exists()).toBe(false)
  })

  it('leads with the queues, before any metric', () => {
    const wrapper = mountPanel()

    const html = wrapper.html()
    expect(html.indexOf('Rosários compartilhados')).toBeLessThan(html.indexOf('Qualidade da moderação'))
    expect(html.indexOf('Qualidade da moderação')).toBeLessThan(html.indexOf('Sinais da plataforma'))
  })

  it('flags only the health signals that ask for action', () => {
    const wrapper = mountPanel()

    const flagged = wrapper.findAll('.ordo-stat-list__row.is-attention').map(row => row.text())
    expect(flagged).toHaveLength(2)
    expect(flagged[0]).toContain('Sessões de áudio travadas')
    expect(flagged[1]).toContain('Chaves de API expirando')
  })

  it('keeps the life-rule card to the top three adoptions', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('Regra da tarde')
    expect(wrapper.text()).not.toContain('Regra da noite')
  })

  it('opens the adoption ranking from the life-rule card', async () => {
    const wrapper = mountPanel()

    await wrapper.findAll('button').find(button => button.text() === 'Ranking ↗')?.trigger('click')

    expect(wrapper.text()).toContain('Adoção de regras de vida')
    expect(wrapper.text()).toContain('Regra da noite')
  })

  it('moves the period volume of rosaries into the moderation metrics', async () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).not.toContain('Criados no período')

    await wrapper.findAll('button').find(button => button.text() === 'Abrir métricas ↗')?.trigger('click')

    expect(wrapper.text()).toContain('Criados no período')
    expect(wrapper.text()).toContain('Pessoas perto do limite')
  })
})
