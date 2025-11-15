interface GoogleGeocodingResponse {
  status: string
  results?: Array<{
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    formatted_address: string
    address_components: Array<{
      long_name: string
      short_name: string
      types: string[]
    }>
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

/**
 * Geocode an address using Google Maps Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const config = useRuntimeConfig()
  const apiKey = config.public.googleMapsApiKey

  if (!apiKey) {
    throw new Error('Google Maps API key not configured')
  }

  // Clean up the address
  const cleanAddress = address.trim()

  // Call Google Maps Geocoding API
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&region=br&key=${apiKey}`

  try {
    const response = await $fetch<GoogleGeocodingResponse>(url)

    if (response.status !== 'OK' || !response.results || response.results.length === 0) {
      throw new Error(`Geocoding failed: ${response.status || 'No results found'}`)
    }

    const result = response.results[0]
    const location = result.geometry.location

    // Extract address components
    let city = ''
    let state = ''
    let postalCode = ''

    for (const component of result.address_components) {
      const types = component.types

      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name
      }
      else if (types.includes('administrative_area_level_1')) {
        state = component.short_name // Gets "SP" instead of "São Paulo"
      }
      else if (types.includes('postal_code')) {
        postalCode = component.long_name
      }
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      city: city || '',
      state: state || '',
      postalCode: postalCode || '',
      formattedAddress: result.formatted_address,
    }
  }
  catch (error: unknown) {
    console.error('Geocoding error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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
