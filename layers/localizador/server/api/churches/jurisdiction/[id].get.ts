import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { mapChurchRows } from '../../utils/mapChurch'

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
    const churches = mapChurchRows(data)

    return churches
  } catch (error) {
    console.error('Error fetching churches by jurisdiction:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igrejas da jurisdição'
    })
  }
})
