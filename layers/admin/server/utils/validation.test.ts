import { describe, it, expect } from 'vitest'
import {
  ChurchSubmissionSchema,
  ChurchUpdateSchema,
  SubmissionUpdateSchema,
  BulkChurchDataSchema,
  PlaceSearchSchema,
  BulkApprovalSchema,
  isValidEmail,
} from './validation'

describe('validation utils', () => {
  describe('ChurchSubmissionSchema', () => {
    it('should validate a valid church submission', () => {
      const validData = {
        name: 'Igreja Anglicana Test',
        address: 'Rua Test, 123 - Bairro Test',
        jurisdiction: 'IEAB',
        responsibleEmail: 'test@example.com',
        schedules: 'Domingos às 10h',
        description: 'Uma igreja teste',
        pastors: 'Pe. João Silva',
        website: 'https://example.com',
        instagram: 'https://instagram.com/test',
        youtube: 'https://youtube.com/test',
        spotify: 'https://spotify.com/test',
      }

      const result = ChurchSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject name too short', () => {
      const invalidData = {
        name: 'AB',
        address: 'Rua Test, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'test@example.com',
      }

      const result = ChurchSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'Igreja Test',
        address: 'Rua Test, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'invalid-email',
      }

      const result = ChurchSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept null/undefined for optional fields', () => {
      const validData = {
        name: 'Igreja Test',
        address: 'Rua Test, 123',
        jurisdiction: 'IEAB',
        responsibleEmail: 'test@example.com',
        schedules: null,
        description: undefined,
        pastors: null,
      }

      const result = ChurchSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should trim whitespace from strings', () => {
      const data = {
        name: '  Igreja Test  ',
        address: '  Rua Test, 123  ',
        jurisdiction: '  IEAB  ',
        responsibleEmail: 'test@example.com',
      }

      const result = ChurchSubmissionSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Igreja Test')
        expect(result.data.address).toBe('Rua Test, 123')
        expect(result.data.jurisdiction).toBe('IEAB')
      }
    })
  })

  describe('ChurchUpdateSchema', () => {
    it('should validate a valid update with all fields', () => {
      const validData = {
        name: 'Updated Church',
        address: 'Updated Address, 456',
        jurisdiction_id: '550e8400-e29b-41d4-a716-446655440000',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '01234-567',
        latitude: -23.5505,
        longitude: -46.6333,
        responsible_email: 'updated@example.com',
        social_media: {
          website: 'https://updated.com',
          instagram: 'https://instagram.com/updated',
        },
      }

      const result = ChurchUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate partial updates', () => {
      const partialData = {
        name: 'New Name',
      }

      const result = ChurchUpdateSchema.safeParse(partialData)
      expect(result.success).toBe(true)
    })

    it('should reject additional fields (strict mode)', () => {
      const invalidData = {
        name: 'Test',
        unknownField: 'value',
      }

      const result = ChurchUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate UUID format for jurisdiction_id', () => {
      const invalidData = {
        jurisdiction_id: 'not-a-uuid',
      }

      const result = ChurchUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('SubmissionUpdateSchema', () => {
    it('should validate status enum', () => {
      const validStatuses = ['pending', 'approved', 'rejected']

      validStatuses.forEach(status => {
        const data = { status }
        const result = SubmissionUpdateSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const data = { status: 'invalid' }
      const result = SubmissionUpdateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate review_notes', () => {
      const data = {
        status: 'approved',
        review_notes: 'Aprovado após verificação',
      }

      const result = SubmissionUpdateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('BulkChurchDataSchema', () => {
    it('should validate array of church data', () => {
      const validData = [
        {
          name: 'Igreja 1',
          address: 'Endereço 1, 123',
          jurisdiction: 'IEAB',
          responsible_email: 'test1@example.com',
        },
        {
          name: 'Igreja 2',
          address: 'Endereço 2, 456',
          jurisdiction: 'REB',
          responsible_email: 'test2@example.com',
        },
      ]

      const result = BulkChurchDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty array', () => {
      const result = BulkChurchDataSchema.safeParse([])
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should reject invalid items in array', () => {
      const invalidData = [
        {
          name: 'Valid Church',
          address: 'Valid Address, 123',
          jurisdiction: 'IEAB',
          responsible_email: 'valid@example.com',
        },
        {
          name: 'AB', // Too short
          address: 'Address',
          jurisdiction: 'IEAB',
          responsible_email: 'invalid',
        },
      ]

      const result = BulkChurchDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('PlaceSearchSchema', () => {
    it('should validate valid search query', () => {
      const result = PlaceSearchSchema.safeParse({ query: 'Igreja Anglicana São Paulo' })
      expect(result.success).toBe(true)
    })

    it('should reject short query', () => {
      const result = PlaceSearchSchema.safeParse({ query: 'AB' })
      expect(result.success).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = PlaceSearchSchema.safeParse({ query: '  test query  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('test query')
      }
    })
  })

  describe('BulkApprovalSchema', () => {
    it('should validate valid review notes', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: 'Aprovado após revisão',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty review notes', () => {
      const result = BulkApprovalSchema.safeParse({ review_notes: '' })
      expect(result.success).toBe(false)
    })

    it('should trim review notes', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: '  Notas de aprovação  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.review_notes).toBe('Notas de aprovação')
      }
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('test @example.com')).toBe(false)
    })

    it('should enforce length constraints', () => {
      expect(isValidEmail('a@b')).toBe(false) // Too short (3 chars)
      expect(isValidEmail('a@b.c')).toBe(true) // 5 chars, minimum valid
      expect(isValidEmail('a@b.co')).toBe(true) // 6 chars, valid

      const longEmail = 'a'.repeat(250) + '@test.com'
      expect(isValidEmail(longEmail)).toBe(false) // Too long
    })
  })
})
