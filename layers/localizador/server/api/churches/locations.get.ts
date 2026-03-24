import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

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

    // Process unique states and cities
    const states = new Set<string>()
    const cityStateMap = new Map<string, Set<string>>()

    const churchData = (data || []) as Array<{ city: string | null, state: string | null }>

    churchData.forEach(church => {
      if (church.state) {
        const state = church.state.toUpperCase()
        states.add(state)
        
        if (church.city) {
          if (!cityStateMap.has(state)) {
            cityStateMap.set(state, new Set())
          }
          cityStateMap.get(state)!.add(church.city)
        }
      }
    })

    const locations = {
      states: Array.from(states).sort(),
      cities: Array.from(cityStateMap.entries()).map(([state, cities]) => ({
        state,
        cities: Array.from(cities).sort()
      }))
    }

    return locations
  } catch (error) {
    console.error('Error fetching church locations:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar localizações das igrejas'
    })
  }
})
