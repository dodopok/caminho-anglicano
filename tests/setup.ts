import { vi } from 'vitest'

// Mock environment variables
process.env.NUXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-maps-key'

// Mock global objects
global.console = {
  ...console,
  // Suppress console.error in tests unless needed
  error: vi.fn(),
  warn: vi.fn(),
}

// Mock fetch globally for tests
global.fetch = vi.fn()
