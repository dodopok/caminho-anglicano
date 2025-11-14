import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration tests for submission API endpoints
 * These tests verify the complete workflow of submitting and managing church submissions
 */

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
  createError: vi.fn((options) => {
    const error = new Error(options.message) as any
    error.statusCode = options.statusCode
    return error
  }),
  $fetch: vi.fn(),
}))

import { createClient } from '@supabase/supabase-js'

describe('Submission API Integration Tests', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRuntimeConfig).mockReturnValue({
      adminEmail: 'admin@test.com',
      public: {
        supabaseUrl: 'https://test.supabase.co',
        googleMapsApiKey: 'test-maps-key',
      },
      supabaseServiceKey: 'test-service-key',
    } as any)

    mockSupabaseClient = {
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      insert: vi.fn(() => mockSupabaseClient),
      update: vi.fn(() => mockSupabaseClient),
      delete: vi.fn(() => mockSupabaseClient),
      eq: vi.fn(() => mockSupabaseClient),
      single: vi.fn(),
      ilike: vi.fn(() => mockSupabaseClient),
      auth: {
        getUser: vi.fn(),
      },
    }

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient)
  })

  describe('Church Submission Workflow', () => {
    it('should validate required fields in submission', () => {
      const { ChurchSubmissionSchema } = require('../../../layers/admin/server/utils/validation')

      const invalidSubmission = {
        name: 'AB', // Too short
        address: 'Short',
        jurisdiction: 'IEAB',
        responsibleEmail: 'admin@church.com',
      }

      const result = ChurchSubmissionSchema.safeParse(invalidSubmission)
      expect(result.success).toBe(false)
    })

    it('should accept valid submission data', () => {
      const { ChurchSubmissionSchema } = require('../../../layers/admin/server/utils/validation')

      const validSubmission = {
        name: 'Igreja Anglicana Test',
        address: 'Rua Example, 123 - Centro',
        jurisdiction: 'IEAB',
        responsibleEmail: 'admin@church.com',
        schedules: 'Domingos às 10h',
        description: 'A beautiful church',
        pastors: 'Rev. John Doe',
      }

      const result = ChurchSubmissionSchema.safeParse(validSubmission)
      expect(result.success).toBe(true)
    })
  })

  describe('Admin Submission Approval Workflow', () => {
    it('should require admin authentication', async () => {
      const { isAdmin } = require('../../../layers/admin/server/utils/adminAuth')

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })

      const mockEvent = {
        path: '/api/admin/submissions/123/approve',
      } as any

      vi.mocked(getHeader).mockReturnValue('Bearer invalid-token')

      const result = await isAdmin(mockEvent)
      expect(result).toBe(false)
    })

    it('should transform submission data correctly for church creation', async () => {
      const { transformSubmission } = require('../../../layers/admin/server/utils/submissionTransformer')

      const submission = {
        id: '123',
        name: 'Igreja Test',
        address: 'Rua Example, 123',
        jurisdiction: 'IEAB',
        responsible_email: 'admin@church.com',
        pastors: 'Rev. John, Rev. Jane',
        schedules: 'Domingos às 10h, Quartas às 19h',
        description: 'Test church',
        website: 'https://church.com',
        instagram: null,
        youtube: null,
        spotify: null,
        status: 'pending',
        submitted_at: '2024-01-01T00:00:00Z',
        reviewed_at: null,
        review_notes: null,
      }

      const geocodeResult = {
        latitude: -23.5505,
        longitude: -46.6333,
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000-000',
        formattedAddress: 'Rua Example, 123, São Paulo - SP',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId: 'jurisdiction-123',
      })

      expect(result.name).toBe('Igreja Test')
      expect(result.pastors).toEqual(['Rev. John', 'Rev. Jane'])
      expect(result.schedules).toHaveLength(2)
      expect(result.latitude).toBe(-23.5505)
      expect(result.city).toBe('São Paulo')
    })

    it('should enforce rate limiting on geocoding requests', () => {
      const { RateLimits } = require('../../../layers/admin/server/utils/rateLimit')

      expect(RateLimits.GEOCODING.maxRequests).toBe(10)
      expect(RateLimits.GEOCODING.windowMs).toBe(60 * 1000)
    })
  })

  describe('Bulk Submission Workflow', () => {
    it('should validate bulk submission data array', () => {
      const { BulkChurchDataSchema } = require('../../../layers/admin/server/utils/validation')

      const bulkData = [
        {
          name: 'Igreja 1',
          address: 'Rua Example, 123',
          jurisdiction: 'IEAB',
          responsible_email: 'admin1@church.com',
        },
        {
          name: 'Igreja 2',
          address: 'Rua Example, 456',
          jurisdiction: 'IEAB',
          responsible_email: 'admin2@church.com',
        },
      ]

      const result = BulkChurchDataSchema.safeParse(bulkData)
      expect(result.success).toBe(true)
    })

    it('should reject bulk data with invalid items', () => {
      const { BulkChurchDataSchema } = require('../../../layers/admin/server/utils/validation')

      const bulkData = [
        {
          name: 'AB', // Too short
          address: 'Rua Example, 123',
          jurisdiction: 'IEAB',
          responsible_email: 'admin@church.com',
        },
      ]

      const result = BulkChurchDataSchema.safeParse(bulkData)
      expect(result.success).toBe(false)
    })
  })
})

// Mock getHeader for tests
function getHeader(event: any, header: string): string | undefined {
  return undefined
}
