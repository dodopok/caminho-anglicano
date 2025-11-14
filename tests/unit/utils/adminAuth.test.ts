import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Mock dependencies
vi.mock('h3', () => ({
  getHeader: vi.fn(),
  createError: vi.fn((options) => {
    const error = new Error(options.message) as any
    error.statusCode = options.statusCode
    return error
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
}))

import { getHeader, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { isAdmin, requireAdmin } from '../../../layers/admin/server/utils/adminAuth'

describe('adminAuth', () => {
  let mockEvent: H3Event
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock event
    mockEvent = {} as H3Event

    // Mock runtime config
    vi.mocked(useRuntimeConfig).mockReturnValue({
      adminEmail: 'admin@test.com',
      public: {
        supabaseUrl: 'https://test.supabase.co',
      },
      supabaseServiceKey: 'test-service-key',
    } as any)

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
    }
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient)
  })

  describe('isAdmin', () => {
    it('should return false when ADMIN_EMAIL is not configured', async () => {
      vi.mocked(useRuntimeConfig).mockReturnValue({
        adminEmail: undefined,
        public: { supabaseUrl: 'https://test.supabase.co' },
        supabaseServiceKey: 'test-service-key',
      } as any)

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should return false when authorization header is missing', async () => {
      vi.mocked(getHeader).mockReturnValue(undefined)

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should return false when authorization header does not start with "Bearer "', async () => {
      vi.mocked(getHeader).mockReturnValue('Basic abc123')

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should return false when token is invalid', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer invalid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should return false when user email does not match admin email', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer valid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: 'user@test.com',
            id: 'user-123',
          },
        },
        error: null,
      })

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should return true when user email matches admin email', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer valid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: 'admin@test.com',
            id: 'admin-123',
          },
        },
        error: null,
      })

      const result = await isAdmin(mockEvent)
      expect(result).toBe(true)
    })

    it('should return false when Supabase throws an error', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer valid-token')
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should handle malformed token gracefully', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer ')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Malformed token' },
      })

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('should throw 401 when authorization header is missing', async () => {
      vi.mocked(getHeader).mockReturnValue(undefined)

      await expect(requireAdmin(mockEvent)).rejects.toThrow()
      expect(createError).toHaveBeenCalledWith({
        statusCode: 401,
        message: 'Authentication required',
      })
    })

    it('should throw 403 when user is not an admin (invalid token)', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer invalid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })

      await expect(requireAdmin(mockEvent)).rejects.toThrow()
      expect(createError).toHaveBeenCalledWith({
        statusCode: 403,
        message: 'Admin access required',
      })
    })

    it('should throw 403 when user email does not match admin email', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer valid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: 'user@test.com',
            id: 'user-123',
          },
        },
        error: null,
      })

      await expect(requireAdmin(mockEvent)).rejects.toThrow()
      expect(createError).toHaveBeenCalledWith({
        statusCode: 403,
        message: 'Admin access required',
      })
    })

    it('should not throw when user is a valid admin', async () => {
      vi.mocked(getHeader).mockReturnValue('Bearer valid-token')
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: 'admin@test.com',
            id: 'admin-123',
          },
        },
        error: null,
      })

      await expect(requireAdmin(mockEvent)).resolves.toBeUndefined()
    })
  })
})
