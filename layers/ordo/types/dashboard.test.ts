import { describe, expect, it } from 'vitest'
import { isValidRosaryCategorySelection, normalizeRosaryCategories } from './dashboard'

describe('rosary category selection', () => {
  it('accepts an existing category by slug and documentId', () => {
    expect(isValidRosaryCategorySelection({
      mode: 'existing',
      slug: 'seasonal',
      documentId: 'cat_seasonal'
    })).toBe(true)
  })

  it('accepts an existing category when only its slug is available', () => {
    expect(isValidRosaryCategorySelection({ mode: 'existing', slug: 'seasonal' })).toBe(true)
  })

  it('requires slug and name for a new category', () => {
    expect(isValidRosaryCategorySelection({ mode: 'new', slug: '', name: 'Seasonal', description: '', icon: '' })).toBe(false)
    expect(isValidRosaryCategorySelection({ mode: 'new', slug: 'seasonal', name: 'Seasonal', description: '', icon: '' })).toBe(true)
  })

  it('does not create a default category', () => {
    expect(isValidRosaryCategorySelection(null)).toBe(false)
  })

  it('normalizes the Rails response and ignores categories without documentId', () => {
    expect(normalizeRosaryCategories({
      categories: [
        { documentId: 'cat_seasonal', slug: ' seasonal ', name: ' Temporais ', description: '  Orações  ', icon: ' ✦ ' },
        { id: 7, slug: 'legacy', name: 'Não usar id' }
      ]
    })).toEqual({
      rosary_categories: [{
        documentId: 'cat_seasonal',
        slug: 'seasonal',
        name: 'Temporais',
        description: 'Orações',
        icon: '✦'
      }]
    })
  })
})
