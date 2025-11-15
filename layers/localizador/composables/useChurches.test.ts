import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock global $fetch
global.$fetch = vi.fn()

describe('useChurches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('fetchChurches', () => {
    it('should fetch churches with jurisdiction filter', async () => {
      const mockChurches = [
        { id: '1', name: 'Igreja Test 1', city: 'São Paulo', jurisdictionId: 'ieab' },
        { id: '2', name: 'Igreja Test 2', city: 'Rio de Janeiro', jurisdictionId: 'ieab' },
      ]

      global.$fetch = vi.fn().mockResolvedValue(mockChurches)

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      const result = await fetchChurches({ jurisdictionId: 'ieab' })

      expect(global.$fetch).toHaveBeenCalledWith('/api/churches/jurisdiction/ieab')
      expect(result).toEqual(mockChurches)
    })

    it('should filter churches by search query client-side when using jurisdiction filter', async () => {
      const mockChurches = [
        { id: '1', name: 'Igreja Anglicana', city: 'São Paulo', address: 'Rua A', jurisdictionId: 'ieab' },
        { id: '2', name: 'Igreja Episcopal', city: 'Rio de Janeiro', address: 'Rua B', jurisdictionId: 'ieab' },
      ]

      global.$fetch = vi.fn().mockResolvedValue(mockChurches)

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      const result = await fetchChurches({
        jurisdictionId: 'ieab',
        searchQuery: 'Anglicana'
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Igreja Anglicana')
    })

    it('should search in name, city, and address', async () => {
      const mockChurches = [
        { id: '1', name: 'Igreja A', city: 'São Paulo', address: 'Rua Test', jurisdictionId: 'ieab' },
        { id: '2', name: 'Igreja B', city: 'Test City', address: 'Rua B', jurisdictionId: 'ieab' },
        { id: '3', name: 'Test Igreja', city: 'Rio', address: 'Rua C', jurisdictionId: 'ieab' },
      ]

      global.$fetch = vi.fn().mockResolvedValue(mockChurches)

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      const result = await fetchChurches({
        jurisdictionId: 'ieab',
        searchQuery: 'test'
      })

      expect(result).toHaveLength(3)
    })

    it('should fetch all churches without filters', async () => {
      const mockChurches = [
        { id: '1', name: 'Igreja 1' },
        { id: '2', name: 'Igreja 2' },
      ]

      global.$fetch = vi.fn().mockResolvedValue(mockChurches)

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      const result = await fetchChurches()

      expect(global.$fetch).toHaveBeenCalledWith('/api/churches', {
        params: {}
      })
      expect(result).toEqual(mockChurches)
    })

    it('should fetch churches with search query only', async () => {
      const mockChurches = [
        { id: '1', name: 'Igreja Anglicana' },
      ]

      global.$fetch = vi.fn().mockResolvedValue(mockChurches)

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      const result = await fetchChurches({ searchQuery: 'Anglicana' })

      expect(global.$fetch).toHaveBeenCalledWith('/api/churches', {
        params: { search: 'Anglicana' }
      })
      expect(result).toEqual(mockChurches)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useChurches } = await import('./useChurches')
      const { fetchChurches } = useChurches()

      await expect(fetchChurches()).rejects.toThrow('Network error')
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching churches:', mockError)

      consoleSpy.mockRestore()
    })
  })

  describe('fetchChurchById', () => {
    it('should fetch church by ID', async () => {
      const mockChurch = {
        id: '123',
        name: 'Igreja Test',
        city: 'São Paulo'
      }

      global.$fetch = vi.fn().mockResolvedValue(mockChurch)

      const { useChurches } = await import('./useChurches')
      const { fetchChurchById } = useChurches()

      const result = await fetchChurchById('123')

      expect(global.$fetch).toHaveBeenCalledWith('/api/churches/123')
      expect(result).toEqual(mockChurch)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Church not found')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useChurches } = await import('./useChurches')
      const { fetchChurchById } = useChurches()

      await expect(fetchChurchById('999')).rejects.toThrow('Church not found')
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching church:', mockError)

      consoleSpy.mockRestore()
    })
  })

  describe('fetchChurchBySlug', () => {
    it('should fetch church by slug', async () => {
      const mockChurch = {
        id: '123',
        slug: 'igreja-anglicana-sao-paulo',
        name: 'Igreja Anglicana'
      }

      global.$fetch = vi.fn().mockResolvedValue(mockChurch)

      const { useChurches } = await import('./useChurches')
      const { fetchChurchBySlug } = useChurches()

      const result = await fetchChurchBySlug('igreja-anglicana-sao-paulo')

      expect(global.$fetch).toHaveBeenCalledWith('/api/churches/slug/igreja-anglicana-sao-paulo')
      expect(result).toEqual(mockChurch)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Church not found')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useChurches } = await import('./useChurches')
      const { fetchChurchBySlug } = useChurches()

      await expect(fetchChurchBySlug('invalid-slug')).rejects.toThrow('Church not found')
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching church by slug:', mockError)

      consoleSpy.mockRestore()
    })
  })
})
