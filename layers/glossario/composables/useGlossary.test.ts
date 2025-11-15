import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock vue-router
const mockRoute = ref({ query: {} })
const mockRouter = {
  replace: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute.value,
  useRouter: () => mockRouter,
}))

// Mock glossary data
vi.mock('../data/terms', () => ({
  glossaryTerms: [
    { id: 'anglican', term: 'Anglican', definition: 'Related to the Anglican Church' },
    { id: 'bishop', term: 'Bishop', definition: 'A senior member of the clergy' },
    { id: 'communion', term: 'Communion', definition: 'The service of Christian worship' },
    { id: 'diocese', term: 'Diocese', definition: 'The district under the pastoral care of a bishop' },
    { id: 'eucharist', term: 'Eucharist', definition: 'The Christian ceremony' },
  ],
}))

describe('useGlossary', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRoute.value = { query: {} }
    vi.useFakeTimers()
    // Reset module to clear shared state
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with all terms sorted alphabetically', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { filteredTerms } = useGlossary()

    expect(filteredTerms.value.length).toBe(5)
    expect(filteredTerms.value[0].term).toBe('Anglican')
    expect(filteredTerms.value[1].term).toBe('Bishop')
  })

  it('should filter terms by search query', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { searchQuery, handleSearchInput, filteredTerms } = useGlossary()

    searchQuery.value = 'bishop'
    handleSearchInput()

    vi.runAllTimers()
    await nextTick()

    // Should filter to include Bishop and Diocese (which contains "bishop" in definition)
    expect(filteredTerms.value.length).toBeGreaterThan(0)
    expect(filteredTerms.value.some(t => t.term === 'Bishop')).toBe(true)
  })

  it('should filter terms by letter', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { handleLetterClick, filteredTerms } = useGlossary()

    handleLetterClick('C')

    expect(filteredTerms.value.length).toBe(1)
    expect(filteredTerms.value[0].term).toBe('Communion')
  })

  it('should clear letter filter when clicking same letter again', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { handleLetterClick, selectedLetter } = useGlossary()

    handleLetterClick('C')
    await nextTick()
    expect(selectedLetter.value).toBe('C')

    handleLetterClick('C')
    await nextTick()
    expect(selectedLetter.value).toBe(null)
  })

  it('should prioritize exact matches in search', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { searchQuery, handleSearchInput, filteredTerms } = useGlossary()

    searchQuery.value = 'communion'
    handleSearchInput()

    vi.runAllTimers()
    await nextTick()

    // Should have exact match first
    expect(filteredTerms.value[0].term).toBe('Communion')
  })

  it('should search in both term and definition', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { searchQuery, handleSearchInput, filteredTerms } = useGlossary()

    searchQuery.value = 'clergy'
    handleSearchInput()

    vi.runAllTimers()
    await nextTick()

    // Should find Bishop (definition contains "clergy")
    expect(filteredTerms.value.length).toBeGreaterThan(0)
    expect(filteredTerms.value.some(t => t.term === 'Bishop')).toBe(true)
  })

  it('should paginate results', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { paginatedTerms, ITEMS_PER_PAGE } = useGlossary()

    // With only 5 terms, all should be on page 1
    expect(paginatedTerms.value.length).toBeLessThanOrEqual(ITEMS_PER_PAGE)
  })

  it('should navigate to next page', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { nextPage, currentPage } = useGlossary()

    // Since we only have 5 terms, next page shouldn't work
    currentPage.value = 1
    nextPage()

    // Should stay on page 1 since there's only 1 page
    expect(currentPage.value).toBe(1)
  })

  it('should navigate to previous page', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { previousPage, currentPage } = useGlossary()

    currentPage.value = 1
    previousPage()

    // Should stay on page 1
    expect(currentPage.value).toBe(1)
  })

  it('should clear search', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { searchQuery, handleSearchInput, clearSearch, filteredTerms } = useGlossary()

    searchQuery.value = 'bishop'
    handleSearchInput()

    vi.runAllTimers()
    await nextTick()

    clearSearch()

    expect(searchQuery.value).toBe('')
    expect(filteredTerms.value.length).toBe(5)
  })

  it('should clear letter filter', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { handleLetterClick, clearLetterFilter, selectedLetter } = useGlossary()

    handleLetterClick('C')
    expect(selectedLetter.value).toBe('C')

    clearLetterFilter()
    expect(selectedLetter.value).toBe(null)
  })

  it('should update URL when filters change', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { searchQuery, handleSearchInput } = useGlossary()

    searchQuery.value = 'test'
    handleSearchInput()

    vi.runAllTimers()
    await nextTick()

    expect(mockRouter.replace).toHaveBeenCalled()
  })

  it('should handle related term click', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { handleRelatedTermClick, searchQuery } = useGlossary()

    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    handleRelatedTermClick('Bishop')

    expect(searchQuery.value).toBe('Bishop')
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })

    scrollToSpy.mockRestore()
  })

  it('should reset to page 1 when filtering', async () => {
    const { useGlossary } = await import('./useGlossary')
    const { currentPage, handleLetterClick } = useGlossary()

    currentPage.value = 5
    handleLetterClick('A')

    expect(currentPage.value).toBe(1)
  })

  it('should initialize from URL query parameters', async () => {
    mockRoute.value = { query: { q: 'communion' } }

    const { useGlossary } = await import('./useGlossary')
    const { initializeFromURL, searchQuery } = useGlossary()

    initializeFromURL()

    expect(searchQuery.value).toBe('communion')
  })

  it('should handle letter parameter in URL', async () => {
    mockRoute.value = { query: { letra: 'B' } }

    const { useGlossary } = await import('./useGlossary')
    const { initializeFromURL, selectedLetter } = useGlossary()

    initializeFromURL()

    expect(selectedLetter.value).toBe('B')
  })

  it('should handle page parameter in URL', async () => {
    mockRoute.value = { query: { pagina: '2' } }

    const { useGlossary } = await import('./useGlossary')
    const { initializeFromURL, currentPage } = useGlossary()

    initializeFromURL()

    expect(currentPage.value).toBe(2)
  })
})
