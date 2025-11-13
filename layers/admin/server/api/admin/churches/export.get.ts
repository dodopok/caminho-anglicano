import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
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

    const rows = churches.map((church: any) => {
      const jurisdiction = church.jurisdiction?.name || church.jurisdiction?.slug || 'N/A'
      const socialMedia = church.social_media || {}

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
  catch (error: any) {
    console.error('Error exporting churches:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to export churches',
    })
  }
})

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCSV(value: any): string {
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
