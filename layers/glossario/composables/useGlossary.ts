import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { glossaryTerms } from '../data/terms'

const ITEMS_PER_PAGE = 50
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Estados compartilhados globais
const searchQuery = ref('')
const debouncedSearchQuery = ref('') // Query com debounce para filtro
const selectedLetter = ref<string | null>(null)
const currentPage = ref(1)

// Debounce timer
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let urlUpdateTimer: ReturnType<typeof setTimeout> | null = null
let isUserTyping = false // Flag para prevenir reset durante digitação

export const useGlossary = () => {
  const route = useRoute()
  const router = useRouter()

  // Função auxiliar para ordenação alfabética
  const sortAlphabetically = (terms: typeof glossaryTerms) => {
    return terms.slice().sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'))
  }

  // Termos filtrados (usa debouncedSearchQuery para performance)
  const filteredTerms = computed(() => {
    const query = debouncedSearchQuery.value.trim()
    const hasTextSearch = query.length > 0
    const hasLetterFilter = selectedLetter.value !== null

    // Busca por texto (prioridade sobre letra)
    if (hasTextSearch) {
      const queryLower = query.toLowerCase()

      const matches = glossaryTerms.filter(term =>
        term.term.toLowerCase().includes(queryLower) ||
        term.definition.toLowerCase().includes(queryLower)
      )

      // Ordenar com priorização
      return matches.slice().sort((a, b) => {
        const aLower = a.term.toLowerCase()
        const bLower = b.term.toLowerCase()

        // Match exato
        const aExact = aLower === queryLower
        const bExact = bLower === queryLower
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        // Começa com a busca
        const aStarts = aLower.startsWith(queryLower)
        const bStarts = bLower.startsWith(queryLower)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1

        // Ordem alfabética
        return a.term.localeCompare(b.term, 'pt-BR')
      })
    }

    // Filtro por letra
    if (hasLetterFilter) {
      const filtered = glossaryTerms.filter(term =>
        term.term.charAt(0).toUpperCase() === selectedLetter.value
      )
      return sortAlphabetically(filtered)
    }

    // Sem filtros - ordem alfabética
    return sortAlphabetically(glossaryTerms)
  })

  // Paginação
  const totalPages = computed(() => {
    return Math.ceil(filteredTerms.value.length / ITEMS_PER_PAGE)
  })

  const paginatedTerms = computed(() => {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredTerms.value.slice(start, end)
  })

  // Atualizar URL quando filtros mudarem (com debounce)
  const updateURL = () => {
    if (urlUpdateTimer) {
      clearTimeout(urlUpdateTimer)
    }

    urlUpdateTimer = setTimeout(() => {
      const query: Record<string, string> = {}

      if (debouncedSearchQuery.value) {
        query.q = debouncedSearchQuery.value
      } else if (selectedLetter.value) {
        query.letra = selectedLetter.value
      }

      if (currentPage.value > 1) {
        query.pagina = currentPage.value.toString()
      }

      router.replace({ query })
    }, 300)
  }

  // Funções para gerenciar filtros
  const handleSearchInput = () => {
    isUserTyping = true // Marcar que usuário está digitando
    selectedLetter.value = null
    currentPage.value = 1

    // Se o input estiver vazio, limpar imediatamente sem debounce
    if (searchQuery.value.trim() === '') {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
      }
      debouncedSearchQuery.value = ''
      isUserTyping = false
      updateURL()
      return
    }

    // Debounce do searchQuery para debouncedSearchQuery
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
      debouncedSearchQuery.value = searchQuery.value
      isUserTyping = false
      updateURL()
    }, 300)
  }

  const handleLetterClick = (letter: string) => {
    isUserTyping = false // Reset da flag ao clicar em filtro

    if (selectedLetter.value === letter) {
      selectedLetter.value = null
    } else {
      selectedLetter.value = letter
      searchQuery.value = ''
      debouncedSearchQuery.value = ''
    }
    currentPage.value = 1

    // Limpar timers pendentes
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    if (urlUpdateTimer) clearTimeout(urlUpdateTimer)

    updateURL()
  }

  const handleRelatedTermClick = (term: string) => {
    isUserTyping = false // Reset da flag ao clicar em termo relacionado

    searchQuery.value = term
    debouncedSearchQuery.value = term // Atualização imediata para termos relacionados
    selectedLetter.value = null
    currentPage.value = 1

    // Limpar timers pendentes
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    if (urlUpdateTimer) clearTimeout(urlUpdateTimer)

    updateURL()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearSearch = () => {
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
    selectedLetter.value = null
    currentPage.value = 1
    isUserTyping = false // Reset da flag

    // Limpar timers pendentes
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    if (urlUpdateTimer) clearTimeout(urlUpdateTimer)

    updateURL()
  }

  const clearLetterFilter = () => {
    selectedLetter.value = null
    currentPage.value = 1

    // Limpar timers pendentes
    if (urlUpdateTimer) clearTimeout(urlUpdateTimer)

    updateURL()
  }

  // Funções de navegação de páginas
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page

      // Limpar timer pendente
      if (urlUpdateTimer) clearTimeout(urlUpdateTimer)

      updateURL()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      goToPage(currentPage.value + 1)
    }
  }

  const previousPage = () => {
    if (currentPage.value > 1) {
      goToPage(currentPage.value - 1)
    }
  }

  // Inicializar filtros a partir da URL (apenas na montagem inicial)
  const initializeFromURL = () => {
    // Não sobrescrever se usuário estiver digitando
    if (isUserTyping) return

    const queryParam = route.query.q as string
    const letterParam = route.query.letra as string
    const pageParam = route.query.pagina as string

    // Apenas atualizar se houver parâmetros na URL
    // Não limpar valores existentes se não houver parâmetros
    if (queryParam) {
      searchQuery.value = queryParam
      debouncedSearchQuery.value = queryParam // Inicialização imediata
    } else if (letterParam && alphabet.includes(letterParam.toUpperCase())) {
      selectedLetter.value = letterParam.toUpperCase()
    }
    // Removido o 'else' que limpava valores - isso causava o bug

    if (pageParam) {
      const page = parseInt(pageParam)
      if (!isNaN(page) && page > 0) {
        currentPage.value = page
      }
    }
  }

  // Auto-inicializar na montagem
  onMounted(() => {
    initializeFromURL()
  })

  // Observar mudanças na URL e sincronizar (exceto quando usuário está digitando)
  watch(() => route.query, (newQuery) => {
    // Se usuário está digitando, não sincronizar da URL
    if (isUserTyping) return

    const queryParam = newQuery.q as string
    const letterParam = newQuery.letra as string

    // Se não há nenhum parâmetro de busca/filtro na URL, limpar tudo
    if (!queryParam && !letterParam) {
      searchQuery.value = ''
      debouncedSearchQuery.value = ''
      selectedLetter.value = null
    } else if (queryParam && queryParam !== debouncedSearchQuery.value) {
      // Sincronizar apenas se o valor da URL for diferente do atual
      searchQuery.value = queryParam
      debouncedSearchQuery.value = queryParam
      selectedLetter.value = null
    } else if (letterParam && letterParam.toUpperCase() !== selectedLetter.value) {
      // Sincronizar letra apenas se diferente
      selectedLetter.value = letterParam.toUpperCase()
      searchQuery.value = ''
      debouncedSearchQuery.value = ''
    }
  })

  return {
    // Estados
    searchQuery,
    selectedLetter,
    currentPage,
    alphabet,

    // Computed
    filteredTerms,
    totalPages,
    paginatedTerms,

    // Métodos de filtro
    handleSearchInput,
    handleLetterClick,
    handleRelatedTermClick,
    clearSearch,
    clearLetterFilter,

    // Métodos de paginação
    goToPage,
    nextPage,
    previousPage,

    // Constantes
    ITEMS_PER_PAGE
  }
}
