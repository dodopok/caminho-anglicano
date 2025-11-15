<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <GlossaryHeader />
    <GlossaryBookBanner />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-12">
        <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          Explore termos e conceitos importantes da tradição anglicana
        </p>

        <GlossarySearchBar />
        <GlossaryAlphabetFilter />
      </div>

      <GlossaryResultsCounter />

      <GlossaryTermsList v-if="filteredTerms.length > 0" />
      <GlossaryEmptyState v-else />

      <GlossaryPagination />
    </main>

    <TermSuggestionModal />

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
import { useGlossary } from '../../composables/useGlossary'
import { useTermSuggestion } from '../../composables/useTermSuggestion'

const siteUrl = 'https://caminhoanglicano.com.br'

// Composables
const { filteredTerms } = useGlossary()
const { showToast, toastMessage, toastType } = useTermSuggestion()

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
