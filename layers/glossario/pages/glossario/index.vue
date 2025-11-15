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
            <div class="absolute right-2 top-2 flex items-center gap-2">
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
        <p class="text-slate-600 text-lg">
          Nenhum termo encontrado
        </p>
        <p class="text-slate-500 text-sm mt-2">
          Tente ajustar sua busca ou filtro
        </p>
      </div>
    </main>

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from '../../data/terms'
import { computed, ref, onMounted, watch } from 'vue'

const siteUrl = 'https://caminhoanglicano.com.br'
const route = useRoute()
const router = useRouter()

// Estado reativo
const searchQuery = ref('')
const selectedLetter = ref<string | null>(null)
const currentPage = ref(1)

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

// Funções para limpar filtros mutuamente exclusivos
const handleSearchInput = () => {
  // Sempre limpar filtro de letra quando há mudança na busca
  selectedLetter.value = null
  currentPage.value = 1 // Reset para primeira página
  updateURL()
}

const handleLetterClick = (letter: string) => {
  if (selectedLetter.value === letter) {
    selectedLetter.value = null
  } else {
    selectedLetter.value = letter
    searchQuery.value = ''
  }
  currentPage.value = 1 // Reset para primeira página
  updateURL()
}

const handleRelatedTermClick = (term: string) => {
  searchQuery.value = term
  selectedLetter.value = null
  currentPage.value = 1
  updateURL()

  // Scroll para o topo para melhor UX
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  updateURL()
}

// Termos filtrados
const filteredTerms = computed(() => {
  // Sempre criar uma nova cópia do array original para garantir imutabilidade
  // Usar Array.from para criar uma cópia totalmente nova e quebrar referências
  const originalTerms = Array.from(glossaryTerms)

  // Normalizar searchQuery (trim e verificar se realmente tem conteúdo)
  const normalizedQuery = searchQuery.value.trim()
  const hasSearchQuery = normalizedQuery.length > 0

  // Debug: log para verificar qual caminho está sendo executado
  console.log('[Glossário] Recalculando filtros:', {
    searchQuery: searchQuery.value,
    normalizedQuery,
    hasSearchQuery,
    selectedLetter: selectedLetter.value
  })

  // Caso 1: Busca ativa
  if (hasSearchQuery) {
    console.log('[Glossário] Usando ordenação com priorização de matches')
    const query = normalizedQuery.toLowerCase()

    // Filtrar termos que contêm a busca
    const filtered = originalTerms.filter(term =>
      term.term.toLowerCase().includes(query) ||
      term.definition.toLowerCase().includes(query)
    )

    // Ordenar com priorização de matches
    return filtered.sort((a, b) => {
      const aTermLower = a.term.toLowerCase()
      const bTermLower = b.term.toLowerCase()

      // Match exato tem prioridade máxima
      const aExactMatch = aTermLower === query
      const bExactMatch = bTermLower === query

      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1

      // Match que começa com a query tem segunda prioridade
      const aStartsWith = aTermLower.startsWith(query)
      const bStartsWith = bTermLower.startsWith(query)

      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1

      // Caso contrário, ordenar alfabeticamente
      return a.term.localeCompare(b.term)
    })
  }

  // Caso 2: Filtro por letra
  if (selectedLetter.value) {
    console.log('[Glossário] Usando filtro por letra:', selectedLetter.value)
    const filtered = originalTerms.filter(term =>
      term.term.charAt(0).toUpperCase() === selectedLetter.value
    )
    // Criar novo array antes de ordenar
    const sorted = [...filtered].sort((a, b) => a.term.localeCompare(b.term))
    console.log('[Glossário] Primeiro termo após ordenação por letra:', sorted[0]?.term)
    return sorted
  }

  // Caso 3: Sem filtros - ordenação alfabética pura
  console.log('[Glossário] SEM FILTROS - Usando ordenação alfabética pura')
  // SEMPRE criar um array completamente novo para quebrar qualquer cache
  const sorted = [...originalTerms].sort((a, b) => a.term.localeCompare(b.term))
  console.log('[Glossário] Primeiro termo após ordenação alfabética:', sorted[0]?.term)
  console.log('[Glossário] Primeiros 5 termos:', sorted.slice(0, 5).map(t => t.term))
  return sorted
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
