import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { slugify } from '../../../utils/slug'
import { getStateName, getStateRegion, isValidStateCode, normalizeStateCode } from '../../../utils/states'

/**
 * Diretório de localidades: estados e cidades que realmente possuem igrejas
 * cadastradas, com contagens. Alimenta a navegação por localidade em /igrejas.
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey as string
  )

  try {
    const { data, error } = await supabase
      .from('churches')
      .select('city, state')

    if (error) {
      throw error
    }

    const rows = (data || []) as Array<{ city: string | null, state: string | null }>

    // Agrupa cidades por UF, contando igrejas em cada nível
    const byState = new Map<string, { count: number, cities: Map<string, number> }>()

    for (const row of rows) {
      const code = normalizeStateCode(row.state)
      if (!isValidStateCode(code)) continue

      if (!byState.has(code)) {
        byState.set(code, { count: 0, cities: new Map() })
      }
      const entry = byState.get(code)!
      entry.count++

      const city = row.city?.trim()
      if (city) {
        entry.cities.set(city, (entry.cities.get(city) || 0) + 1)
      }
    }

    const states = [...byState.entries()]
      .map(([code, entry]) => ({
        code,
        name: getStateName(code),
        region: getStateRegion(code),
        count: entry.count,
        cities: [...entry.cities.entries()]
          .map(([name, count]) => ({ name, slug: slugify(name), count }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    return {
      states,
      totalStates: states.length,
      totalCities: states.reduce((sum, state) => sum + state.cities.length, 0),
      totalChurches: states.reduce((sum, state) => sum + state.count, 0)
    }
  } catch (error) {
    console.error('Error fetching church locations:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar localizações das igrejas'
    })
  }
})
