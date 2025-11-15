<script setup lang="ts">
import type { Church } from '../../../types/church'

const route = useRoute()
const jurisdictionSlug = route.params.jurisdictionSlug as string
const slug = route.params.slug as string

// Fetch church data
const { fetchChurchBySlug } = useChurches()
const church = ref<Church | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    church.value = await fetchChurchBySlug(slug)

    // Validate that the church belongs to the correct jurisdiction
    if (!church.value) {
      error.value = 'Igreja não encontrada'
    } else if (church.value.jurisdiction?.slug !== jurisdictionSlug) {
      // Church exists but doesn't match jurisdiction in URL
      error.value = 'Igreja não encontrada nesta jurisdição'
      church.value = null
    }
  } catch (e) {
    console.error('Erro ao carregar igreja:', e)
    error.value = 'Erro ao carregar dados da igreja'
  } finally {
    loading.value = false
  }
})

// SEO meta tags
const title = computed(() =>
  church.value
    ? `${church.value.name} - ${church.value.city}, ${church.value.state} | Caminho Anglicano`
    : 'Igreja Anglicana | Caminho Anglicano'
)

const description = computed(() => {
  if (!church.value) return 'Conheça as igrejas anglicanas no Brasil'

  const desc = church.value.description
    ? church.value.description.substring(0, 155)
    : `${church.value.name} em ${church.value.city}, ${church.value.state}. ${church.value.pastors.length > 0 ? `Pastor(es): ${church.value.pastors.join(', ')}.` : ''}`

  return desc
})

const ogImage = computed(() => {
  // You can generate dynamic OG images or use a default one
  return '/og-church-default.jpg'
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage
})

// Structured data for SEO (schema.org)
const structuredData = computed(() => {
  if (!church.value) return {}

  return {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: church.value.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.value.address,
      addressLocality: church.value.city,
      addressRegion: church.value.state,
      postalCode: church.value.postalCode,
      addressCountry: 'BR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: church.value.latitude,
      longitude: church.value.longitude
    },
    description: church.value.description,
    url: `https://caminhoanglicano.com.br/igrejas/${church.value.jurisdiction?.slug.toLowerCase()}/${church.value.slug}`,
    ...(church.value.socialMedia?.website && {
      sameAs: [
        church.value.socialMedia.website,
        ...(church.value.socialMedia.instagram ? [`https://instagram.com/${church.value.socialMedia.instagram.replace('@', '')}`] : []),
        ...(church.value.socialMedia.youtube ? [church.value.socialMedia.youtube] : [])
      ]
    })
  }
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(structuredData.value)
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p class="text-gray-600">Carregando...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !church" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md px-4">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">😔 Ops!</h1>
        <p class="text-xl text-gray-600 mb-8">{{ error || 'Igreja não encontrada' }}</p>
        <NuxtLink
          to="/localizador"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Voltar ao Localizador
        </NuxtLink>
      </div>
    </div>

    <!-- Church Details -->
    <div v-else class="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <ChurchDetails :church="church" />
    </div>
  </div>
</template>
