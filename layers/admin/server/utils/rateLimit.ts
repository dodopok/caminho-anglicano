import type { H3Event } from 'h3'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store rate limit data in memory
// Key format: "ip:endpoint"
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Get client IP address from event
 */
function getClientIP(event: H3Event): string {
  // Try various headers for IP (considering proxies)
  const headers = getHeaders(event)
  const forwarded = headers['x-forwarded-for']
  const real = headers['x-real-ip']
  const cloudflare = headers['cf-connecting-ip']

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  if (typeof real === 'string') {
    return real
  }
  if (typeof cloudflare === 'string') {
    return cloudflare
  }

  // Fallback
  return 'unknown'
}

/**
 * Rate limiting middleware
 * @param event H3Event
 * @param config Rate limit configuration
 */
export async function rateLimit(
  event: H3Event,
  config: RateLimitConfig,
): Promise<void> {
  const ip = getClientIP(event)
  const endpoint = event.path
  const key = `${ip}:${endpoint}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // First request or expired window - create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: config.message || 'Rate limit exceeded. Please try again later.',
      data: {
        retryAfter,
      },
    })
  }

  // Increment counter
  entry.count++
}

/**
 * Preset rate limit configurations
 */
export const RateLimits = {
  // Very strict - for login/auth endpoints (5 requests per minute)
  AUTH: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: 'Too many login attempts. Please try again later.',
  },

  // Strict - for expensive operations like geocoding (10 requests per minute)
  GEOCODING: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    message: 'Too many geocoding requests. Please try again later.',
  },

  // Moderate - for admin write operations (30 requests per minute)
  ADMIN_WRITE: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    message: 'Too many requests. Please slow down.',
  },

  // Relaxed - for admin read operations (100 requests per minute)
  ADMIN_READ: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },

  // For public submission endpoints (10 requests per 5 minutes)
  PUBLIC_SUBMIT: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
    message: 'Too many submissions. Please try again later.',
  },
}
