<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <nav class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-slate-800">
            Glossário Anglicano
          </h1>
          <NuxtLink
            to="/"
            class="text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            ← Voltar
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Banner do Livro -->
    <div class="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 border-b-4 border-amber-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-4 text-white">
            <div class="hidden sm:flex w-12 h-12 bg-white/20 rounded-lg items-center justify-center flex-shrink-0">
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg sm:text-xl font-bold">📖 Livro: Caminho Anglicano</h2>
              <p class="text-sm text-amber-100">Por Thomas McKenzie • Tradução: Rev. Douglas Araujo</p>
            </div>
          </div>
          <div class="flex gap-3 flex-wrap justify-center">
            <a
              href="https://amzn.to/4r2lYmM"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-800 rounded-lg hover:bg-amber-50 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Digital
            </a>
            <a
              href="https://loja.uiclap.com/titulo/ua123620"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-950 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Físico
            </a>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-12">
        <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          Explore termos e conceitos importantes da tradição anglicana
        </p>

        <!-- Barra de busca -->
        <div class="max-w-2xl mx-auto mb-8">
          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearchInput"
              type="text"
              placeholder="Buscar termos..."
              class="w-full px-4 py-3 pr-24 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
              aria-label="Buscar termos do glossário"
            />
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                v-if="searchQuery"
                @click="clearSearch"
                class="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                aria-label="Limpar busca"
              >
                Limpar
              </button>
              <svg
                class="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- Filtro alfabético -->
        <div class="flex flex-wrap justify-center gap-2 mb-8">
          <button
            v-for="letter in alphabet"
            :key="letter"
            @click="handleLetterClick(letter)"
            :class="[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              selectedLetter === letter
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            ]"
            :aria-pressed="selectedLetter === letter"
            :aria-label="`Filtrar por letra ${letter}`"
          >
            {{ letter }}
          </button>
          <button
            v-if="selectedLetter"
            @click="() => { selectedLetter = null; currentPage = 1; updateURL(); }"
            class="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
            aria-label="Limpar filtro alfabético"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Contador de resultados e paginação -->
      <div class="text-center mb-6">
        <p class="text-slate-600 mb-2">
          {{ filteredTerms.length }} {{ filteredTerms.length === 1 ? 'termo encontrado' : 'termos encontrados' }}
        </p>
        <p v-if="totalPages > 1" class="text-sm text-slate-500">
          Página {{ currentPage }} de {{ totalPages }}
        </p>
      </div>

      <!-- Lista de termos -->
      <div v-if="filteredTerms.length > 0" class="space-y-4">
        <div
          v-for="term in paginatedTerms"
          :key="term.id"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-slate-200"
        >
          <NuxtLink
            :to="`/glossario/${term.id}`"
            class="block group"
          >
            <h3 class="text-xl font-semibold text-slate-900 mb-3 group-hover:text-amber-700 transition-colors">
              {{ term.term }}
              <svg class="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </h3>
          </NuxtLink>
          <p class="text-slate-700 leading-relaxed mb-4">
            {{ term.definition }}
          </p>
          <div v-if="term.relatedTerms && term.relatedTerms.length > 0" class="flex flex-wrap gap-2">
            <span class="text-sm text-slate-500 font-medium">Termos relacionados:</span>
            <button
              v-for="relatedTerm in term.relatedTerms"
              :key="relatedTerm"
              @click="handleRelatedTermClick(relatedTerm)"
              class="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
              :aria-label="`Buscar termo relacionado: ${relatedTerm}`"
            >
              {{ relatedTerm }}
            </button>
          </div>
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="totalPages > 1" class="mt-12 flex justify-center items-center gap-2">
        <button
          @click="previousPage"
          :disabled="currentPage === 1"
          class="px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
        >
          ← Anterior
        </button>

        <!-- Páginas -->
        <div class="flex gap-1">
          <button
            v-for="page in totalPages"
            :key="page"
            v-show="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
            @click="goToPage(page)"
            :class="[
              'px-4 py-2 rounded-lg transition-colors',
              page === currentPage
                ? 'bg-amber-700 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            ]"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
        >
          Próxima →
        </button>
      </div>

      <!-- Mensagem quando não há resultados -->
      <div
        v-if="filteredTerms.length === 0"
        class="text-center py-12"
      >
        <svg
          class="w-16 h-16 text-slate-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-slate-600 text-lg mb-2">
          Nenhum termo encontrado
        </p>
        <p class="text-slate-500 text-sm mb-4">
          Tente ajustar sua busca ou filtro
        </p>
        <button
          v-if="searchQuery"
          @click="openSuggestionModal"
          class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Sugerir este termo
        </button>
      </div>
    </main>

    <!-- Modal de Sugestão de Termo -->
    <BaseModal
      :is-open="showSuggestionModal"
      title="Sugerir Novo Termo"
      @close="closeSuggestionModal"
    >
      <form @submit.prevent="submitSuggestion" class="space-y-4">
        <div>
          <label for="term" class="block text-sm font-medium text-slate-700 mb-2">
            Termo *
          </label>
          <input
            id="term"
            v-model="suggestion.term"
            type="text"
            required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Ex: Primaz"
          />
        </div>

        <div>
          <label for="definition" class="block text-sm font-medium text-slate-700 mb-2">
            Definição sugerida (opcional)
          </label>
          <textarea
            id="definition"
            v-model="suggestion.definition"
            rows="4"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Se souber, pode sugerir uma definição..."
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
            Seu e-mail (opcional)
          </label>
          <input
            id="email"
            v-model="suggestion.email"
            type="email"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="seu@email.com"
          />
        </div>

        <div class="flex gap-3 justify-end pt-4">
          <button
            type="button"
            @click="closeSuggestionModal"
            class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || !suggestion.term"
            class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Enviando...' : 'Enviar Sugestão' }}
          </button>
        </div>

        <p v-if="submissionError" class="text-red-600 text-sm">
          {{ submissionError }}
        </p>
      </form>
    </BaseModal>

    <!-- Toast de notificação -->
    <BaseToast
      :show="showToast"
      :type="toastType"
      :message="toastMessage"
      @close="showToast = false"
    />

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from '../../data/terms'
import { computed, ref, onMounted } from 'vue'

