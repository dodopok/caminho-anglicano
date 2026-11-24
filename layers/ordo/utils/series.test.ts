import { describe, expect, it } from 'vitest'
import { OFFICE_META, officeMeta } from './series'

describe('officeMeta', () => {
  it('names the Little Hours and keeps them in the order the day runs', () => {
    expect(officeMeta('prime').label).toBe('Prima')
    expect(officeMeta('terce').label).toBe('Terça')
    expect(officeMeta('none').label).toBe('Noa')
    const order = ['morning', 'prime', 'terce', 'midday', 'none', 'evening', 'compline', 'late_evening']
    expect([...order].sort((a, b) => OFFICE_META[a]!.order - OFFICE_META[b]!.order)).toEqual(order)
  })

  it('writes an office it does not know as words, after the known ones', () => {
    expect(officeMeta('vigil_of_easter')).toMatchObject({ label: 'Vigil of easter', icon: 'clock', order: 99 })
  })
})
