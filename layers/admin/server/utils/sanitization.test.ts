import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sanitizeHTML,
  sanitizeObject,
  sanitizeError,
  sanitizeForLog,
} from './sanitization'

describe('sanitization utils', () => {
  describe('sanitizeHTML', () => {
    it('should escape HTML tags', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should escape dangerous characters', () => {
      expect(sanitizeHTML('<div>"test"</div>'))
        .toBe('&lt;div&gt;&quot;test&quot;&lt;&#x2F;div&gt;')
      expect(sanitizeHTML("'test'"))
        .toBe('&#x27;test&#x27;')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeHTML(null)).toBe('')
      expect(sanitizeHTML(undefined)).toBe('')
    })

    it('should handle empty strings', () => {
      expect(sanitizeHTML('')).toBe('')
    })

    it('should escape all special characters', () => {
      const input = '<>"\'/'
      const expected = '&lt;&gt;&quot;&#x27;&#x2F;'
      expect(sanitizeHTML(input)).toBe(expected)
    })

    it('should preserve regular text', () => {
      expect(sanitizeHTML('Hello World')).toBe('Hello World')
      expect(sanitizeHTML('Test 123')).toBe('Test 123')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        description: 'Normal text',
      }

      const result = sanitizeObject(input)
      expect(result.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
      expect(result.description).toBe('Normal text')
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>Test</b>',
          email: 'test@example.com',
        },
      }

      const result = sanitizeObject(input)
      expect(result.user.name).toBe('&lt;b&gt;Test&lt;&#x2F;b&gt;')
      expect(result.user.email).toBe('test@example.com')
    })

    it('should handle arrays of strings', () => {
      const input = {
        tags: ['<script>', 'normal', '<div>'],
      }

      const result = sanitizeObject(input)
      expect(result.tags[0]).toBe('&lt;script&gt;')
      expect(result.tags[1]).toBe('normal')
      expect(result.tags[2]).toBe('&lt;div&gt;')
    })

    it('should preserve non-string values', () => {
      const input = {
        name: 'test',
        count: 42,
        active: true,
        data: null,
      }

      const result = sanitizeObject(input)
      expect(result.count).toBe(42)
      expect(result.active).toBe(true)
      expect(result.data).toBe(null)
    })

    it('should not modify original object', () => {
      const input = {
        name: '<script>test</script>',
      }

      const result = sanitizeObject(input)
      expect(input.name).toBe('<script>test</script>')
      expect(result.name).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;')
    })
  })

  describe('sanitizeError', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should return generic message in production', () => {
      process.env.NODE_ENV = 'production'
      const error = new Error('Detailed error message')
      expect(sanitizeError(error)).toBe('An error occurred while processing your request')
    })

    it('should return sanitized message in development', () => {
      process.env.NODE_ENV = 'development'
      const error = new Error('<script>alert("error")</script>')
      expect(sanitizeError(error)).toBe('&lt;script&gt;alert(&quot;error&quot;)&lt;&#x2F;script&gt;')
    })

    it('should handle non-Error objects', () => {
      expect(sanitizeError('string error')).toBe('An unexpected error occurred')
      expect(sanitizeError(null)).toBe('An unexpected error occurred')
      expect(sanitizeError(undefined)).toBe('An unexpected error occurred')
      expect(sanitizeError(123)).toBe('An unexpected error occurred')
    })

    it('should handle Error with safe message in development', () => {
      process.env.NODE_ENV = 'development'
      const error = new Error('Simple error message')
      expect(sanitizeError(error)).toBe('Simple error message')
    })
  })

  describe('sanitizeForLog', () => {
    it('should redact sensitive fields', () => {
      const input = {
        name: 'Test User',
        password: 'secret123',
        token: 'abc123',
        api_key: 'key123',
      }

      const result = sanitizeForLog(input)
      expect(result.name).toBe('Test User')
      expect(result.password).toBe('[REDACTED]')
      expect(result.token).toBe('[REDACTED]')
      expect(result.api_key).toBe('[REDACTED]')
    })

    it('should handle nested objects with sensitive data', () => {
      const input = {
        user: {
          name: 'Test',
          password: 'secret',
        },
        config: {
          apiKey: 'key123',
        },
      }

      const result = sanitizeForLog(input)
      expect(result.user.name).toBe('Test')
      expect(result.user.password).toBe('[REDACTED]')
      expect(result.config.apiKey).toBe('[REDACTED]')
    })

    it('should redact all variations of sensitive fields', () => {
      const input = {
        PASSWORD: 'secret',
        Access_Token: 'token123',
        GoogleMapsApiKey: 'key123',
        supabaseServiceKey: 'service123',
      }

      const result = sanitizeForLog(input)
      expect(result.PASSWORD).toBe('[REDACTED]')
      expect(result.Access_Token).toBe('[REDACTED]')
      expect(result.GoogleMapsApiKey).toBe('[REDACTED]')
      expect(result.supabaseServiceKey).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const input = [
        { name: 'User 1', password: 'secret1' },
        { name: 'User 2', token: 'token2' },
      ]

      const result = sanitizeForLog(input)
      expect(result[0].name).toBe('User 1')
      expect(result[0].password).toBe('[REDACTED]')
      expect(result[1].name).toBe('User 2')
      expect(result[1].token).toBe('[REDACTED]')
    })

    it('should handle non-object values', () => {
      expect(sanitizeForLog('string')).toBe('string')
      expect(sanitizeForLog(123)).toBe(123)
      expect(sanitizeForLog(null)).toBe(null)
      expect(sanitizeForLog(undefined)).toBe(undefined)
      expect(sanitizeForLog(true)).toBe(true)
    })

    it('should not modify original object', () => {
      const input = {
        name: 'Test',
        password: 'secret',
      }

      const result = sanitizeForLog(input)
      expect(input.password).toBe('secret')
      expect(result.password).toBe('[REDACTED]')
    })
  })
})
