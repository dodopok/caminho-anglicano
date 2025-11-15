import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock global $fetch
global.$fetch = vi.fn()

describe('useSubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('submitChurch', () => {
    it('should submit church successfully', async () => {
      const mockInput = {
        name: 'Igreja Test',
        address: 'Rua Test, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'test@example.com',
        schedules: 'Domingos às 10h',
        description: 'Uma igreja teste',
        pastors: 'Pe. João Silva',
      }

      const mockResponse = {
        success: true,
        data: {
          id: '123',
          ...mockInput,
          status: 'pending',
          created_at: '2025-01-01',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitChurch } = useSubmissions()

      const result = await submitChurch(mockInput)

      expect(global.$fetch).toHaveBeenCalledWith('/api/submissions/church', {
        method: 'POST',
        body: mockInput,
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should submit church with optional fields', async () => {
      const mockInput = {
        name: 'Igreja Mínima',
        address: 'Rua Mínima, 1',
        jurisdiction: 'IEAB',
        responsibleEmail: 'minimal@example.com',
      }

      const mockResponse = {
        success: true,
        data: {
          id: '456',
          ...mockInput,
          status: 'pending',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitChurch } = useSubmissions()

      const result = await submitChurch(mockInput)

      expect(result).toEqual(mockResponse.data)
    })

    it('should submit church with social media links', async () => {
      const mockInput = {
        name: 'Igreja Social',
        address: 'Rua Social, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'social@example.com',
        website: 'https://example.com',
        instagram: 'https://instagram.com/igreja',
        youtube: 'https://youtube.com/igreja',
        spotify: 'https://spotify.com/igreja',
      }

      const mockResponse = {
        success: true,
        data: {
          id: '789',
          ...mockInput,
          status: 'pending',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitChurch } = useSubmissions()

      const result = await submitChurch(mockInput)

      expect(result.website).toBe('https://example.com')
      expect(result.instagram).toBe('https://instagram.com/igreja')
    })

    it('should handle submission errors', async () => {
      const mockError = new Error('Validation failed')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockInput = {
        name: 'Igreja Error',
        address: 'Rua Error, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'error@example.com',
      }

      const { useSubmissions } = await import('./useSubmissions')
      const { submitChurch } = useSubmissions()

      await expect(submitChurch(mockInput)).rejects.toThrow('Validation failed')
      expect(consoleSpy).toHaveBeenCalledWith('Error submitting church:', mockError)

      consoleSpy.mockRestore()
    })

    it('should handle network errors', async () => {
      const mockError = new Error('Network error')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockInput = {
        name: 'Igreja Network',
        address: 'Rua Network, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'network@example.com',
      }

      const { useSubmissions } = await import('./useSubmissions')
      const { submitChurch } = useSubmissions()

      await expect(submitChurch(mockInput)).rejects.toThrow('Network error')

      consoleSpy.mockRestore()
    })
  })

  describe('submitBulkChurches', () => {
    it('should submit bulk churches successfully', async () => {
      const bulkData = `Igreja 1, Endereço 1, IEAB, email1@test.com
Igreja 2, Endereço 2, REB, email2@test.com`

      const mockResponse = {
        success: true,
        data: {
          id: 'bulk-123',
          bulk_data: bulkData,
          status: 'pending',
          created_at: '2025-01-01',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitBulkChurches } = useSubmissions()

      const result = await submitBulkChurches(bulkData)

      expect(global.$fetch).toHaveBeenCalledWith('/api/submissions/bulk', {
        method: 'POST',
        body: { bulkData },
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle empty bulk data', async () => {
      const bulkData = ''

      const mockResponse = {
        success: true,
        data: {
          id: 'bulk-empty',
          bulk_data: bulkData,
          status: 'pending',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitBulkChurches } = useSubmissions()

      const result = await submitBulkChurches(bulkData)

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle bulk submission errors', async () => {
      const mockError = new Error('Invalid bulk format')
      global.$fetch = vi.fn().mockRejectedValue(mockError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const bulkData = 'Invalid data format'

      const { useSubmissions } = await import('./useSubmissions')
      const { submitBulkChurches } = useSubmissions()

      await expect(submitBulkChurches(bulkData)).rejects.toThrow('Invalid bulk format')
      expect(consoleSpy).toHaveBeenCalledWith('Error submitting bulk churches:', mockError)

      consoleSpy.mockRestore()
    })

    it('should handle large bulk data', async () => {
      const churches = Array.from({ length: 100 }, (_, i) =>
        `Igreja ${i + 1}, Endereço ${i + 1}, IEAB, email${i + 1}@test.com`
      )
      const bulkData = churches.join('\n')

      const mockResponse = {
        success: true,
        data: {
          id: 'bulk-large',
          bulk_data: bulkData,
          status: 'pending',
        },
      }

      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      const { useSubmissions } = await import('./useSubmissions')
      const { submitBulkChurches } = useSubmissions()

      const result = await submitBulkChurches(bulkData)

      expect(result.bulk_data).toBe(bulkData)
      expect(global.$fetch).toHaveBeenCalledTimes(1)
    })
  })
})
