import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress } from './geocoding'

const fetchMock = vi.fn()

describe('Geoapify geocoding', () => {
  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      geoapifyApiKey: 'test-geoapify-key',
    }))
    vi.stubGlobal('$fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('requests a Brazilian address and maps the Geoapify response', async () => {
    fetchMock.mockResolvedValue({
      results: [{
        lat: -22.9068,
        lon: -43.1729,
        city: 'Rio de Janeiro',
        state_code: 'BR-RJ',
        postcode: '20000-000',
        formatted: 'Rua Exemplo, Rio de Janeiro, RJ, Brasil',
      }],
    })

    const result = await geocodeAddress(' Rua Exemplo, Rio de Janeiro ')
    const [requestUrl] = fetchMock.mock.calls[0] as [string]
    const url = new URL(requestUrl)

    expect(url.origin).toBe('https://api.geoapify.com')
    expect(url.pathname).toBe('/v1/geocode/search')
    expect(url.searchParams.get('text')).toBe('Rua Exemplo, Rio de Janeiro')
    expect(url.searchParams.get('filter')).toBe('countrycode:br')
    expect(url.searchParams.get('apiKey')).toBe('test-geoapify-key')
    expect(result).toEqual({
      latitude: -22.9068,
      longitude: -43.1729,
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '20000-000',
      formattedAddress: 'Rua Exemplo, Rio de Janeiro, RJ, Brasil',
    })
  })

  it('fails clearly when the server key is missing', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({}))

    await expect(geocodeAddress('Rua Exemplo, Rio de Janeiro'))
      .rejects.toThrow('Geoapify API key not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a useful error when Geoapify returns no result', async () => {
    fetchMock.mockResolvedValue({
      results: [],
      message: 'No matching address',
    })

    await expect(geocodeAddress('Endereço inexistente'))
      .rejects.toThrow('Failed to geocode address: Geoapify geocoding failed: No matching address')
  })
})
