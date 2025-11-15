import { z } from 'zod'
import { requireAdmin } from '~/layers/admin/server/utils/adminAuth'
import { PlaceSearchSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

interface PlaceResult {
  name: string
  jurisdiction?: string
  address: string
  responsible_email?: string
  schedules?: string
  pastors?: string
  description?: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  // Apply rate limiting (Google API calls are expensive)
  await rateLimit(event, RateLimits.GEOCODING)

  const body = await readBody(event)

  // Validate input
  let validatedData: z.infer<typeof PlaceSearchSchema>
  try {
    validatedData = PlaceSearchSchema.parse(body)
  }
  catch (error: unknown) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input data',
      data: error instanceof z.ZodError ? error.issues : undefined,
    })
  }

  const { query } = validatedData

  const config = useRuntimeConfig()
  const apiKey = config.googleMapsApiKey || config.public.googleMapsApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'Google Maps API key not configured',
    })
  }

  try {
    // Search for the place using Text Search (with language parameter)
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${apiKey}`
    const searchResponse = await $fetch<{ status: string; results: { place_id: string }[] }>(searchUrl)

    if (searchResponse.status !== 'OK' || !searchResponse.results || searchResponse.results.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'Nenhum lugar encontrado com esse nome',
      })
    }

    const place = searchResponse.results[0]
    const placeId = place.place_id

    // Get detailed information using Place Details (with language parameter)
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,website,editorial_summary,address_components&language=pt-BR&key=${apiKey}`
    const detailsResponse = await $fetch<{ status: string; result: Record<string, unknown> }>(detailsUrl)

    if (detailsResponse.status !== 'OK' || !detailsResponse.result) {
      throw createError({
        statusCode: 404,
        message: 'Não foi possível obter os detalhes do lugar',
      })
    }

    const details = detailsResponse.result as Record<string, unknown>

    // Extract postal code from address_components
    let postalCode = ''
    if (details.address_components) {
      const postalComponent = (details.address_components as { long_name: string; types: string[] }[]).find((component) => 
        component.types.includes('postal_code')
      )
      if (postalComponent) {
        postalCode = postalComponent.long_name
      }
    }

    // Build the result object with all fields (empty ones for manual filling)
    const result: PlaceResult = {
      name: (details.name as string) || query,
      jurisdiction: '',
      address: (details.formatted_address as string) || '',
      responsible_email: '',
      schedules: '',
      pastors: '',
      description: '',
      website: '',
      instagram: '',
      youtube: '',
      spotify: '',
    }

    // Add postal code to address if found
    if (postalCode && !result.address.includes(postalCode)) {
      result.address = `${result.address}, CEP: ${postalCode}`
    }

    // Parse opening hours
    if (details.opening_hours && typeof details.opening_hours === 'object' && details.opening_hours !== null) {
      const openingHours = details.opening_hours as Record<string, unknown>
      if ('weekday_text' in openingHours && Array.isArray(openingHours.weekday_text)) {
        // Filter out closed days and clean up the text
        const openDays = (openingHours.weekday_text as string[])
          .filter((day: string) => !day.toLowerCase().includes('fechado') && !day.toLowerCase().includes('closed'))
          .map((day: string) => {
            // Remove "Aberto 24 horas" redundancy if needed
            return day.trim()
          })
        
        if (openDays.length > 0) {
          result.schedules = openDays.join(', ')
        }
      }
    }

    // Add description
    if (details.editorial_summary && typeof details.editorial_summary === 'object' && details.editorial_summary !== null) {
      const editorialSummary = details.editorial_summary as Record<string, unknown>
      if ('overview' in editorialSummary && typeof editorialSummary.overview === 'string') {
        result.description = editorialSummary.overview
      }
    }

    // Add website
    if (details.website) {
      result.website = details.website as string
      
      // Try to extract social media from website
      const websiteUrl = (details.website as string).toLowerCase()
      if (websiteUrl.includes('instagram.com')) {
        result.instagram = details.website as string
      }
    }

    return result
  }
  catch (error: unknown) {
    console.error('Error searching place:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Erro ao buscar informações no Google',
    })
  }
})
