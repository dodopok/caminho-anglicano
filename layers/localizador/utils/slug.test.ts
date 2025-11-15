import { describe, it, expect } from 'vitest'
import {
  slugify,
  generateChurchSlug,
  generateUniqueSlugVariation,
  normalizeSlugForUrl,
} from './slug'

describe('slug utils', () => {
  describe('slugify', () => {
    it('should convert text to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world')
    })

    it('should replace spaces with hyphens', () => {
      expect(slugify('hello world test')).toBe('hello-world-test')
    })

    it('should remove accents and diacritics', () => {
      expect(slugify('São Paulo')).toBe('sao-paulo')
      expect(slugify('João Pessoa')).toBe('joao-pessoa')
      expect(slugify('Curitiba é linda')).toBe('curitiba-e-linda')
    })

    it('should remove special characters', () => {
      expect(slugify('hello@world!')).toBe('helloworld')
      expect(slugify('test#123$')).toBe('test123')
    })

    it('should replace multiple consecutive hyphens with single hyphen', () => {
      expect(slugify('hello---world')).toBe('hello-world')
      expect(slugify('test  -  example')).toBe('test-example')
    })

    it('should trim hyphens from start and end', () => {
      expect(slugify('-hello-world-')).toBe('hello-world')
      expect(slugify('---test---')).toBe('test')
    })

    it('should handle empty strings', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle strings with only special characters', () => {
      expect(slugify('!@#$%^&*()')).toBe('')
    })

    it('should preserve numbers and underscores', () => {
      expect(slugify('test_123')).toBe('test_123')
      expect(slugify('hello 2024')).toBe('hello-2024')
    })
  })

  describe('generateChurchSlug', () => {
    it('should generate slug from church name, city, and state', () => {
      const slug = generateChurchSlug('Igreja Anglicana', 'São Paulo', 'SP')
      expect(slug).toBe('igreja-anglicana-sao-paulo-sp')
    })

    it('should handle accents in all parameters', () => {
      const slug = generateChurchSlug('Paróquia São José', 'João Pessoa', 'PB')
      expect(slug).toBe('paroquia-sao-jose-joao-pessoa-pb')
    })

    it('should handle special characters', () => {
      const slug = generateChurchSlug('Igreja & Comunidade', 'Rio de Janeiro', 'RJ')
      expect(slug).toBe('igreja-comunidade-rio-de-janeiro-rj')
    })

    it('should generate consistent slugs', () => {
      const slug1 = generateChurchSlug('Test Church', 'Test City', 'TC')
      const slug2 = generateChurchSlug('Test Church', 'Test City', 'TC')
      expect(slug1).toBe(slug2)
    })
  })

  describe('generateUniqueSlugVariation', () => {
    it('should append counter to base slug', () => {
      expect(generateUniqueSlugVariation('base-slug', 1)).toBe('base-slug-1')
      expect(generateUniqueSlugVariation('base-slug', 2)).toBe('base-slug-2')
    })

    it('should work with any counter value', () => {
      expect(generateUniqueSlugVariation('test', 100)).toBe('test-100')
      expect(generateUniqueSlugVariation('test', 0)).toBe('test-0')
    })
  })

  describe('normalizeSlugForUrl', () => {
    it('should convert to lowercase', () => {
      expect(normalizeSlugForUrl('HELLO-WORLD')).toBe('hello-world')
      expect(normalizeSlugForUrl('Test-Slug')).toBe('test-slug')
    })

    it('should handle null and undefined', () => {
      expect(normalizeSlugForUrl(null)).toBe('')
      expect(normalizeSlugForUrl(undefined)).toBe('')
    })

    it('should handle empty strings', () => {
      expect(normalizeSlugForUrl('')).toBe('')
    })

    it('should preserve hyphens and alphanumeric characters', () => {
      expect(normalizeSlugForUrl('test-slug-123')).toBe('test-slug-123')
    })
  })
})
