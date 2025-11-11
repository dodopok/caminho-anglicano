export type Jurisdiction = 'IAB' | 'IEAB' | 'IECB' | 'IARB' | 'REB'

export interface ChurchSchedule {
  day: string
  time: string
}

export interface ChurchSocialMedia {
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
}

export interface Church {
  id: string
  name: string
  jurisdiction: Jurisdiction
  address: string
  city: string
  state: string
  postalCode: string
  latitude: number
  longitude: number
  schedules: ChurchSchedule[]
  description?: string
  pastors: string[]
  responsibleEmail: string
  socialMedia: ChurchSocialMedia
  createdAt: string
  updatedAt: string
}

export interface ChurchSubmission {
  id: string
  jurisdiction: Jurisdiction | string
  name: string
  address: string
  schedules?: string
  description?: string
  pastors?: string
  responsibleEmail: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewNotes?: string
}

export interface BulkChurchSubmission {
  id: string
  bulkData: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewNotes?: string
}

export interface ChurchFilters {
  jurisdiction?: Jurisdiction
  searchQuery?: string
  address?: string
  postalCode?: string
}
