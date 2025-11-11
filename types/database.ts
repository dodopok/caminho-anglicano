export interface Database {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string
          name: string
          jurisdiction: string
          address: string
          city: string
          state: string
          postal_code: string
          latitude: number
          longitude: number
          schedules: unknown
          description: string | null
          pastors: string[]
          responsible_email: string
          social_media: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          jurisdiction: string
          address: string
          city: string
          state: string
          postal_code: string
          latitude: number
          longitude: number
          schedules?: unknown
          description?: string | null
          pastors?: string[]
          responsible_email: string
          social_media?: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          jurisdiction?: string
          address?: string
          city?: string
          state?: string
          postal_code?: string
          latitude?: number
          longitude?: number
          schedules?: unknown
          description?: string | null
          pastors?: string[]
          responsible_email?: string
          social_media?: unknown
          created_at?: string
          updated_at?: string
        }
      }
      church_submissions: {
        Row: {
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
        Insert: {
          id?: string
          jurisdiction: string
          name: string
          address: string
          schedules?: string | null
          description?: string | null
          pastors?: string | null
          responsible_email: string
          website?: string | null
          instagram?: string | null
          youtube?: string | null
          spotify?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          submitted_at?: string
          reviewed_at?: string | null
          review_notes?: string | null
        }
        Update: {
          id?: string
          jurisdiction?: string
          name?: string
          address?: string
          schedules?: string | null
          description?: string | null
          pastors?: string | null
          responsible_email?: string
          website?: string | null
          instagram?: string | null
          youtube?: string | null
          spotify?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          submitted_at?: string
          reviewed_at?: string | null
          review_notes?: string | null
        }
      }
      bulk_church_submissions: {
        Row: {
          id: string
          bulk_data: string
          status: 'pending' | 'approved' | 'rejected'
          submitted_at: string
          reviewed_at: string | null
          review_notes: string | null
        }
        Insert: {
          id?: string
          bulk_data: string
          status?: 'pending' | 'approved' | 'rejected'
          submitted_at?: string
          reviewed_at?: string | null
          review_notes?: string | null
        }
        Update: {
          id?: string
          bulk_data?: string
          status?: 'pending' | 'approved' | 'rejected'
          submitted_at?: string
          reviewed_at?: string | null
          review_notes?: string | null
        }
      }
    }
  }
}
