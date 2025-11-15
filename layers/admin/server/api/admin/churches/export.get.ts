import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

// Type for raw church data from Supabase (with snake_case and joined jurisdiction)
type ChurchRow = Database['public']['Tables']['churches']['Row'] & {
  jurisdiction: {
    name: string
    slug: string
  } | null
}

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Fetch all churches with jurisdiction info
    const { data: churches, error } = await supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(name, slug)
      `)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    if (!churches || churches.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No churches found',
      })
    }

    // Build CSV
    const headers = [
      'Nome',
      'Jurisdição',
      'Endereço',
      'Cidade',
      'Estado',
      'CEP',
      'Latitude',
      'Longitude',
      'Email',
      'Website',
      'Instagram',
      'YouTube',
      'Spotify',
    ]

    const rows = churches.map((church: ChurchRow) => {
      const jurisdiction = church.jurisdiction?.name || church.jurisdiction?.slug || 'N/A'
      const socialMedia = (church.social_media || {}) as Record<string, string | undefined>

      return [
        escapeCSV(church.name),
        escapeCSV(jurisdiction),
        escapeCSV(church.address),
        escapeCSV(church.city),
        escapeCSV(church.state),
        escapeCSV(church.postal_code),
        church.latitude,
        church.longitude,
        escapeCSV(church.responsible_email),
        escapeCSV(socialMedia.website || ''),
        escapeCSV(socialMedia.instagram || ''),
        escapeCSV(socialMedia.youtube || ''),
        escapeCSV(socialMedia.spotify || ''),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    // Set headers for file download
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="igrejas-${new Date().toISOString().split('T')[0]}.csv"`)

    // Add BOM for Excel UTF-8 support
    return '\uFEFF' + csv
  }
  catch (error: unknown) {
    console.error('Error exporting churches:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to export churches',
    })
  }
})

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}
