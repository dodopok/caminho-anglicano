import { z } from 'zod'

/**
 * URL validation schema
 * Allows empty strings or valid URLs
 */
const urlSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return true
    try {
      new URL(val)
      return true
    }
    catch {
      return false
    }
  },
  { message: 'Invalid URL format' },
).optional().or(z.literal(''))

/**
 * Email validation schema
 */
const emailSchema = z.string().email('Invalid email format').min(5).max(255)

/**
 * Schema for church submission data
 */
export const ChurchSubmissionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200, 'Name too long').trim(),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address too long').trim(),
  jurisdiction: z.string().min(2, 'Jurisdiction is required').max(200).trim(),
  responsibleEmail: emailSchema,
  schedules: z.string().max(1000).trim().optional().nullable(),
  description: z.string().max(2000).trim().optional().nullable(),
  pastors: z.string().max(500).trim().optional().nullable(),
  website: urlSchema.nullable(),
  instagram: urlSchema.nullable(),
  youtube: urlSchema.nullable(),
  spotify: urlSchema.nullable(),
})

/**
 * Schema for updating church data (admin)
 * Only allows specific fields to be updated
 */
export const ChurchUpdateSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  address: z.string().min(10).max(500).trim().optional(),
  jurisdiction_id: z.string().uuid().optional(),
  schedules: z.any().optional().nullable(), // Complex type, validated separately
  description: z.string().max(2000).trim().optional().nullable(),
  pastors: z.any().optional().nullable(), // Array type, validated separately
  social_media: z.object({
    website: urlSchema.nullable(),
    instagram: urlSchema.nullable(),
    youtube: urlSchema.nullable(),
    spotify: urlSchema.nullable(),
  }).optional(),
}).strict() // Rejects any additional fields

/**
 * Schema for updating submission data (admin)
 */
export const SubmissionUpdateSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  address: z.string().min(10).max(500).trim().optional(),
  jurisdiction: z.string().min(2).max(200).trim().optional(),
  responsible_email: emailSchema.optional(),
  schedules: z.string().max(1000).trim().optional().nullable(),
  description: z.string().max(2000).trim().optional().nullable(),
  pastors: z.string().max(500).trim().optional().nullable(),
  website: urlSchema.nullable().optional(),
  instagram: urlSchema.nullable().optional(),
  youtube: urlSchema.nullable().optional(),
  spotify: urlSchema.nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  review_notes: z.string().max(2000).optional().nullable(),
}).strict()

/**
 * Schema for bulk church data
 */
export const BulkChurchDataSchema = z.array(z.object({
  name: z.string().min(3).max(200),
  address: z.string().min(10).max(500),
  jurisdiction: z.string().min(2).max(200),
  responsible_email: emailSchema,
  schedules: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  pastors: z.string().max(500).optional(),
  website: urlSchema.nullable().optional(),
  instagram: urlSchema.nullable().optional(),
  youtube: urlSchema.nullable().optional(),
  spotify: urlSchema.nullable().optional(),
}))

/**
 * Schema for Google Places search query
 */
export const PlaceSearchSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters').max(200).trim(),
})

/**
 * Schema for bulk submission approval notes
 */
export const BulkApprovalSchema = z.object({
  review_notes: z.string().min(1, 'review_notes é obrigatório').max(2000).trim(),
})

/**
 * Email validation function
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length >= 5 && email.length <= 255
}
