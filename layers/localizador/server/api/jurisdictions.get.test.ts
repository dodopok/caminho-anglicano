import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock Nuxt utilities
global.defineEventHandler = <T>(handler: T) => handler
global.defineCachedEventHandler = <T>(handler: T) => handler
global.useRuntimeConfig = vi.fn(() => ({
  public: {
    supabaseUrl: 'https://test.supabase.co',
  },
  supabaseServiceKey: 'test-service-key',
}))
global.createError = (error: { statusCode: number; message: string }) => error

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
}

interface MockSupabase {
  from: ReturnType<typeof vi.fn>
}

describe('API: GET /api/jurisdictions', () => {
  let mockSupabase: MockSupabase

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup Supabase mock
    const mockQueryBuilder: MockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    }

    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)
  })

  it('should fetch all active jurisdictions ordered by display_order', async () => {
    const mockJurisdictions = [
      {
        id: 'ieab',
        slug: 'ieab',
        name: 'IEAB',
        full_name: 'Igreja Episcopal Anglicana do Brasil',
        color: '#8B4513',
        description: 'Descrição IEAB',
        website: 'https://ieab.org.br',
        active: true,
        display_order: 1,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: 'reb',
        slug: 'reb',
        name: 'REB',
        full_name: 'Rede Anglicana Episcopal do Brasil',
        color: '#4169E1',
        description: 'Descrição REB',
        website: 'https://reb.org.br',
        active: true,
        display_order: 2,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]

    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    mockQueryBuilder.select().eq().order = vi.fn().mockResolvedValue({
      data: mockJurisdictions,
      error: null,
    })

    const handler = (await import('./jurisdictions.get')).default
    const result = await handler()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('IEAB')
    expect(result[1].name).toBe('REB')
  })

  it('should return empty array when no jurisdictions found', async () => {
    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    mockQueryBuilder.select().eq().order = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    const handler = (await import('./jurisdictions.get')).default
    const result = await handler()

    expect(result).toEqual([])
  })

  it('should correctly map jurisdiction data to camelCase', async () => {
    const mockJurisdiction = {
      id: 'test-id',
      slug: 'test-slug',
      name: 'Test Jurisdiction',
      full_name: 'Full Test Jurisdiction Name',
      color: '#FF0000',
      description: 'Test description',
      website: 'https://test.com',
      active: true,
      display_order: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }

    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    mockQueryBuilder.select().eq().order = vi.fn().mockResolvedValue({
      data: [mockJurisdiction],
      error: null,
    })

    const handler = (await import('./jurisdictions.get')).default
    const result = await handler()

    expect(result[0]).toMatchObject({
      id: 'test-id',
      slug: 'test-slug',
      name: 'Test Jurisdiction',
      fullName: 'Full Test Jurisdiction Name',
      color: '#FF0000',
      description: 'Test description',
      website: 'https://test.com',
      active: true,
      displayOrder: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    })
  })

  it('should handle database errors', async () => {
    const mockError = new Error('Database connection failed')

    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    mockQueryBuilder.select().eq().order = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const handler = (await import('./jurisdictions.get')).default

    await expect(handler()).rejects.toMatchObject({
      statusCode: 500,
      message: 'Erro ao buscar jurisdições',
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching jurisdictions:', mockError)
    consoleSpy.mockRestore()
  })

  it('should filter only active jurisdictions', async () => {
    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    const eqMock = vi.fn().mockReturnThis()
    mockQueryBuilder.select().eq = eqMock
    eqMock.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const handler = (await import('./jurisdictions.get')).default
    await handler()

    expect(eqMock).toHaveBeenCalledWith('active', true)
  })

  it('should handle null values gracefully', async () => {
    const mockJurisdiction = {
      id: 'test',
      slug: 'test',
      name: 'Test',
      full_name: null,
      color: null,
      description: null,
      website: null,
      active: true,
      display_order: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    const mockQueryBuilder = mockSupabase.from('jurisdictions')
    mockQueryBuilder.select().eq().order = vi.fn().mockResolvedValue({
      data: [mockJurisdiction],
      error: null,
    })

    const handler = (await import('./jurisdictions.get')).default
    const result = await handler()

    expect(result[0].fullName).toBeNull()
    expect(result[0].color).toBeNull()
    expect(result[0].description).toBeNull()
    expect(result[0].website).toBeNull()
  })
})
