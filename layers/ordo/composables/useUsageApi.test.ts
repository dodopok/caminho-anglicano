import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrdoApiError } from '../types/dashboard'
import { isNotDeployed } from './useReport'

const request = vi.fn()
vi.mock('./useOrdoApi', () => ({ useOrdoApi: () => ({ request }) }))
const { useUsageApi } = await import('./useUsageApi')

const range = { start_date: '2026-11-19', end_date: '2026-11-25' }

beforeEach(() => { request.mockReset() })

describe('useUsageApi', () => {
  it('reads an unknown breakdown dimension as a report that is not deployed yet', async () => {
    request.mockRejectedValue(new OrdoApiError('dimension must be one of…', 400, { code: 'INVALID_DIMENSION' }))

    const error = await useUsageApi().breakdown(range, 'premium').catch(caught => caught)
    expect(isNotDeployed(error)).toBe(true)
  })

  it('keeps a real bad request as an error', async () => {
    request.mockRejectedValue(new OrdoApiError('start_date must not be after end_date', 400, { code: 'INVALID_PERIOD' }))

    const error = await useUsageApi().breakdown(range, 'client').catch(caught => caught)
    expect(isNotDeployed(error)).toBe(false)
  })

  it('reads every feature\'s series in one call when the API groups them', async () => {
    request.mockResolvedValue({ period: range, group_by: 'feature', groups: [{ feature: 'office', series: [{ date: '2026-11-25', count: 3, users: 2 }] }] })

    const result = await useUsageApi().featureSeries(range, ['office', 'rosary'])
    expect(result.grouped).toBe(true)
    expect(result.series.office).toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][0]).toContain('group_by=feature')
  })

  it('falls back to one call per feature when the API ignores or lacks the grouping', async () => {
    request.mockImplementation(async (path: string) => {
      if (path.includes('group_by')) return { period: range, filter: {}, series: [] }
      if (path.includes('feature=rosary')) throw new OrdoApiError('Erro', 500)
      return { period: range, filter: { feature: 'office' }, series: [{ date: '2026-11-25', count: 3, users: 2 }] }
    })

    const result = await useUsageApi().featureSeries(range, ['office', 'rosary'])
    expect(result.grouped).toBe(false)
    expect(Object.keys(result.series)).toEqual(['office'])
  })

  it('asks the calendar with the book in the preferences', async () => {
    request.mockResolvedValue([])
    await useUsageApi().calendarMonth(2026, 11)
    expect(decodeURIComponent(request.mock.calls[0][0])).toContain('/api/v1/calendar/2026/11?preferences={"prayer_book_code":"loc_2015"}')
  })
})
