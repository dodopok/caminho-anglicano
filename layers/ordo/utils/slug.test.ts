import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('turns a Portuguese title into an ASCII slug', () => {
    expect(slugify('Rosário pela Família')).toBe('rosario-pela-familia')
  })

  it('drops punctuation instead of encoding it', () => {
    expect(slugify('Oração: paz, força & esperança!')).toBe('oracao-paz-forca-esperanca')
  })

  it('collapses repeated separators and trims the edges', () => {
    expect(slugify('  --Rosário   da   Criação--  ')).toBe('rosario-da-criacao')
  })

  it('returns an empty string when the title has nothing to slug', () => {
    expect(slugify('———')).toBe('')
    expect(slugify('')).toBe('')
  })

  it('cuts a long title on a word boundary', () => {
    const slug = slugify('Rosário pela reconciliação das nações e pela paz duradoura entre os povos', 30)

    expect(slug.length).toBeLessThanOrEqual(30)
    expect(slug).toBe('rosario-pela-reconciliacao')
  })
})
