export interface Jurisdiction {
  id: string
  slug: string
  name: string
  fullName: string
  color: string
  description?: string
  website?: string
  active: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

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
  slug: string
  jurisdictionId: string
  jurisdiction?: Jurisdiction
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
  review_notes?: string
}

export interface BulkChurchSubmission {
  id: string
  bulkData: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  review_notes?: string
}

export interface ChurchFilters {
  jurisdictionId?: string
  searchQuery?: string
  address?: string
  postalCode?: string
}

export interface ChurchWithDistance extends Church {
  distance?: number // Distance in kilometers
}
