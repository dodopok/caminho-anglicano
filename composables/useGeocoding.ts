interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
  city: string
  state: string
  postalCode: string
}

interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

interface NominatimResponse {
  lat: string
  lon: string
  display_name: string
  address: {
    city?: string
    town?: string
    municipality?: string
    state?: string
    postcode?: string
  }
}

export function useGeocoding() {
  async function geocodePostalCode(postalCode: string): Promise<GeocodingResult | null> {
    try {
      const cleanCep = postalCode.replace(/\D/g, '')

      const viaCepResponse = await $fetch<ViaCepResponse>(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      )

      if (viaCepResponse.erro) {
        return null
      }

      const fullAddress = `${viaCepResponse.logradouro}, ${viaCepResponse.bairro}, ${viaCepResponse.localidade}, ${viaCepResponse.uf}, Brasil`

      const nominatimResponse = await $fetch<NominatimResponse[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: fullAddress,
            format: 'json',
            limit: 1
          },
          headers: {
            'User-Agent': 'CaminhoAnglicano/1.0'
          }
        }
      )

      if (!nominatimResponse || nominatimResponse.length === 0) {
        return null
      }

      const result = nominatimResponse[0]

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: viaCepResponse.logradouro,
        city: viaCepResponse.localidade,
        state: viaCepResponse.uf,
        postalCode: viaCepResponse.cep
      }
    } catch (error) {
      console.error('Error geocoding postal code:', error)
      return null
    }
  }

  async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const nominatimResponse = await $fetch<NominatimResponse[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: `${address}, Brasil`,
            format: 'json',
            limit: 1
          },
          headers: {
            'User-Agent': 'CaminhoAnglicano/1.0'
          }
        }
      )

      if (!nominatimResponse || nominatimResponse.length === 0) {
        return null
      }

      const result = nominatimResponse[0]

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        city: result.address.city || result.address.town || result.address.municipality || '',
        state: result.address.state || '',
        postalCode: result.address.postcode || ''
      }
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  return {
    geocodePostalCode,
    geocodeAddress
  }
}
