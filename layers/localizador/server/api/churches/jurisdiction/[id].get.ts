import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { ChurchWithJurisdiction } from '~/server/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jurisdictionId = getRouterParam(event, 'id')

  if (!jurisdictionId) {
    throw createError({
      statusCode: 400,
      message: 'ID da jurisdição é obrigatório'
    })
  }

  // Criar cliente Supabase no servidor
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey as string // Usa service key no servidor (mais seguro)
  )

  try {
    // Buscar igrejas da jurisdição
    const { data, error } = await supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(*)
      `)
      .eq('jurisdiction_id', jurisdictionId)
      .order('name')

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
    console.error('Error fetching churches by jurisdiction:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igrejas da jurisdição'
    })
  }
})
