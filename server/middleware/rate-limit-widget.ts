/**
 * Rate limiting middleware for widget routes
 * Prevents abuse of the embeddable widget feature
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limit store
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute per IP

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''

  // Only apply rate limiting to widget routes
  if (!url.startsWith('/widget/')) {
    return
  }

  // Get client IP address
  const forwarded = event.node.req.headers['x-forwarded-for']
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : event.node.req.socket.remoteAddress || 'unknown'

  const now = Date.now()
  const key = `widget:${ip}`

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  // Check if window has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    }
    rateLimitStore.set(key, entry)
  } else {
    entry.count++
  }

  // Set rate limit headers
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
  const resetTime = Math.ceil(entry.resetTime / 1000)

  event.node.res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS))
  event.node.res.setHeader('X-RateLimit-Remaining', String(remaining))
  event.node.res.setHeader('X-RateLimit-Reset', String(resetTime))

  // Check if rate limit exceeded
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    event.node.res.statusCode = 429
    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.setHeader('Retry-After', String(Math.ceil((entry.resetTime - now) / 1000)))
    event.node.res.end(JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }))
    return
  }
})
