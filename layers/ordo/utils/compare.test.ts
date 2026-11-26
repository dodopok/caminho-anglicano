import { describe, expect, it } from 'vitest'
import { comparePeriods, previousLabel, previousPeriod } from './compare'

describe('comparePeriods', () => {
  it('reads a count as a percentage, good when it grows', () => {
    expect(comparePeriods(265, 200)).toMatchObject({ direction: 'up', tone: 'good', text: '+33%', previousText: '200' })
    expect(comparePeriods(180, 200)).toMatchObject({ direction: 'down', tone: 'bad', text: '−10%' })
    expect(comparePeriods(105, 100)).toMatchObject({ text: '+5%' })
    expect(comparePeriods(102.4, 100)).toMatchObject({ text: '+2,4%' })
  })

  it('calls small moves stable instead of a trend', () => {
    expect(comparePeriods(1004, 1000)).toMatchObject({ direction: 'flat', tone: 'neutral', text: 'estável' })
  })

  it('reads a rate in percentage points', () => {
    expect(comparePeriods(25.3, 22.1, { kind: 'rate' })).toMatchObject({ direction: 'up', tone: 'good', text: '+3,2 p.p.', previousText: '22,1%' })
    expect(comparePeriods(22.3, 22.1, { kind: 'rate' })).toMatchObject({ direction: 'flat' })
  })

  it('treats a shorter wait as the good news', () => {
    const delta = comparePeriods(32_000, 40_000, { kind: 'duration', format: seconds => `${seconds} s` })
    expect(delta).toMatchObject({ direction: 'down', tone: 'good', previousText: '40000 s' })
  })

  it('says nothing when there is nothing to compare with', () => {
    expect(comparePeriods(10, null)).toBeNull()
    expect(comparePeriods(undefined, 10)).toBeNull()
    expect(comparePeriods(4, 0)).toMatchObject({ direction: 'up', text: 'antes, nenhum' })
    expect(comparePeriods(0, 0)).toBeNull()
  })
})

describe('previousPeriod', () => {
  it('is the window of the same length that ends the day before', () => {
    expect(previousPeriod({ preset: '30d', start: '2026-10-26', end: '2026-11-24' })).toEqual({ start: '2026-09-26', end: '2026-10-25', days: 30 })
    expect(previousPeriod({ preset: 'custom', start: '2026-03-01', end: '2026-03-07' })).toEqual({ start: '2026-02-22', end: '2026-02-28', days: 7 })
  })

  it('does not exist for "Desde sempre"', () => {
    expect(previousPeriod({ preset: 'all', start: '1970-01-01', end: '2026-11-24' })).toBeNull()
    expect(previousLabel({ preset: 'all', start: '1970-01-01', end: '2026-11-24' })).toBe('')
    expect(previousLabel({ preset: '30d', start: '2026-10-26', end: '2026-11-24' })).toBe('30 dias anteriores')
  })
})
