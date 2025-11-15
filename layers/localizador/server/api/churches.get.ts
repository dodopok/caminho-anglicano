import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { ChurchWithJurisdiction } from '~/server/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Criar cliente Supabase no servidor
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey as string // Usa service key no servidor (mais seguro)
  )

  try {
    // Construir query
    let queryBuilder = supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(*)
      `)
      .order('name')

    // Aplicar filtros se fornecidos
    if (query.jurisdiction) {
      queryBuilder = queryBuilder.eq('jurisdiction_id', query.jurisdiction as string)
    }

    if (query.search) {
      const searchTerm = query.search as string
      queryBuilder = queryBuilder.or(
        `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`
      )
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw error
    }

    // Mapear dados para formato consistente
    const churches = (data || []).map((row: unknown) => {
      const church = row as ChurchWithJurisdiction
      return {
        id: church.id,
        name: church.name,
        slug: church.slug,
        jurisdictionId: church.jurisdiction_id,
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
    })

    return churches
  } catch (error) {
    console.error('Error fetching churches:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igrejas'
    })
  }
})
