import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock global $fetch
global.$fetch = vi.fn()

describe('useJurisdictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module state between tests
    vi.resetModules()
  })

  it('should fetch jurisdictions from API', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
      { id: '2', name: 'REB', slug: 'reb', color: '#4169E1' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, jurisdictions } = useJurisdictions()

    const result = await fetchJurisdictions()

    expect(global.$fetch).toHaveBeenCalledWith('/api/jurisdictions')
    expect(result).toEqual(mockJurisdictions)
    expect(jurisdictions.value).toEqual(mockJurisdictions)
  })

  it('should cache jurisdictions and not refetch', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions } = useJurisdictions()

    await fetchJurisdictions()
    await fetchJurisdictions()

    // Should only fetch once due to caching
    expect(global.$fetch).toHaveBeenCalledTimes(1)
  })

  it('should get jurisdiction by id', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
      { id: '2', name: 'REB', slug: 'reb', color: '#4169E1' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionById } = useJurisdictions()

    await fetchJurisdictions()

    const result = getJurisdictionById('1')
    expect(result).toEqual(mockJurisdictions[0])
  })

  it('should return undefined for non-existent id', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionById } = useJurisdictions()

    await fetchJurisdictions()

    const result = getJurisdictionById('999')
    expect(result).toBeUndefined()
  })

  it('should get jurisdiction by slug', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
      { id: '2', name: 'REB', slug: 'reb', color: '#4169E1' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionBySlug } = useJurisdictions()

    await fetchJurisdictions()

    const result = getJurisdictionBySlug('ieab')
    expect(result).toEqual(mockJurisdictions[0])
  })

  it('should get jurisdiction color', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionColor } = useJurisdictions()

    await fetchJurisdictions()

    expect(getJurisdictionColor('1')).toBe('#8B4513')
    expect(getJurisdictionColor('999')).toBe('#6B7280') // Default color
  })

  it('should get jurisdiction name', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'ieab', color: '#8B4513' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionName } = useJurisdictions()

    await fetchJurisdictions()

    expect(getJurisdictionName('1')).toBe('IEAB')
    expect(getJurisdictionName('999')).toBe('')
  })

  it('should get jurisdiction slug in lowercase', async () => {
    const mockJurisdictions = [
      { id: '1', name: 'IEAB', slug: 'IEAB', color: '#8B4513' },
    ]

    global.$fetch = vi.fn().mockResolvedValue(mockJurisdictions)

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions, getJurisdictionSlug } = useJurisdictions()

    await fetchJurisdictions()

    expect(getJurisdictionSlug('1')).toBe('ieab')
  })

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error')
    global.$fetch = vi.fn().mockRejectedValue(mockError)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { useJurisdictions } = await import('./useJurisdictions')
    const { fetchJurisdictions } = useJurisdictions()

    await expect(fetchJurisdictions()).rejects.toThrow('Network error')
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching jurisdictions:', mockError)

    consoleSpy.mockRestore()
  })
})
