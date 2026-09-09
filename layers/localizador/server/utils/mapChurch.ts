import type { ChurchWithJurisdiction } from '~/server/types/supabase'

/**
 * Converte uma linha do Supabase (snake_case) para o formato de Church
 * usado no client (camelCase). Compartilhado por todos os endpoints de igrejas
 * para que a resposta seja idêntica em qualquer rota.
 */
export function mapChurchRow(row: unknown) {
  const church = row as ChurchWithJurisdiction

  return {
    id: church.id,
    name: church.name,
    slug: church.slug,
    jurisdictionId: church.jurisdiction_id,
    jurisdiction: church.jurisdiction
      ? {
          id: church.jurisdiction.id,
          name: church.jurisdiction.name,
          slug: church.jurisdiction.slug,
          fullName: church.jurisdiction.full_name,
          color: church.jurisdiction.color,
          description: church.jurisdiction.description,
          website: church.jurisdiction.website
        }
      : undefined,
    address: church.address,
    city: church.city,
    state: church.state,
    postalCode: church.postal_code,
    latitude: parseFloat(church.latitude),
    longitude: parseFloat(church.longitude),
    schedules: church.schedules || [],
    description: church.description,
    pastors: church.pastors || [],
    responsibleEmail: church.responsible_email,
    socialMedia: church.social_media || {},
    createdAt: church.created_at,
    updatedAt: church.updated_at
  }
}

export function mapChurchRows(rows: unknown[] | null) {
  return (rows || []).map(mapChurchRow)
}
