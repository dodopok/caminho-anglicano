import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock Nuxt utilities
global.defineEventHandler = (handler: any) => handler
global.useRuntimeConfig = vi.fn(() => ({
  public: {
    supabaseUrl: 'https://test.supabase.co',
  },
  supabaseServiceKey: 'test-service-key',
}))
global.getQuery = vi.fn()
global.createError = (error: any) => error

describe('API: GET /api/churches', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup Supabase mock
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    }

    mockSupabase = {
      from: vi.fn(() => mockQueryBuilder),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  it('should fetch all churches without search', async () => {
    const mockChurches = [
      {
        id: '1',
        name: 'Igreja Test 1',
        slug: 'igreja-test-1',
        jurisdiction_id: 'ieab',
        jurisdiction: {
          id: 'ieab',
          name: 'IEAB',
          slug: 'ieab',
          full_name: 'Igreja Episcopal Anglicana do Brasil',
          color: '#8B4513',
        },
        address: 'Rua Test, 123',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '01234-567',
        latitude: '-23.5505',
        longitude: '-46.6333',
        schedules: [{ day: 'Domingo', time: '10h' }],
        description: 'Descrição teste',
        pastors: ['Pe. João'],
        responsible_email: 'test@example.com',
        social_media: { website: 'https://test.com' },
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]

    const mockFrom = mockSupabase.from('churches')
    mockFrom.select().order = vi.fn().mockResolvedValue({
      data: mockChurches,
      error: null,
    })

    global.getQuery = vi.fn(() => ({}))

    const handler = (await import('./churches.get')).default
    const result = await handler({} as any)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Igreja Test 1')
    expect(result[0].latitude).toBe(-23.5505)
  })

  it('should fetch churches with search query', async () => {
    const mockChurches = [
      {
        id: '1',
        name: 'Igreja Anglicana',
        slug: 'igreja-anglicana',
        jurisdiction_id: 'ieab',
        jurisdiction: null,
        address: 'Rua Anglicana, 123',
        city: 'São Paulo',
        state: 'SP',
        postal_code: '01234-567',
        latitude: '-23.5505',
        longitude: '-46.6333',
        schedules: [],
        description: null,
        pastors: [],
        responsible_email: 'test@example.com',
        social_media: {},
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]

    const mockQueryBuilder = mockSupabase.from('churches')
    mockQueryBuilder.select().order().or = vi.fn().mockResolvedValue({
      data: mockChurches,
      error: null,
    })

    global.getQuery = vi.fn(() => ({ search: 'Anglicana' }))

    const handler = (await import('./churches.get')).default
    const result = await handler({} as any)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Igreja Anglicana')
  })

  it('should handle database errors', async () => {
    const mockError = new Error('Database error')

    const mockQueryBuilder = mockSupabase.from('churches')
    mockQueryBuilder.select().order = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    })

    global.getQuery = vi.fn(() => ({}))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const handler = (await import('./churches.get')).default

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Erro ao buscar igrejas',
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching churches:', mockError)
    consoleSpy.mockRestore()
  })

  it('should return empty array when no churches found', async () => {
    const mockQueryBuilder = mockSupabase.from('churches')
    mockQueryBuilder.select().order = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    global.getQuery = vi.fn(() => ({}))

    const handler = (await import('./churches.get')).default
    const result = await handler({} as any)

    expect(result).toEqual([])
  })

  it('should correctly map church data to camelCase', async () => {
    const mockChurch = {
      id: '123',
      name: 'Test Church',
      slug: 'test-church',
      jurisdiction_id: 'ieab',
      jurisdiction: {
        id: 'ieab',
        name: 'IEAB',
        slug: 'ieab',
        full_name: 'Igreja Episcopal Anglicana do Brasil',
        color: '#8B4513',
        description: 'Test jurisdiction',
        website: 'https://ieab.com',
      },
      address: 'Test Address',
      city: 'Test City',
      state: 'TC',
      postal_code: '12345-678',
      latitude: '-23.5505',
      longitude: '-46.6333',
      schedules: [],
      description: 'Test description',
      pastors: [],
      responsible_email: 'test@test.com',
      social_media: {},
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    }

    const mockQueryBuilder = mockSupabase.from('churches')
    mockQueryBuilder.select().order = vi.fn().mockResolvedValue({
      data: [mockChurch],
      error: null,
    })

    global.getQuery = vi.fn(() => ({}))

    const handler = (await import('./churches.get')).default
    const result = await handler({} as any)

    expect(result[0]).toMatchObject({
      id: '123',
      name: 'Test Church',
      jurisdictionId: 'ieab',
      postalCode: '12345-678',
      responsibleEmail: 'test@test.com',
      socialMedia: {},
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    })
  })
})
