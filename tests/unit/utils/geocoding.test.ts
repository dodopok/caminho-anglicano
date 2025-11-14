import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
  $fetch: vi.fn(),
}))

import { geocodeAddress, parseAddress } from '../../../layers/admin/server/utils/geocoding'

describe('geocoding', () => {
  describe('geocodeAddress', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      vi.mocked(useRuntimeConfig).mockReturnValue({
        public: {
          googleMapsApiKey: 'test-api-key',
        },
      } as any)
    })

    it('should geocode valid address successfully', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: {
                lat: -23.5505,
                lng: -46.6333,
              },
            },
            formatted_address: 'Rua Example, 123, São Paulo - SP, 01000-000, Brasil',
            address_components: [
              {
                long_name: 'São Paulo',
                short_name: 'São Paulo',
                types: ['locality'],
              },
              {
                long_name: 'SP',
                short_name: 'SP',
                types: ['administrative_area_level_1'],
              },
              {
                long_name: '01000-000',
                short_name: '01000-000',
                types: ['postal_code'],
              },
            ],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      const result = await geocodeAddress('Rua Example, 123, São Paulo - SP')

      expect(result.latitude).toBe(-23.5505)
      expect(result.longitude).toBe(-46.6333)
      expect(result.city).toBe('São Paulo')
      expect(result.state).toBe('SP')
      expect(result.postalCode).toBe('01000-000')
      expect(result.formattedAddress).toBe('Rua Example, 123, São Paulo - SP, 01000-000, Brasil')
    })

    it('should throw error when API key is not configured', async () => {
      vi.mocked(useRuntimeConfig).mockReturnValue({
        public: {
          googleMapsApiKey: undefined,
        },
      } as any)

      await expect(geocodeAddress('Test Address')).rejects.toThrow('Google Maps API key not configured')
    })

    it('should throw error when geocoding returns no results', async () => {
      vi.mocked($fetch).mockResolvedValue({
        status: 'ZERO_RESULTS',
        results: [],
      })

      await expect(geocodeAddress('Invalid Address')).rejects.toThrow('Geocoding failed')
    })

    it('should throw error when geocoding status is not OK', async () => {
      vi.mocked($fetch).mockResolvedValue({
        status: 'REQUEST_DENIED',
        results: [],
      })

      await expect(geocodeAddress('Test Address')).rejects.toThrow('Geocoding failed: REQUEST_DENIED')
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked($fetch).mockRejectedValue(new Error('Network error'))

      await expect(geocodeAddress('Test Address')).rejects.toThrow('Failed to geocode address')
    })

    it('should trim whitespace from address', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      await geocodeAddress('  Test Address  ')

      expect($fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('Test Address')),
      )
    })

    it('should include region=br parameter in API call', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      await geocodeAddress('Test Address')

      expect($fetch).toHaveBeenCalledWith(
        expect.stringContaining('region=br'),
      )
    })

    it('should handle address with administrative_area_level_2 as city', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [
              {
                long_name: 'Rio de Janeiro',
                short_name: 'Rio de Janeiro',
                types: ['administrative_area_level_2'],
              },
              {
                long_name: 'RJ',
                short_name: 'RJ',
                types: ['administrative_area_level_1'],
              },
            ],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      const result = await geocodeAddress('Test Address')

      expect(result.city).toBe('Rio de Janeiro')
      expect(result.state).toBe('RJ')
    })

    it('should return empty strings for missing address components', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [], // No components
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      const result = await geocodeAddress('Test Address')

      expect(result.city).toBe('')
      expect(result.state).toBe('')
      expect(result.postalCode).toBe('')
    })

    it('should use short_name for state (abbreviation)', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [
              {
                long_name: 'São Paulo',
                short_name: 'SP',
                types: ['administrative_area_level_1'],
              },
            ],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      const result = await geocodeAddress('Test Address')

      expect(result.state).toBe('SP') // Should use short_name, not long_name
    })

    it('should encode special characters in address', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: -23.5505, lng: -46.6333 },
            },
            formatted_address: 'Test Address',
            address_components: [],
          },
        ],
      }

      vi.mocked($fetch).mockResolvedValue(mockResponse)

      await geocodeAddress('Rua São João, 123 - Centro')

      expect($fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('Rua São João, 123 - Centro')),
      )
    })
  })

  describe('parseAddress', () => {
    it('should parse address with standard format', () => {
      const address = 'Rua Example, 123 - Centro, São Paulo - SP, 01000-000'
      const result = parseAddress(address)

      expect(result.state).toBe('SP')
      expect(result.city).toBe('São Paulo')
    })

    it('should extract state abbreviation', () => {
      const address = 'Rua Test, Rio de Janeiro - RJ'
      const result = parseAddress(address)

      expect(result.state).toBe('RJ')
    })

    it('should extract city from before state', () => {
      const address = 'Street, Number, Belo Horizonte - MG, 30000-000'
      const result = parseAddress(address)

      expect(result.city).toBe('Belo Horizonte')
      expect(result.state).toBe('MG')
    })

    it('should return empty strings when state not found', () => {
      const address = 'Just a street name'
      const result = parseAddress(address)

      expect(result.state).toBe('')
      expect(result.city).toBe('')
    })

    it('should handle address with single comma', () => {
      const address = 'Rua Example, SP'
      const result = parseAddress(address)

      expect(result.state).toBe('SP')
    })

    it('should trim whitespace from extracted values', () => {
      const address = 'Street,   São Paulo   - SP'
      const result = parseAddress(address)

      expect(result.city).toBe('São Paulo')
      expect(result.state).toBe('SP')
    })

    it('should handle address with em-dash separator', () => {
      const address = 'Rua Test, Curitiba – PR'
      const result = parseAddress(address)

      expect(result.city).toBe('Curitiba')
      expect(result.state).toBe('PR')
    })

    it('should match only 2-letter uppercase state codes', () => {
      const address = 'Rua ABC, São Paulo - SP, Brazil'
      const result = parseAddress(address)

      // Should match SP, not ABC
      expect(result.state).toBe('SP')
    })
  })
})