const siteUrl = 'https://caminhoanglicano.com.br'
const route = useRoute()
const router = useRouter()

// Estado reativo
const searchQuery = ref('')
const selectedLetter = ref<string | null>(null)
const currentPage = ref(1)

// Estado do modal de sugestão
const showSuggestionModal = ref(false)
const isSubmitting = ref(false)
const submissionError = ref('')
const submissionSuccess = ref(false)
const suggestion = ref({
  term: '',
  definition: '',
  email: ''
})

// Estado do toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')

// Paginação
const ITEMS_PER_PAGE = 50

// Alfabeto para filtros
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Inicializar filtros a partir da URL
onMounted(() => {
  const queryParam = route.query.q as string
  const letterParam = route.query.letra as string
  const pageParam = route.query.pagina as string

  if (queryParam) {
    searchQuery.value = queryParam
  } else if (letterParam && alphabet.includes(letterParam.toUpperCase())) {
    selectedLetter.value = letterParam.toUpperCase()
  }

  if (pageParam) {
    const page = parseInt(pageParam)
    if (!isNaN(page) && page > 0) {
      currentPage.value = page
    }
  }
})

// Atualizar URL quando filtros mudarem
const updateURL = () => {
  const query: Record<string, string> = {}

  if (searchQuery.value) {
    query.q = searchQuery.value
  } else if (selectedLetter.value) {
    query.letra = selectedLetter.value
  }

  if (currentPage.value > 1) {
    query.pagina = currentPage.value.toString()
  }

  router.replace({ query })
}

// Funções para gerenciar filtros
const handleSearchInput = () => {
  // Quando usuário digita, limpar filtro de letra
  selectedLetter.value = null
  currentPage.value = 1
  updateURL()
}

const handleLetterClick = (letter: string) => {
  if (selectedLetter.value === letter) {
    // Clicar na mesma letra: desmarcar
    selectedLetter.value = null
  } else {
    // Selecionar nova letra: limpar busca de texto
    selectedLetter.value = letter
    searchQuery.value = ''
  }
  currentPage.value = 1
  updateURL()
}

