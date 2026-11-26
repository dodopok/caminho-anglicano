import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import PeriodPicker from './PeriodPicker.vue'

// Read from disk: Vitest hands CSS imports to the test as empty strings.
const css = readFileSync(resolve(__dirname, '../../assets/portal.css'), 'utf8')

/** The declarations of `selector` inside the `@media (max-width: <width>px)` blocks. */
const narrowRule = (selector: string, width = 900) => {
  const blocks = css.split(`@media (max-width: ${width}px) {`).slice(1)
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const block of blocks) {
    const match = new RegExp(`(?:^|\\n)\\s*${escaped} \\{([^}]*)\\}`).exec(block)
    if (match) return match[1]
  }
  return null
}

describe('PeriodPicker', () => {
  it('offers the five periods, "Desde sempre" short on a narrow screen', () => {
    const wrapper = mount(PeriodPicker, { props: { modelValue: { preset: '30d', start: '2026-10-27', end: '2026-11-25' } } })
    const buttons = wrapper.findAll('.op-seg button')

    expect(buttons.map(button => button.find('.op-only-wide').exists() ? button.find('.op-only-wide').text() : button.text())).toEqual(['7 dias', '30 dias', '90 dias', '12 meses', 'Desde sempre'])
    expect(buttons[4].find('.op-only-narrow').text()).toBe('Sempre')
    expect(buttons[1].attributes('aria-pressed')).toBe('true')
  })

  it('emits the chosen period', async () => {
    const wrapper = mount(PeriodPicker, { props: { modelValue: { preset: '30d', start: '2026-10-27', end: '2026-11-25' } } })
    await wrapper.findAll('.op-seg button')[0].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatchObject({ preset: '7d' })
  })

  // A layout guard: at 390px the five periods used to scroll sideways.
  it('fits the five periods across a phone instead of scrolling them', () => {
    const seg = narrowRule('.op-period .op-seg')
    expect(seg).toMatch(/display:\s*grid/)
    expect(seg).toMatch(/grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/)
    expect(seg).toMatch(/overflow:\s*visible/)
    expect(seg).not.toMatch(/overflow-x:\s*auto/)
    const button = narrowRule('.op-period .op-seg button')
    expect(button).toMatch(/min-width:\s*0/)
    expect(button).toMatch(/white-space:\s*normal/)
    expect(narrowRule('.op-period__range > span')).toMatch(/text-overflow:\s*ellipsis/)
  })
})
