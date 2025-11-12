import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { ChurchWithJurisdiction } from '~/server/types/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID da igreja é obrigatório'
    })
  }

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
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        message: 'Igreja não encontrada'
      })
    }

    const church = data as unknown as ChurchWithJurisdiction

    return {
      id: church.id,
      name: church.name,
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
  } catch (error) {
    console.error('Error fetching church:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igreja'
    })
  }
})
