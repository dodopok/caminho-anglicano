<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
    <!-- Header -->
    <header class="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <NuxtLink
          to="/glossario"
          class="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-colors font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Voltar ao Glossário
        </NuxtLink>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="max-w-4xl mx-auto px-4 py-12">
      <article v-if="term" class="bg-white rounded-xl shadow-lg p-8 md:p-12">
        <!-- Título do Termo -->
        <header class="mb-8 border-b border-stone-200 pb-6">
          <h1 class="text-4xl md:text-5xl font-bold text-stone-800 mb-2">
            {{ term.term }}
          </h1>
        </header>

        <!-- Definição -->
        <section class="mb-8">
          <h2 class="text-xl font-semibold text-stone-700 mb-4">Definição</h2>
          <p class="text-lg text-stone-600 leading-relaxed">
            {{ term.definition }}
          </p>
        </section>

        <!-- Termos Relacionados -->
        <section v-if="term.relatedTerms && term.relatedTerms.length > 0" class="mt-8">
          <h2 class="text-xl font-semibold text-stone-700 mb-4">Termos Relacionados</h2>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="relatedTerm in term.relatedTerms"
              :key="relatedTerm"
              :to="getTermLink(relatedTerm)"
              class="inline-block px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
            >
              {{ relatedTerm }}
            </NuxtLink>
          </div>
        </section>

        <!-- Navegação -->
        <footer class="mt-12 pt-6 border-t border-stone-200">
          <NuxtLink
            to="/glossario"
            class="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            Ver Todos os Termos
          </NuxtLink>
        </footer>
      </article>

      <!-- Termo não encontrado -->
      <div v-else class="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
        <div class="mb-6">
          <svg class="w-16 h-16 mx-auto text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-stone-800 mb-4">Termo não encontrado</h1>
        <p class="text-lg text-stone-600 mb-8">
          O termo que você procura não existe no glossário.
        </p>
        <NuxtLink
          to="/glossario"
          class="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Voltar ao Glossário
        </NuxtLink>
      </div>
    </main>

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from '../../data/terms'
import type { GlossaryTerm } from '../../types/glossary'

const route = useRoute()
const siteUrl = 'https://caminhoanglicano.com.br'

// Encontrar o termo pelo slug
const term = computed<GlossaryTerm | undefined>(() => {
  const slug = route.params.slug as string
  return glossaryTerms.find(t => t.id === slug)
})

// Função para criar link de termo relacionado
const getTermLink = (termName: string) => {
  const relatedTerm = glossaryTerms.find(t => t.term === termName)
  return relatedTerm ? `/glossario/${relatedTerm.id}` : '/glossario'
}

// SEO Meta Tags
useSeoMeta({
  title: term.value ? `${term.value.term} - Glossário Anglicano` : 'Termo não encontrado - Glossário Anglicano',
  description: term.value ? term.value.definition : 'O termo que você procura não foi encontrado no glossário anglicano.',
  ogTitle: term.value ? `${term.value.term} - Glossário Anglicano` : 'Termo não encontrado',
  ogDescription: term.value ? term.value.definition : 'O termo que você procura não foi encontrado no glossário anglicano.',
  ogImage: `${siteUrl}/og-image-glossario.png`,
  ogUrl: term.value ? `${siteUrl}/glossario/${term.value.id}` : `${siteUrl}/glossario`,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: term.value ? `${term.value.term} - Glossário Anglicano` : 'Termo não encontrado',
  twitterDescription: term.value ? term.value.definition : 'O termo que você procura não foi encontrado.',
  twitterImage: `${siteUrl}/og-image-glossario.png`,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
})

// Structured Data para SEO
useHead({
  link: [
    {
      rel: 'canonical',
      href: term.value ? `${siteUrl}/glossario/${term.value.id}` : `${siteUrl}/glossario`
    }
  ],
  script: term.value ? [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: term.value.term,
        description: term.value.definition,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'Glossário Anglicano',
          description: 'Termos e conceitos da tradição anglicana'
        }
      })
    }
  ] : []
})
</script>
