<script setup lang="ts">
import type { Church, Jurisdiction } from '../../../types/church'

const route = useRoute()
const jurisdictionSlug = route.params.jurisdictionSlug as string

// Fetch churches and jurisdictions
const { fetchChurches } = useChurches()
const { fetchJurisdictions } = useJurisdictions()

const jurisdiction = ref<Jurisdiction | null>(null)
const churches = ref<Church[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Search filter
const searchQuery = ref('')

onMounted(async () => {
  try {
    // Fetch all jurisdictions
    const jurisdictions = await fetchJurisdictions()
    jurisdiction.value = jurisdictions.find(j => j.slug.toLowerCase() === jurisdictionSlug.toLowerCase()) || null

    if (!jurisdiction.value) {
      error.value = 'Jurisdição não encontrada'
      loading.value = false
      return
    }

    // Fetch churches for this jurisdiction
    const allChurches = await fetchChurches({ jurisdictionId: jurisdiction.value.id })
    churches.value = allChurches
  } catch (e) {
    console.error('Erro ao carregar jurisdição:', e)
    error.value = 'Erro ao carregar dados da jurisdição'
  } finally {
    loading.value = false
  }
})

// Filtered churches by search
const filteredChurches = computed(() => {
  if (!searchQuery.value) return churches.value

  const query = searchQuery.value.toLowerCase()
  return churches.value.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.city.toLowerCase().includes(query) ||
    c.address.toLowerCase().includes(query)
  )
})

// Group churches by state
const churchesByState = computed(() => {
  const grouped = new Map<string, Church[]>()

  filteredChurches.value.forEach(church => {
    const state = church.state
    if (!grouped.has(state)) {
      grouped.set(state, [])
    }
    grouped.get(state)!.push(church)
  })

  // Sort states alphabetically
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])))
})

// SEO
const title = computed(() =>
  jurisdiction.value
    ? `${jurisdiction.value.name} - Igrejas Anglicanas no Brasil | Caminho Anglicano`
    : 'Jurisdição Anglicana | Caminho Anglicano'
)

const description = computed(() => {
  if (!jurisdiction.value) return 'Conheça as jurisdições anglicanas no Brasil'

  const churchCount = churches.value.length
  const desc = jurisdiction.value.description ||
    `${jurisdiction.value.fullName} - Conheça as ${churchCount} ${churchCount === 1 ? 'igreja' : 'igrejas'} anglicanas desta jurisdição no Brasil.`

  return desc
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description
})

// Structured data
const structuredData = computed(() => {
  if (!jurisdiction.value) return {}

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: jurisdiction.value.fullName,
    description: jurisdiction.value.description,
    url: `https://caminhoanglicano.com.br/igrejas/${jurisdiction.value.slug.toLowerCase()}`,
    ...(jurisdiction.value.website && { sameAs: [jurisdiction.value.website] })
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
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p class="text-gray-600">Carregando...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error || !jurisdiction" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md px-4">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">😔 Ops!</h1>
        <p class="text-xl text-gray-600 mb-8">{{ error || 'Jurisdição não encontrada' }}</p>
        <NuxtLink
          to="/igrejas"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Ver todas as igrejas
        </NuxtLink>
      </div>
    </div>

    <!-- Jurisdiction details -->
    <div v-else>
      <!-- Header -->
      <div class="bg-white border-b-4" :style="{ borderColor: jurisdiction.color }">
        <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <!-- Breadcrumb -->
          <nav class="mb-6">
            <ol class="flex items-center space-x-2 text-sm">
              <li>
                <NuxtLink to="/" class="text-blue-600 hover:text-blue-800 hover:underline">
                  Início
                </NuxtLink>
              </li>
              <li class="text-gray-400">/</li>
              <li>
                <NuxtLink to="/igrejas" class="text-blue-600 hover:text-blue-800 hover:underline">
                  Igrejas
                </NuxtLink>
              </li>
              <li class="text-gray-400">/</li>
              <li class="text-gray-700 font-medium">{{ jurisdiction.name }}</li>
            </ol>
          </nav>

          <!-- Jurisdiction header -->
          <div class="mb-6">
            <div class="flex items-center mb-3">
              <div
                class="w-1 h-12 rounded mr-4"
                :style="{ backgroundColor: jurisdiction.color }"
              ></div>
              <div>
                <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">
                  {{ jurisdiction.name }}
                </h1>
                <p class="text-lg text-gray-600 mt-1">
                  {{ jurisdiction.fullName }}
                </p>
              </div>
            </div>

            <!-- Description -->
            <p v-if="jurisdiction.description" class="text-gray-700 leading-relaxed max-w-3xl">
              {{ jurisdiction.description }}
            </p>

            <!-- Website -->
            <div v-if="jurisdiction.website" class="mt-4">
              <a
                :href="jurisdiction.website"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Visitar website
              </a>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-3xl font-bold" :style="{ color: jurisdiction.color }">
                {{ churches.length }}
              </div>
              <div class="text-sm text-gray-600">
                {{ churches.length === 1 ? 'Igreja' : 'Igrejas' }}
              </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-3xl font-bold" :style="{ color: jurisdiction.color }">
                {{ churchesByState.size }}
              </div>
              <div class="text-sm text-gray-600">
                {{ churchesByState.size === 1 ? 'Estado' : 'Estados' }}
              </div>
            </div>
          </div>

          <!-- Search -->
          <div class="max-w-md">
            <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
              Buscar igreja
            </label>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="Nome, cidade ou endereço..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
        </div>
      </div>

      <!-- Churches list -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <!-- No results -->
        <div v-if="filteredChurches.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-xl font-medium text-gray-900 mb-2">
            Nenhuma igreja encontrada
          </h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Tente buscar por outros termos' : 'Esta jurisdição ainda não possui igrejas cadastradas' }}
          </p>
        </div>

        <!-- Churches grouped by state -->
        <div v-else class="space-y-8">
          <div v-for="[state, stateChurches] in churchesByState" :key="state">
            <!-- State header -->
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <svg class="w-6 h-6 mr-2" :style="{ color: jurisdiction.color }" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
              {{ state }}
              <span class="ml-2 text-lg font-normal text-gray-600">
                ({{ stateChurches.length }} {{ stateChurches.length === 1 ? 'igreja' : 'igrejas' }})
              </span>
            </h2>

            <!-- Churches grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NuxtLink
                v-for="church in stateChurches"
                :key="church.id"
                :to="`/igrejas/${jurisdiction.slug.toLowerCase()}/${church.slug}`"
                class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <!-- Color bar -->
                <div class="h-2" :style="{ backgroundColor: jurisdiction.color }"></div>

                <div class="p-6">
                  <!-- Church name -->
                  <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {{ church.name }}
                  </h3>

                  <!-- Location -->
                  <div class="flex items-start text-gray-600 mb-3">
                    <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p class="text-sm">{{ church.city }}</p>
                    </div>
                  </div>

                  <!-- Description preview -->
                  <p v-if="church.description" class="text-gray-600 text-sm line-clamp-2 mb-3">
                    {{ church.description }}
                  </p>

                  <!-- View details -->
                  <div class="flex items-center text-blue-600 font-medium text-sm">
                    Ver detalhes
                    <svg class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
