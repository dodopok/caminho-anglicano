/**
 * Tipos compartilhados para respostas do Supabase
 * Usado nos endpoints da API server-side
 */

export interface ChurchWithJurisdiction {
  id: string
  name: string
  jurisdiction_id: string
  address: string
  city: string
  state: string
  postal_code: string
  latitude: string
  longitude: string
  schedules: string[]
  description: string | null
  pastors: string[]
  responsible_email: string
  social_media: Record<string, unknown>
  created_at: string
  updated_at: string
  jurisdiction: {
    id: string
    slug: string
    name: string
    full_name: string
    color: string
  } | null
}

export interface JurisdictionRow {
  id: string
  slug: string
  name: string
  full_name: string
  color: string
  description: string | null
  website: string | null
  active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface ChurchSubmissionRow {
  id: string
  jurisdiction: string
  name: string
  address: string
  schedules: string | null
  description: string | null
  pastors: string | null
  responsible_email: string
  website: string | null
  instagram: string | null
  youtube: string | null
  spotify: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
}

export interface BulkChurchSubmissionRow {
  id: string
  bulk_data: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  review_notes: string | null
}
