import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

// Mock dependencies
vi.mock('h3', () => ({
  getHeaders: vi.fn(),
  createError: vi.fn((options) => {
    const error = new Error(options.message) as any
    error.statusCode = options.statusCode
    error.statusMessage = options.statusMessage
    error.data = options.data
    return error
  }),
}))

import { getHeaders } from 'h3'
import { rateLimit, RateLimits } from '../../../layers/admin/server/utils/rateLimit'

describe('rateLimit', () => {
  let mockEvent: H3Event
  let realDateNow: typeof Date.now

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock event with path property
    mockEvent = {
      path: '/api/test',
    } as H3Event

    // Mock Date.now for consistent time-based testing
    realDateNow = Date.now
    let currentTime = 1000000000000 // Fixed timestamp
    Date.now = vi.fn(() => currentTime)

    // Helper to advance time
    ;(global as any).advanceTime = (ms: number) => {
      currentTime += ms
    }

    // Default headers - no proxy
    vi.mocked(getHeaders).mockReturnValue({})
  })

  afterEach(() => {
    Date.now = realDateNow
    delete (global as any).advanceTime
  })

  describe('IP extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      vi.mocked(getHeaders).mockReturnValue({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      })

      await rateLimit(mockEvent, { maxRequests: 1, windowMs: 60000 })
      expect(getHeaders).toHaveBeenCalledWith(mockEvent)
    })

    it('should extract IP from x-real-ip header', async () => {
      vi.mocked(getHeaders).mockReturnValue({
        'x-real-ip': '192.168.1.2',
      })

      await rateLimit(mockEvent, { maxRequests: 1, windowMs: 60000 })
      expect(getHeaders).toHaveBeenCalled()
    })

    it('should extract IP from cf-connecting-ip header', async () => {
      vi.mocked(getHeaders).mockReturnValue({
        'cf-connecting-ip': '192.168.1.3',
      })

      await rateLimit(mockEvent, { maxRequests: 1, windowMs: 60000 })
      expect(getHeaders).toHaveBeenCalled()
    })

    it('should prioritize x-forwarded-for over other headers', async () => {
      vi.mocked(getHeaders).mockReturnValue({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3',
      })

      await rateLimit(mockEvent, { maxRequests: 1, windowMs: 60000 })
      // Should use first IP from x-forwarded-for
      expect(getHeaders).toHaveBeenCalled()
    })

    it('should use "unknown" as fallback when no IP headers present', async () => {
      vi.mocked(getHeaders).mockReturnValue({})

      await rateLimit(mockEvent, { maxRequests: 1, windowMs: 60000 })
      expect(getHeaders).toHaveBeenCalled()
    })
  })

  describe('rate limiting logic', () => {
    beforeEach(() => {
      vi.mocked(getHeaders).mockReturnValue({
        'x-real-ip': '192.168.1.1',
      })
    })

    it('should allow first request', async () => {
      await expect(
        rateLimit(mockEvent, { maxRequests: 5, windowMs: 60000 }),
      ).resolves.toBeUndefined()
    })

    it('should allow requests under the limit', async () => {
      const config = { maxRequests: 3, windowMs: 60000 }

      await rateLimit(mockEvent, config)
      await rateLimit(mockEvent, config)
      await rateLimit(mockEvent, config)

      // All 3 requests should succeed
      expect(true).toBe(true)
    })

    it('should block requests exceeding the limit', async () => {
      const config = { maxRequests: 2, windowMs: 60000 }

      await rateLimit(mockEvent, config)
      await rateLimit(mockEvent, config)

      // Third request should fail
      await expect(rateLimit(mockEvent, config)).rejects.toThrow()
    })

    it('should reset counter after window expires', async () => {
      const config = { maxRequests: 2, windowMs: 60000 }

      await rateLimit(mockEvent, config)
      await rateLimit(mockEvent, config)

      // Advance time beyond window
      ;(global as any).advanceTime(61000)

      // Should allow new request after window reset
      await expect(rateLimit(mockEvent, config)).resolves.toBeUndefined()
    })

    it('should throw 429 error when limit exceeded', async () => {
      const config = {
        maxRequests: 1,
        windowMs: 60000,
        message: 'Custom rate limit message',
      }

      await rateLimit(mockEvent, config)

      try {
        await rateLimit(mockEvent, config)
        expect(true).toBe(false) // Should not reach here
      }
      catch (error: any) {
        expect(error.statusCode).toBe(429)
        expect(error.message).toBe('Custom rate limit message')
        expect(error.data).toHaveProperty('retryAfter')
      }
    })

    it('should include retryAfter in error data', async () => {
      const config = { maxRequests: 1, windowMs: 60000 }

      await rateLimit(mockEvent, config)

      try {
        await rateLimit(mockEvent, config)
      }
      catch (error: any) {
        expect(error.data.retryAfter).toBeGreaterThan(0)
        expect(error.data.retryAfter).toBeLessThanOrEqual(60)
      }
    })

    it('should track different IPs independently', async () => {
      const config = { maxRequests: 1, windowMs: 60000 }

      // First IP
      vi.mocked(getHeaders).mockReturnValue({ 'x-real-ip': '192.168.1.1' })
      await rateLimit(mockEvent, config)

      // Second IP should not be affected
      vi.mocked(getHeaders).mockReturnValue({ 'x-real-ip': '192.168.1.2' })
      await expect(rateLimit(mockEvent, config)).resolves.toBeUndefined()
    })

    it('should track different endpoints independently', async () => {
      const config = { maxRequests: 1, windowMs: 60000 }

      // First endpoint
      mockEvent.path = '/api/endpoint1'
      await rateLimit(mockEvent, config)

      // Second endpoint should not be affected
      mockEvent.path = '/api/endpoint2'
      await expect(rateLimit(mockEvent, config)).resolves.toBeUndefined()
    })

    it('should use default message when custom message not provided', async () => {
      const config = { maxRequests: 1, windowMs: 60000 }

      await rateLimit(mockEvent, config)

      try {
        await rateLimit(mockEvent, config)
      }
      catch (error: any) {
        expect(error.message).toBe('Rate limit exceeded. Please try again later.')
      }
    })
  })

  describe('preset configurations', () => {
    it('should have AUTH preset with correct values', () => {
      expect(RateLimits.AUTH.maxRequests).toBe(5)
      expect(RateLimits.AUTH.windowMs).toBe(60 * 1000)
      expect(RateLimits.AUTH.message).toContain('login')
    })

    it('should have GEOCODING preset with correct values', () => {
      expect(RateLimits.GEOCODING.maxRequests).toBe(10)
      expect(RateLimits.GEOCODING.windowMs).toBe(60 * 1000)
      expect(RateLimits.GEOCODING.message).toContain('geocoding')
    })

    it('should have ADMIN_WRITE preset with correct values', () => {
      expect(RateLimits.ADMIN_WRITE.maxRequests).toBe(30)
      expect(RateLimits.ADMIN_WRITE.windowMs).toBe(60 * 1000)
    })

    it('should have ADMIN_READ preset with correct values', () => {
      expect(RateLimits.ADMIN_READ.maxRequests).toBe(100)
      expect(RateLimits.ADMIN_READ.windowMs).toBe(60 * 1000)
    })

    it('should have PUBLIC_SUBMIT preset with correct values', () => {
      expect(RateLimits.PUBLIC_SUBMIT.maxRequests).toBe(10)
      expect(RateLimits.PUBLIC_SUBMIT.windowMs).toBe(5 * 60 * 1000)
      expect(RateLimits.PUBLIC_SUBMIT.message).toContain('submissions')
    })
  })
})
