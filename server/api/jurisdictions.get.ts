import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import type { JurisdictionRow } from '~/server/types/supabase'

export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()

  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey as string
  )

  try {
    const { data, error } = await supabase
      .from('jurisdictions')
      .select('*')
      .eq('active', true)
      .order('display_order')

    if (error) {
      throw error
    }

    // Mapear para formato do cliente (camelCase)
    return (data || []).map((row: unknown) => {
      const jurisdiction = row as JurisdictionRow
      return {
        id: jurisdiction.id,
        slug: jurisdiction.slug,
        name: jurisdiction.name,
        fullName: jurisdiction.full_name,
        color: jurisdiction.color,
        description: jurisdiction.description,
        website: jurisdiction.website,
        active: jurisdiction.active,
        displayOrder: jurisdiction.display_order,
        createdAt: jurisdiction.created_at,
        updatedAt: jurisdiction.updated_at
      }
    })
  } catch (error) {
    console.error('Error fetching jurisdictions:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar jurisdições'
    })
  }
}, {
  maxAge: 60 * 60, // Cache por 1 hora (jurisdições mudam raramente)
  name: 'jurisdictions'
})
