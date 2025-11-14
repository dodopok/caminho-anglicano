import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Database } from '../../../types/database'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
}))

import { transformSubmission, findJurisdictionId } from '../../../layers/admin/server/utils/submissionTransformer'
import { createClient } from '@supabase/supabase-js'

describe('submissionTransformer', () => {
  describe('transformSubmission', () => {
    const baseSubmission: ChurchSubmission = {
      id: '123',
      name: 'Igreja Anglicana Test',
      address: 'Rua Example, 123',
      jurisdiction: 'IEAB',
      responsible_email: 'admin@church.com',
      schedules: null,
      description: null,
      pastors: null,
      website: null,
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

    const jurisdictionId = '550e8400-e29b-41d4-a716-446655440000'

    it('should transform basic submission correctly', async () => {
      const result = await transformSubmission(baseSubmission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.name).toBe('Igreja Anglicana Test')
      expect(result.address).toBe('Rua Example, 123')
      expect(result.jurisdiction_id).toBe(jurisdictionId)
      expect(result.city).toBe('São Paulo')
      expect(result.state).toBe('SP')
      expect(result.postal_code).toBe('01000-000')
      expect(result.latitude).toBe(-23.5505)
      expect(result.longitude).toBe(-46.6333)
      expect(result.responsible_email).toBe('admin@church.com')
    })

    it('should parse single pastor correctly', async () => {
      const submission = {
        ...baseSubmission,
        pastors: 'Rev. John Doe',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual(['Rev. John Doe'])
    })

    it('should parse multiple pastors separated by comma', async () => {
      const submission = {
        ...baseSubmission,
        pastors: 'Rev. John Doe, Rev. Jane Smith',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual(['Rev. John Doe', 'Rev. Jane Smith'])
    })

    it('should parse multiple pastors separated by semicolon', async () => {
      const submission = {
        ...baseSubmission,
        pastors: 'Rev. John Doe; Rev. Jane Smith',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual(['Rev. John Doe', 'Rev. Jane Smith'])
    })

    it('should parse pastors separated by "and"', async () => {
      const submission = {
        ...baseSubmission,
        pastors: 'Rev. John Doe and Rev. Jane Smith',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual(['Rev. John Doe', 'Rev. Jane Smith'])
    })

    it('should parse pastors separated by "e" (Portuguese)', async () => {
      const submission = {
        ...baseSubmission,
        pastors: 'Rev. João e Rev. Maria',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual(['Rev. João', 'Rev. Maria'])
    })

    it('should return empty array for null pastors', async () => {
      const result = await transformSubmission(baseSubmission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.pastors).toEqual([])
    })

    it('should parse schedule with "às" correctly', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Domingos às 10h',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { day: 'Domingos', time: '10h' },
      ])
    })

    it('should parse schedule with "at" correctly', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Sunday at 10am',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { day: 'Sunday', time: '10am' },
      ])
    })

    it('should parse schedule with space delimiter correctly', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Domingos 10h',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { day: 'Domingos', time: '10h' },
      ])
    })

    it('should parse multiple schedules separated by comma', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Domingos às 10h, Quartas às 19h30',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { day: 'Domingos', time: '10h' },
        { day: 'Quartas', time: '19h30' },
      ])
    })

    it('should parse multiple schedules separated by line break', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Domingos às 10h\nQuartas às 19h30',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { day: 'Domingos', time: '10h' },
        { day: 'Quartas', time: '19h30' },
      ])
    })

    it('should handle schedule with no pattern match as description', async () => {
      const submission = {
        ...baseSubmission,
        schedules: 'Contact for schedule information',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([
        { description: 'Contact for schedule information' },
      ])
    })

    it('should return empty array for null schedules', async () => {
      const result = await transformSubmission(baseSubmission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.schedules).toEqual([])
    })

    it('should build social media object correctly', async () => {
      const submission = {
        ...baseSubmission,
        website: 'https://church.com',
        instagram: 'https://instagram.com/church',
        youtube: 'https://youtube.com/church',
        spotify: 'https://spotify.com/church',
      }

      const result = await transformSubmission(submission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.social_media).toEqual({
        website: 'https://church.com',
        instagram: 'https://instagram.com/church',
        youtube: 'https://youtube.com/church',
        spotify: 'https://spotify.com/church',
      })
    })

    it('should handle null social media fields', async () => {
      const result = await transformSubmission(baseSubmission, {
        geocodeResult,
        jurisdictionId,
      })

      expect(result.social_media).toEqual({
        website: null,
        instagram: null,
        youtube: null,
        spotify: null,
      })
    })
  })

  describe('findJurisdictionId', () => {
    let mockSupabaseClient: any

    beforeEach(() => {
      vi.clearAllMocks()

      vi.mocked(useRuntimeConfig).mockReturnValue({
        public: {
          supabaseUrl: 'https://test.supabase.co',
        },
        supabaseServiceKey: 'test-service-key',
      } as any)

      mockSupabaseClient = {
        from: vi.fn(() => mockSupabaseClient),
        select: vi.fn(() => mockSupabaseClient),
        ilike: vi.fn(() => mockSupabaseClient),
        single: vi.fn(),
      }

      vi.mocked(createClient).mockReturnValue(mockSupabaseClient)
    })

    it('should find jurisdiction by exact name match', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'jurisdiction-123' },
        error: null,
      })

      const result = await findJurisdictionId('IEAB')
      expect(result).toBe('jurisdiction-123')
    })

    it('should find jurisdiction by slug match when exact match fails', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockSupabaseClient.select.mockReturnValueOnce({
        data: [
          { id: 'jurisdiction-123', name: 'IEAB', slug: 'ieab' },
          { id: 'jurisdiction-456', name: 'ACNA', slug: 'acna' },
        ],
        error: null,
      })

      const result = await findJurisdictionId('ieab')
      expect(result).toBe('jurisdiction-123')
    })

    it('should find jurisdiction by partial name match', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockSupabaseClient.select.mockReturnValueOnce({
        data: [
          { id: 'jurisdiction-123', name: 'Igreja Episcopal Anglicana do Brasil', slug: 'ieab' },
          { id: 'jurisdiction-456', name: 'ACNA', slug: 'acna' },
        ],
        error: null,
      })

      const result = await findJurisdictionId('episcopal')
      expect(result).toBe('jurisdiction-123')
    })

    it('should return null when jurisdiction not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockSupabaseClient.select.mockReturnValueOnce({
        data: [],
        error: null,
      })

      const result = await findJurisdictionId('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null when Supabase throws an error', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Database error'))

      const result = await findJurisdictionId('IEAB')
      expect(result).toBeNull()
    })
  })
})
