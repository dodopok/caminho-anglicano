/**
 * Security headers middleware
 * Adds important security headers to all responses
 */
export default defineEventHandler((event) => {
  const headers = event.node.res

  // Prevent clickjacking attacks
  headers.setHeader('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME type sniffing
  headers.setHeader('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection (for older browsers)
  headers.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  headers.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict features)
  // Allow geolocation for the localizador feature
  headers.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  )

  // Strict Transport Security (HTTPS only)
  // Only enable in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Content Security Policy
  // This is a basic CSP - you may need to adjust based on your needs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://www.google.com https://www.gstatic.com https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ]

  headers.setHeader('Content-Security-Policy', cspDirectives.join('; '))
})
