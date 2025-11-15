import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { ChurchWithJurisdiction } from '~/server/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Define cache headers baseado nos query params
  // Se não há filtros, permite cache SWR de 60 segundos
  // Se há filtros (jurisdiction ou search), desabilita cache
  const hasFilters = query.jurisdiction || query.search
  if (!hasFilters) {
    setHeader(event, 'Cache-Control', 's-maxage=60, stale-while-revalidate=30')
  } else {
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
  }

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
        jurisdiction: church.jurisdiction ? {
          id: church.jurisdiction.id,
          name: church.jurisdiction.name,
          slug: church.jurisdiction.slug,
          fullName: church.jurisdiction.full_name,
          color: church.jurisdiction.color,
          description: church.jurisdiction.description,
          website: church.jurisdiction.website
        } : undefined,
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
