import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CountryMap from './CountryMap.vue'

describe('CountryMap', () => {
  it('renders the aggregate map, accessible ranking and fallback table', async () => {
    const wrapper = mount(CountryMap, {
      props: {
        geography: {
          scope: 'lifetime',
          coverage: {
            total_users: 10,
            explicit_country_users: 7,
            timezone_inferred_country_users: 2,
            resolved_country_users: 9,
            unresolved_country_users: 1,
            explicit_country_percentage: 70,
            resolved_country_percentage: 90
          },
          country_breakdown: [
            { country_code: 'BR', users: 4, explicit_users: 4, timezone_inferred_users: 0 },
            { country_code: 'PT', users: 2, explicit_users: 1, timezone_inferred_users: 1 },
            { country_code: 'other', users: 1, explicit_users: 0, timezone_inferred_users: 0 }
          ],
          by_country: { BR: 4, PT: 2, other: 1 },
          by_language: { pt: 7 }
        }
      }
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('path').length).toBeGreaterThan(100)
    expect(wrapper.find('path[aria-label^="Brasil:"]').attributes('fill')).not.toBe('#f7faf7')
    expect(wrapper.find('path[aria-label^="Estados Unidos:"]').attributes('fill')).toBe('#f7faf7')
    expect(wrapper.find('table').text()).toContain('Ambíguo ou desconhecido')
    expect(wrapper.find('.ordo-country-map__list').text()).not.toContain('Ambíguo ou desconhecido')
    expect(wrapper.text()).toContain('90%')
    expect(wrapper.find('button[aria-pressed="false"]').exists()).toBe(true)

    await wrapper.find('path[aria-label^="Brasil:"]').trigger('focus')
    expect(wrapper.find('[role="status"]').text()).toContain('Brasil')
    expect(wrapper.find('[role="status"]').text()).toContain('40%')
  })

  it('keeps the map neutral and explains the empty state without data', () => {
    const wrapper = mount(CountryMap, { props: { geography: { coverage: { total_users: 0 }, country_breakdown: [] } } })

    expect(wrapper.find('path[aria-label^="Brasil:"]').attributes('fill')).toBe('#f7faf7')
    expect(wrapper.text()).toContain('Ainda não há países resolvidos para colorir')
    expect(wrapper.find('table').text()).toContain('Sem dados de país para exibir.')
  })
})
