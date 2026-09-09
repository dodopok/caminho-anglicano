import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { mapChurchRows } from '../../../utils/mapChurch'
import { isValidStateCode, normalizeStateCode } from '../../../../utils/states'

/**
 * Igrejas de uma UF.
 *
 * Rota baseada em path (e não em query string) de propósito: rotas com cache
 * de borda são chaveadas pelo caminho, então filtrar por query em uma rota
 * cacheada faz todas as variações compartilharem a mesma resposta.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const state = normalizeStateCode(getRouterParam(event, 'state'))

  if (!isValidStateCode(state)) {
    throw createError({
      statusCode: 404,
      message: `Estado inválido: ${state || 'não informado'}`
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
      .eq('state', state)
      .order('city')
      .order('name')

    if (error) {
      throw error
    }

    return mapChurchRows(data)
  } catch (error) {
    console.error(`Error fetching churches for state ${state}:`, error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar igrejas do estado'
    })
  }
})
