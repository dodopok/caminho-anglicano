interface GeoapifyGeocodingResponse {
  error?: string
  message?: string
  results?: Array<{
    lat?: number
    lon?: number
    city?: string
    state?: string
    state_code?: string
    postcode?: string
    formatted?: string
  }>
}

interface GeocodeResult {
  latitude: number
  longitude: number
  city: string
  state: string
  postalCode: string
  formattedAddress: string
}

function redactApiKey(value: string): string {
  return value.replace(/([?&]apiKey=)[^&\s"]+/gi, '$1[REDACTED]')
}

/**
 * Geocode an address using the Geoapify Geocoding API.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const config = useRuntimeConfig()
  const apiKey = typeof config.geoapifyApiKey === 'string' ? config.geoapifyApiKey : ''

  if (!apiKey) {
    throw new Error('Geoapify API key not configured')
  }

  // Clean up the address
  const cleanAddress = address.trim()

  // Restrict results to Brazil because all registered churches are in Brazil.
  const params = new URLSearchParams({
    text: cleanAddress,
    filter: 'countrycode:br',
    lang: 'pt',
    limit: '1',
    format: 'json',
    apiKey,
  })
  const url = `https://api.geoapify.com/v1/geocode/search?${params.toString()}`

  try {
    const response = await $fetch<GeoapifyGeocodingResponse>(url)
    const result = response.results?.[0]

    if (!result || typeof result.lat !== 'number' || typeof result.lon !== 'number') {
      const reason = response.message || response.error || 'No results found'
      throw new Error(`Geoapify geocoding failed: ${reason}`)
    }

    const state = (result.state_code || result.state || '').replace(/^BR-/i, '')

    return {
      latitude: result.lat,
      longitude: result.lon,
      city: result.city || '',
      state,
      postalCode: result.postcode || '',
      formattedAddress: result.formatted || cleanAddress,
    }
  }
  catch (error: unknown) {
    const errorMessage = redactApiKey(error instanceof Error ? error.message : 'Unknown error')
    console.error('Geoapify geocoding error:', errorMessage)
    throw new Error(`Failed to geocode address: ${errorMessage}`)
  }
}

/**
 * Extract city and state from an address string
 * Fallback parser if geocoding fails
 */
export function parseAddress(address: string): { city: string, state: string } {
  // Common pattern: "Street, Number - Neighborhood, City - State, CEP"
  // Try to extract city and state

  let city = ''
  let state = ''

  // Look for state abbreviation (2 uppercase letters)
  const stateMatch = address.match(/\b([A-Z]{2})\b/)
  if (stateMatch) {
    state = stateMatch[1]
  }

  // Try to get city from before the state
  if (state) {
    const beforeState = address.split(state)[0]
    const cityParts = beforeState.split(',')
    if (cityParts.length >= 2) {
      city = cityParts[cityParts.length - 1].trim().replace(/[-–]/, '').trim()
    }
  }

  return { city, state }
}
