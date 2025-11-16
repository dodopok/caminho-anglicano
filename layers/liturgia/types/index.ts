// ============================================================================
// LITURGY TYPES
// ============================================================================

export interface LiturgyPerson {
  id: string
  name: string
  email?: string
  phone?: string
  whatsapp?: string
  is_ordained: boolean
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface LiturgyMinistry {
  id: string
  name: string
  slug: string
  requires_ordained: boolean
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LiturgyServiceType {
  id: string
  name: string
  slug: string
  description?: string
  default_template?: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LiturgyReadings {
  old_testament?: string
  psalm: string
  epistle?: string
  gospel: string
}

export interface LiturgyService {
  id: string
  service_type_id: string
  service_date: string
  service_time?: string

  // Informações litúrgicas
  liturgical_season?: string
  liturgical_week?: string
  liturgical_color?: string

  // Leituras
  readings?: LiturgyReadings
  collect_text?: string

  // Músicas e avisos
  songs?: string[]
  notices?: string[]

  // Metadata
  notes?: string
  status: 'draft' | 'scheduled' | 'completed'
  is_published: boolean
  created_by?: string
  created_at: string
  updated_at: string

  // Relations (quando expandido)
  service_type?: LiturgyServiceType
  schedules?: LiturgySchedule[]
}

export interface LiturgySchedule {
  id: string
  service_id: string
  ministry_id: string
  person_id: string

  // Confirmação
  confirmed: boolean
  confirmed_at?: string
  confirmation_method?: 'site' | 'whatsapp' | 'phone' | 'in_person'

  // Substituição
  is_substitute: boolean
  replaced_person_id?: string

  // Notificação
  notified: boolean
  notified_at?: string

  notes?: string
  created_at: string
  updated_at: string

  // Relations (quando expandido)
  ministry?: LiturgyMinistry
  person?: LiturgyPerson
  service?: LiturgyService
  replaced_person?: LiturgyPerson
}

export interface LiturgyText {
  id: string
  category: 'confession' | 'absolution' | 'eucharistic_prayer' | 'preface' | 'creed' | 'blessing' | 'dismissal' | 'other'
  name: string
  slug: string
  content: string
  liturgical_season?: string
  is_default: boolean
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LiturgyNotice {
  id: string
  title: string
  content: string
  is_recurring: boolean
  recurrence_rule?: string
  start_date?: string
  end_date?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LiturgyReading {
  id: string
  liturgical_year: 'A' | 'B' | 'C'
  liturgical_date: string
  date_reference?: string
  old_testament?: string
  psalm: string
  epistle?: string
  gospel: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface LiturgyCollect {
  id: string
  liturgical_date: string
  content: string
  source?: string
  created_at: string
  updated_at: string
}

export interface LiturgyPermission {
  id: string
  person_id: string
  role: 'admin' | 'editor' | 'viewer'
  can_create_services: boolean
  can_edit_services: boolean
  can_delete_services: boolean
  can_manage_people: boolean
  can_manage_texts: boolean
  can_send_notifications: boolean
  created_at: string
  updated_at: string

  // Relations
  person?: LiturgyPerson
}

// ============================================================================
// FRONTEND TYPES
// ============================================================================

export interface MonthCalendarDay {
  date: Date
  dateString: string
  isCurrentMonth: boolean
  isToday: boolean
  service?: LiturgyService
}

export interface PersonScheduleView {
  person: LiturgyPerson
  schedules: Array<{
    service: LiturgyService
    ministries: LiturgyMinistry[]
  }>
}

export interface ServiceFormData {
  service_type_id: string
  service_date: string
  service_time?: string
  liturgical_season?: string
  liturgical_week?: string
  liturgical_color?: string
  readings?: LiturgyReadings
  collect_text?: string
  songs?: string[]
  notices?: string[]
  notes?: string
  schedules: Array<{
    ministry_id: string
    person_id: string
  }>
}

export interface GeneratedDocument {
  format: 'docx' | 'pdf'
  url: string
  filename: string
}

// ============================================================================
// LITURGICAL CALENDAR UTILITIES
// ============================================================================

export type LiturgicalSeason =
  | 'Advento'
  | 'Natal'
  | 'Epifania'
  | 'Tempo Comum'
  | 'Quaresma'
  | 'Semana Santa'
  | 'Páscoa'
  | 'Pentecostes'

export type LiturgicalColor =
  | 'Roxo'
  | 'Branco'
  | 'Verde'
  | 'Vermelho'
  | 'Preto'

export interface LiturgicalDate {
  season: LiturgicalSeason
  week: string
  color: LiturgicalColor
  year: 'A' | 'B' | 'C'
}