const handleRelatedTermClick = (term: string) => {
  // Clicar em termo relacionado: buscar esse termo
  searchQuery.value = term
  selectedLetter.value = null
  currentPage.value = 1
  updateURL()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const clearSearch = () => {
  // Limpar busca
  searchQuery.value = ''
  selectedLetter.value = null
  currentPage.value = 1
  updateURL()
}

// Funções do modal de sugestão
const openSuggestionModal = () => {
  suggestion.value = {
    term: searchQuery.value,
    definition: '',
    email: ''
  }
  submissionError.value = ''
  submissionSuccess.value = false
  showSuggestionModal.value = true
}

const closeSuggestionModal = () => {
  showSuggestionModal.value = false
  suggestion.value = {
    term: '',
    definition: '',
    email: ''
  }
  submissionError.value = ''
  submissionSuccess.value = false
}

const displayToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const submitSuggestion = async () => {
  if (!suggestion.value.term) return

  isSubmitting.value = true
  submissionError.value = ''
  submissionSuccess.value = false

  try {
    // Formatar dados como string para o campo bulk_data
    const bulkDataString = `SUGESTÃO DE TERMO PARA O GLOSSÁRIO
Termo: ${suggestion.value.term}
${suggestion.value.definition ? `Definição sugerida: ${suggestion.value.definition}` : 'Sem definição sugerida'}
${suggestion.value.email ? `Email: ${suggestion.value.email}` : 'Email não fornecido'}
Data: ${new Date().toLocaleString('pt-BR')}`

    await $fetch('/api/submissions/bulk', {
      method: 'POST',
      body: {
        bulkData: bulkDataString
      }
    })

    closeSuggestionModal()
    displayToast('Sugestão enviada com sucesso! Obrigado pela contribuição.', 'success')
  } catch (err) {
    console.error('Erro ao enviar sugestão:', err)
    submissionError.value = 'Erro ao enviar sugestão. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}

// Função auxiliar para ordenação alfabética
const sortAlphabetically = (terms: typeof glossaryTerms) => {
  return terms.slice().sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'))
}

// Termos filtrados - REFATORADO DO ZERO
const filteredTerms = computed(() => {
  // 1. Normalizar inputs
  const query = searchQuery.value.trim()
  const hasTextSearch = query.length > 0
  const hasLetterFilter = selectedLetter.value !== null

  // 2. CASO 1: Busca por texto (prioridade sobre letra)
  if (hasTextSearch) {
    const queryLower = query.toLowerCase()

    // Filtrar termos que contêm a busca (termo ou definição)
    const matches = glossaryTerms.filter(term =>
      term.term.toLowerCase().includes(queryLower) ||
      term.definition.toLowerCase().includes(queryLower)
    )

    // Ordenar com priorização:
    // 1º - Match exato
    // 2º - Começa com a busca
    // 3º - Ordem alfabética
    return matches.slice().sort((a, b) => {
      const aLower = a.term.toLowerCase()
      const bLower = b.term.toLowerCase()

      // Prioridade 1: Match exato
      const aExact = aLower === queryLower
      const bExact = bLower === queryLower
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Prioridade 2: Começa com a busca
      const aStarts = aLower.startsWith(queryLower)
      const bStarts = bLower.startsWith(queryLower)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // Prioridade 3: Ordem alfabética
      return a.term.localeCompare(b.term, 'pt-BR')
    })
  }

  // 3. CASO 2: Filtro por letra
  if (hasLetterFilter) {
    const filtered = glossaryTerms.filter(term =>
      term.term.charAt(0).toUpperCase() === selectedLetter.value
    )
    return sortAlphabetically(filtered)
  }

  // 4. CASO 3: Sem filtros - ordem alfabética
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

// Funções de navegação de páginas
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
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

// Garantir renderização no servidor para crawlers
definePageMeta({
  layout: false
})

// SEO Meta Tags
useSeoMeta({
  title: 'Glossário Anglicano - Termos e Conceitos da Tradição Anglicana',
  description: 'Explore mais de 480 termos e conceitos da tradição anglicana brasileira. Guia completo com liturgia, sacramentos, história, figuras importantes, teologia, doutrina, títulos de Cristo, vestes litúrgicas, vida monástica e práticas da igreja anglicana no Brasil e no mundo.',
  ogTitle: 'Glossário Anglicano - Caminho Anglicano',
  ogDescription: 'Explore mais de 480 termos e conceitos da tradição anglicana brasileira. Guia completo com liturgia, sacramentos, história, figuras importantes, teologia, doutrina, títulos de Cristo e práticas da igreja anglicana.',
  ogImage: `${siteUrl}/og-image-glossario.png`,
  ogUrl: `${siteUrl}/glossario`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Glossário Anglicano - Caminho Anglicano',
  twitterDescription: 'Explore mais de 480 termos da tradição anglicana brasileira com história, liturgia, teologia, doutrina e práticas.',
  twitterImage: `${siteUrl}/og-image-glossario.png`,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
})

// Structured Data para SEO
useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/glossario` }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Glossário Anglicano',
        url: `${siteUrl}/glossario`,
        description: 'Glossário completo de termos e conceitos da tradição anglicana, incluindo liturgia, sacramentos, orações e práticas eclesiásticas.',
        inLanguage: 'pt-BR',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Caminho Anglicano',
          url: siteUrl
        },
        mainEntity: {
          '@type': 'ItemList',
          name: 'Termos do Glossário Anglicano',
          description: 'Lista de termos anglicanos com definições',
          numberOfItems: glossaryTerms.length,
          itemListElement: glossaryTerms.slice(0, 50).map((term, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'DefinedTerm',
              '@id': `${siteUrl}/glossario#${term.id}`,
              name: term.term,
              description: term.definition
            }
          }))
        }
      })
    }
  ]
})
</script>
