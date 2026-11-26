import { describe, expect, it } from 'vitest'
import { contentGroup, eventLabel, featureLabel, groupContent, latestActiveDay, ratePercent, usagePeriod } from './usage'
import type { UsageActivePoint } from '../types/usage'

const point = (date: string, dau: number, wau = dau, mau = wau): UsageActivePoint => ({
  date,
  dau,
  wau,
  mau,
  by_client: {},
  app_and_web: { dau: 0, wau: 0, mau: 0 }
})

describe('usage dashboard helpers', () => {
  it('keeps a period the API accepts and cuts a longer one to the last 366 days', () => {
    expect(usagePeriod({ preset: '30d', start: '2026-10-27', end: '2026-11-25' }))
      .toEqual({ start_date: '2026-10-27', end_date: '2026-11-25', clamped: false })
    expect(usagePeriod({ preset: 'all', start: '1970-01-01', end: '2026-11-25' }))
      .toEqual({ start_date: '2025-11-25', end_date: '2026-11-25', clamped: true })
    // Exactly 366 days, start and end included, still fits.
    expect(usagePeriod({ preset: 'custom', start: '2025-11-25', end: '2026-11-25' }).clamped).toBe(false)
  })

  it('reads people from the last day the rollup closed, not from today', () => {
    const series = [point('2026-11-23', 10, 40, 90), point('2026-11-24', 12, 41, 91), point('2026-11-25', 0, 0, 0)]
    expect(latestActiveDay(series)?.date).toBe('2026-11-24')
    expect(latestActiveDay([point('2026-11-25', 0)])).toBeNull()
  })

  it('sorts content into saints, documents, posts and rosaries and adds up a slug', () => {
    expect(contentGroup({ content_kind: 'saint', event: 'post_opened' })).toBe('saints')
    expect(contentGroup({ content_kind: 'commemoration', event: 'post_opened' })).toBe('saints')
    expect(contentGroup({ content_kind: null, event: 'document_opened' })).toBe('documents')
    expect(contentGroup({ content_kind: 'post', event: 'post_opened' })).toBe('posts')
    expect(contentGroup({ content_kind: null, event: 'rosary_started' })).toBe('rosaries')
    expect(contentGroup({ content_kind: null, event: 'favorite_toggled' })).toBeNull()

    const groups = groupContent([
      { content_kind: 'saint', content_slug: 'santo-agostinho', event: 'post_opened', count: 3, user_days: 2 },
      { content_kind: 'commemoration', content_slug: 'santo-agostinho', event: 'post_opened', count: 4, user_days: 4 },
      { content_kind: 'saint', content_slug: 'santa-monica', event: 'post_opened', count: 5, user_days: 5 },
      { content_kind: null, content_slug: 'catecismo', event: 'document_opened', count: 1, user_days: 1 }
    ])
    expect(groups.saints).toEqual([
      { slug: 'santo-agostinho', count: 7, userDays: 6 },
      { slug: 'santa-monica', count: 5, userDays: 5 }
    ])
    expect(groups.documents).toEqual([{ slug: 'catecismo', count: 1, userDays: 1 }])
    expect(groups.posts).toEqual([])
  })

  it('names features and events in Portuguese and keeps an unknown name readable', () => {
    expect(featureLabel('office')).toBe('Ofício')
    expect(eventLabel('purchase_finished')).toBe('Terminou uma compra')
    expect(eventLabel('brand_new_event')).toBe('Brand new event')
    expect(featureLabel(null)).toBe('Sem recurso')
  })

  it('turns the API rate into a percentage', () => {
    expect(ratePercent(0.4567)).toBe(45.7)
    expect(ratePercent(null)).toBeNull()
    expect(ratePercent(undefined)).toBeNull()
  })
})
