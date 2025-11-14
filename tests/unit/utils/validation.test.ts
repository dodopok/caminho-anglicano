import { describe, it, expect } from 'vitest'
import {
  ChurchSubmissionSchema,
  ChurchUpdateSchema,
  SubmissionUpdateSchema,
  BulkChurchDataSchema,
  PlaceSearchSchema,
  BulkApprovalSchema,
  isValidEmail,
} from '../../../layers/admin/server/utils/validation'

describe('validation schemas', () => {
  describe('ChurchSubmissionSchema', () => {
    const validSubmission = {
      name: 'Igreja Anglicana',
      address: 'Rua Example, 123 - Centro',
      jurisdiction: 'IEAB',
      responsibleEmail: 'admin@church.com',
      schedules: 'Sunday 9am',
      description: 'A beautiful church',
      pastors: 'Rev. John Doe',
      website: 'https://church.com',
      instagram: 'https://instagram.com/church',
      youtube: 'https://youtube.com/church',
      spotify: 'https://spotify.com/church',
    }

    it('should accept valid church submission', () => {
      const result = ChurchSubmissionSchema.safeParse(validSubmission)
      expect(result.success).toBe(true)
    })

    it('should reject name shorter than 3 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        name: 'AB',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 3 characters')
      }
    })

    it('should reject name longer than 200 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        name: 'A'.repeat(201),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('too long')
      }
    })

    it('should reject address shorter than 10 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        address: 'Short',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 10 characters')
      }
    })

    it('should reject address longer than 500 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        address: 'A'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        responsibleEmail: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid email')
      }
    })

    it('should reject email shorter than 5 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        responsibleEmail: 'a@b',
      })
      expect(result.success).toBe(false)
    })

    it('should reject email longer than 255 characters', () => {
      const longEmail = `${'a'.repeat(250)}@test.com`
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        responsibleEmail: longEmail,
      })
      expect(result.success).toBe(false)
    })

    it('should accept null optional fields', () => {
      const result = ChurchSubmissionSchema.safeParse({
        name: 'Igreja Anglicana',
        address: 'Rua Example, 123 - Centro',
        jurisdiction: 'IEAB',
        responsibleEmail: 'admin@church.com',
        schedules: null,
        description: null,
        pastors: null,
        website: null,
        instagram: null,
        youtube: null,
        spotify: null,
      })
      expect(result.success).toBe(true)
    })

    it('should trim whitespace from strings', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        name: '  Igreja Anglicana  ',
        address: '  Rua Example, 123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Igreja Anglicana')
        expect(result.data.address).toBe('Rua Example, 123')
      }
    })

    it('should reject schedules longer than 1000 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        schedules: 'A'.repeat(1001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject description longer than 2000 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        description: 'A'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })

    it('should reject pastors longer than 500 characters', () => {
      const result = ChurchSubmissionSchema.safeParse({
        ...validSubmission,
        pastors: 'A'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ChurchUpdateSchema', () => {
    it('should accept valid update data', () => {
      const result = ChurchUpdateSchema.safeParse({
        name: 'Updated Church Name',
        address: 'New Address, 456',
        city: 'São Paulo',
        state: 'SP',
      })
      expect(result.success).toBe(true)
    })

    it('should reject unknown fields in strict mode', () => {
      const result = ChurchUpdateSchema.safeParse({
        name: 'Updated Church Name',
        unknownField: 'should fail',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].code).toBe('unrecognized_keys')
      }
    })

    it('should accept valid UUID for jurisdiction_id', () => {
      const result = ChurchUpdateSchema.safeParse({
        jurisdiction_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for jurisdiction_id', () => {
      const result = ChurchUpdateSchema.safeParse({
        jurisdiction_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should accept latitude and longitude as numbers', () => {
      const result = ChurchUpdateSchema.safeParse({
        latitude: -23.5505,
        longitude: -46.6333,
      })
      expect(result.success).toBe(true)
    })

    it('should accept social_media object with optional fields', () => {
      const result = ChurchUpdateSchema.safeParse({
        social_media: {
          website: 'https://church.com',
          instagram: 'https://instagram.com/church',
          youtube: null,
          spotify: null,
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty update object', () => {
      const result = ChurchUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('SubmissionUpdateSchema', () => {
    it('should accept valid update data', () => {
      const result = SubmissionUpdateSchema.safeParse({
        name: 'Updated Submission',
        status: 'approved',
        review_notes: 'Looks good',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid status values', () => {
      const statuses = ['pending', 'approved', 'rejected']
      statuses.forEach((status) => {
        const result = SubmissionUpdateSchema.safeParse({ status })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status values', () => {
      const result = SubmissionUpdateSchema.safeParse({
        status: 'invalid-status',
      })
      expect(result.success).toBe(false)
    })

    it('should reject unknown fields in strict mode', () => {
      const result = SubmissionUpdateSchema.safeParse({
        name: 'Test',
        unknownField: 'fail',
      })
      expect(result.success).toBe(false)
    })

    it('should reject review_notes longer than 2000 characters', () => {
      const result = SubmissionUpdateSchema.safeParse({
        review_notes: 'A'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('BulkChurchDataSchema', () => {
    const validBulkData = [
      {
        name: 'Igreja 1',
        address: 'Rua Example, 123',
        jurisdiction: 'IEAB',
        responsible_email: 'admin1@church.com',
        schedules: 'Sunday 9am',
        description: 'Church 1',
        pastors: 'Rev. John',
        website: 'https://church1.com',
        instagram: 'https://instagram.com/church1',
        youtube: null,
        spotify: null,
      },
      {
        name: 'Igreja 2',
        address: 'Rua Example, 456',
        jurisdiction: 'IEAB',
        responsible_email: 'admin2@church.com',
      },
    ]

    it('should accept valid bulk data array', () => {
      const result = BulkChurchDataSchema.safeParse(validBulkData)
      expect(result.success).toBe(true)
    })

    it('should reject non-array input', () => {
      const result = BulkChurchDataSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject if any item in array is invalid', () => {
      const result = BulkChurchDataSchema.safeParse([
        validBulkData[0],
        {
          name: 'AB', // Too short
          address: 'Rua Example, 456',
          jurisdiction: 'IEAB',
          responsible_email: 'admin@church.com',
        },
      ])
      expect(result.success).toBe(false)
    })

    it('should accept empty array', () => {
      const result = BulkChurchDataSchema.safeParse([])
      expect(result.success).toBe(true)
    })
  })

  describe('PlaceSearchSchema', () => {
    it('should accept valid search query', () => {
      const result = PlaceSearchSchema.safeParse({
        query: 'Igreja Anglicana',
      })
      expect(result.success).toBe(true)
    })

    it('should reject query shorter than 3 characters', () => {
      const result = PlaceSearchSchema.safeParse({
        query: 'AB',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 3 characters')
      }
    })

    it('should reject query longer than 200 characters', () => {
      const result = PlaceSearchSchema.safeParse({
        query: 'A'.repeat(201),
      })
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from query', () => {
      const result = PlaceSearchSchema.safeParse({
        query: '  Igreja Anglicana  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('Igreja Anglicana')
      }
    })
  })

  describe('BulkApprovalSchema', () => {
    it('should accept valid review notes', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: 'Approved successfully',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty review_notes', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('obrigatório')
      }
    })

    it('should reject review_notes longer than 2000 characters', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: 'A'.repeat(2001),
      })
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from review_notes', () => {
      const result = BulkApprovalSchema.safeParse({
        review_notes: '  Approved  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.review_notes).toBe('Approved')
      }
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('test@test.com')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('test..user@domain.com')).toBe(false)
    })

    it('should reject email shorter than 5 characters', () => {
      expect(isValidEmail('a@b')).toBe(false)
      expect(isValidEmail('a@bc')).toBe(false)
    })

    it('should reject email longer than 255 characters', () => {
      const longEmail = `${'a'.repeat(250)}@test.com`
      expect(isValidEmail(longEmail)).toBe(false)
    })

    it('should reject emails with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false)
      expect(isValidEmail('test@ example.com')).toBe(false)
    })
  })
})
