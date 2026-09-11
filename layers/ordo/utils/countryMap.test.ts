import { describe, expect, it } from 'vitest'
import { countryFill, countryPercent, createCountryMapData, normalizeCountryCode, normalizeCountryCounts } from './countryMap'

const locations = [
  { id: 'br', name: 'Brazil', path: 'M0' },
  { id: 'pt', name: 'Portugal', path: 'M1' }
]

describe('country map helpers', () => {
  it('normalizes ISO alpha-2 codes and rejects invented locations', () => {
    expect(normalizeCountryCode(' BR ')).toBe('br')
    expect(normalizeCountryCode('Brazil')).toBeNull()
    expect(normalizeCountryCode('other')).toBeNull()
  })

  it('keeps the unknown bucket while sanitizing counts', () => {
    expect(normalizeCountryCounts({ BR: 4, pt: 2, other: 3, XX: 0, bad: -1 })).toEqual({ br: 4, pt: 2, other: 3 })
  })

  it('uses the total users denominator and preserves the fallback row', () => {
    const data = createCountryMapData({ BR: 4, PT: 2, other: 1 }, 10, locations, code => code === 'other' ? 'Ambíguo ou desconhecido' : code.toUpperCase())

    expect(data).toEqual([
      { code: 'br', count: 4, percent: 40, name: 'BR', hasGeometry: true },
      { code: 'pt', count: 2, percent: 20, name: 'PT', hasGeometry: true },
      { code: 'other', count: 1, percent: 10, name: 'Ambíguo ou desconhecido', hasGeometry: false }
    ])
  })

  it('never paints zero as a data color and uses a continuous scale', () => {
    expect(countryFill(0, 10)).toBe('#f7faf7')
    expect(countryFill(1, 10)).not.toBe(countryFill(2, 10))
    expect(countryFill(10, 10)).toBe('rgb(25, 87, 126)')
    expect(countryPercent(0, 0)).toBe(0)
  })
})
