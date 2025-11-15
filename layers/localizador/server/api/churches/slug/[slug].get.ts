import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { ChurchWithJurisdiction } from '~/server/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug é obrigatório'
    })
  }

  // Criar cliente Supabase no servidor
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey as string
  )

  try {
    const { data, error } = await supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(*)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          message: 'Igreja não encontrada'
        })
      }
      throw error
    }

    // Mapear dados para formato consistente
    const church = data as ChurchWithJurisdiction
    return {
      id: church.id,
      name: church.name,
      slug: church.slug,
      jurisdictionId: church.jurisdiction_id,
      jurisdiction: church.jurisdiction ? {
        id: church.jurisdiction.id,
        slug: church.jurisdiction.slug,
        name: church.jurisdiction.name,
        fullName: church.jurisdiction.full_name,
        color: church.jurisdiction.color,
        description: church.jurisdiction.description,
        website: church.jurisdiction.website,
        active: church.jurisdiction.active,
        displayOrder: church.jurisdiction.display_order,
        createdAt: church.jurisdiction.created_at,
        updatedAt: church.jurisdiction.updated_at
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
  } catch (error) {
    console.error('Error fetching church by slug:', error)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igreja'
    })
  }
})
