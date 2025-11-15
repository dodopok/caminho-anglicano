/**
 * Security utilities for data sanitization
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return ''

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize object recursively
 * Applies sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    const value = sanitized[key]

    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value) as T[Extract<keyof T, string>]
    }
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<keyof T, string>]
    }
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeHTML(item) : item,
      ) as T[Extract<keyof T, string>]
    }
  }

  return sanitized
}

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose detailed error messages in production
    if (process.env.NODE_ENV === 'production') {
      return 'An error occurred while processing your request'
    }
    // In development, we can show more details (but still sanitized)
    return sanitizeHTML(error.message)
  }
  return 'An unexpected error occurred'
}

/**
 * Sanitize log data to prevent sensitive information exposure
 * Removes common sensitive fields before logging
 */
export function sanitizeForLog(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = [
    'password',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'api_key',
    'apiKey',
    'secret',
    'supabaseServiceKey',
    'googleMapsApiKey',
  ]

  const dataObj = data as Record<string, unknown>
  const sanitized = Array.isArray(dataObj) ? [...dataObj] : { ...dataObj }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()

    // Remove sensitive fields
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    }
    // Recursively sanitize nested objects
    else if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLog(sanitized[key])
    }
  }

  return sanitized
}
