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
              class="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
              aria-label="Buscar termos do glossário"
            />
            <svg
              class="absolute right-4 top-3.5 w-5 h-5 text-slate-400"
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
            @click="selectedLetter = null"
            class="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
            aria-label="Limpar filtro alfabético"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Contador de resultados -->
      <div v-if="searchQuery || selectedLetter" class="text-center mb-6">
        <p class="text-slate-600">
          {{ filteredTerms.length }} {{ filteredTerms.length === 1 ? 'termo encontrado' : 'termos encontrados' }}
        </p>
      </div>

      <!-- Lista de termos -->
      <div class="space-y-4">
        <div
          v-for="term in filteredTerms"
          :key="term.id"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-slate-200"
        >
          <h3 class="text-xl font-semibold text-slate-900 mb-3">
            {{ term.term }}
          </h3>
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
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from '../data/terms'
import { computed, ref, onMounted, watch } from 'vue'

const siteUrl = 'https://caminhoanglicano.com.br'
const route = useRoute()
const router = useRouter()

// Estado reativo
const searchQuery = ref('')
const selectedLetter = ref<string | null>(null)

// Alfabeto para filtros
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Inicializar filtros a partir da URL
onMounted(() => {
  const queryParam = route.query.q as string
  const letterParam = route.query.letra as string

  if (queryParam) {
    searchQuery.value = queryParam
  } else if (letterParam && alphabet.includes(letterParam.toUpperCase())) {
    selectedLetter.value = letterParam.toUpperCase()
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

  router.replace({ query })
}

// Funções para limpar filtros mutuamente exclusivos
const handleSearchInput = () => {
  if (searchQuery.value) {
    selectedLetter.value = null
  }
  updateURL()
}

const handleLetterClick = (letter: string) => {
  if (selectedLetter.value === letter) {
    selectedLetter.value = null
  } else {
    selectedLetter.value = letter
    searchQuery.value = ''
  }
  updateURL()
}

const handleRelatedTermClick = (term: string) => {
  searchQuery.value = term
  selectedLetter.value = null
  updateURL()

  // Scroll para o topo para melhor UX
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Termos filtrados
const filteredTerms = computed(() => {
  let terms = [...glossaryTerms]

  // Filtrar por busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    terms = terms.filter(term =>
      term.term.toLowerCase().includes(query) ||
      term.definition.toLowerCase().includes(query)
    )
  }

  // Filtrar por letra
  if (selectedLetter.value) {
    terms = terms.filter(term =>
      term.term.charAt(0).toUpperCase() === selectedLetter.value
    )
  }

  // Ordenar alfabeticamente
  return terms.sort((a, b) => a.term.localeCompare(b.term))
})

// Garantir renderização no servidor para crawlers
definePageMeta({
  layout: false
})

// SEO Meta Tags
useSeoMeta({
  title: 'Glossário Anglicano - Termos e Conceitos da Tradição Anglicana',
  description: 'Explore mais de 400 termos e conceitos da tradição anglicana brasileira. Guia completo com liturgia, sacramentos, história, figuras importantes, teologia, doutrina, vestes litúrgicas, vida monástica e práticas da igreja anglicana no Brasil e no mundo.',
  ogTitle: 'Glossário Anglicano - Caminho Anglicano',
  ogDescription: 'Explore mais de 400 termos e conceitos da tradição anglicana brasileira. Guia completo com liturgia, sacramentos, história, figuras importantes, teologia, doutrina e práticas da igreja anglicana.',
  ogImage: `${siteUrl}/og-image-glossario.png`,
  ogUrl: `${siteUrl}/glossario`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Glossário Anglicano - Caminho Anglicano',
  twitterDescription: 'Explore mais de 400 termos da tradição anglicana brasileira com história, liturgia, teologia, doutrina e práticas.',
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
