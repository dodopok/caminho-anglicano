<script setup lang="ts">
import type { Church } from '../../types/church'

// Fetch all churches
const { fetchChurches } = useChurches()
const churches = ref<Church[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Filters
const selectedJurisdiction = ref<string>('')
const searchQuery = ref('')
const selectedState = ref('')

// Fetch churches on mount
onMounted(async () => {
  try {
    churches.value = await fetchChurches()
  } catch (e) {
    console.error('Erro ao carregar igrejas:', e)
    error.value = 'Erro ao carregar lista de igrejas'
  } finally {
    loading.value = false
  }
})

// Computed filtered churches
const filteredChurches = computed(() => {
  let filtered = churches.value

  // Filter by jurisdiction
  if (selectedJurisdiction.value) {
    filtered = filtered.filter(c => c.jurisdictionId === selectedJurisdiction.value)
  }

  // Filter by state
  if (selectedState.value) {
    filtered = filtered.filter(c => c.state === selectedState.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Get unique states
const states = computed(() => {
  const uniqueStates = [...new Set(churches.value.map(c => c.state))].sort()
  return uniqueStates
})

// Get unique jurisdictions
const jurisdictions = computed(() => {
  const unique = new Map()
  churches.value.forEach(c => {
    if (c.jurisdiction && !unique.has(c.jurisdictionId)) {
      unique.set(c.jurisdictionId, c.jurisdiction)
    }
  })
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))
})

// SEO
useSeoMeta({
  title: 'Todas as Igrejas Anglicanas no Brasil | Caminho Anglicano',
  description: 'Conheça todas as igrejas anglicanas cadastradas no Brasil. Encontre endereços, horários de cultos, contatos e redes sociais.',
  ogTitle: 'Todas as Igrejas Anglicanas no Brasil | Caminho Anglicano',
  ogDescription: 'Conheça todas as igrejas anglicanas cadastradas no Brasil. Encontre endereços, horários de cultos, contatos e redes sociais.',
  ogType: 'website'
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <NuxtLink to="/" class="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-4">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao início
          </NuxtLink>
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Igrejas Anglicanas no Brasil
          </h1>
          <p class="text-lg text-gray-600">
            Conheça as igrejas anglicanas em todo o país
          </p>
        </div>

        <!-- Jurisdictions Section -->
        <div v-if="!loading && jurisdictions.length > 0" class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Explore por Jurisdição</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <NuxtLink
              v-for="jurisdiction in jurisdictions"
              :key="jurisdiction.id"
              :to="`/igrejas/${jurisdiction.slug.toLowerCase()}`"
              class="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden group border-l-4"
              :style="{ borderLeftColor: jurisdiction.color }"
            >
              <div class="p-4">
                <h3 class="font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                  {{ jurisdiction.name }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ churches.filter(c => c.jurisdictionId === jurisdiction.id).length }}
                  {{ churches.filter(c => c.jurisdictionId === jurisdiction.id).length === 1 ? 'igreja' : 'igrejas' }}
                </p>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 my-8"></div>

        <h2 class="text-2xl font-bold text-gray-900 mb-4">Todas as Igrejas</h2>

        <!-- Filters -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search -->
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="Nome, cidade ou endereço..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- State filter -->
          <div>
            <label for="state" class="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="state"
              v-model="selectedState"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os estados</option>
              <option v-for="state in states" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>

          <!-- Jurisdiction filter -->
          <div>
            <label for="jurisdiction" class="block text-sm font-medium text-gray-700 mb-1">
              Jurisdição
            </label>
            <select
              id="jurisdiction"
              v-model="selectedJurisdiction"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as jurisdições</option>
              <option v-for="jurisdiction in jurisdictions" :key="jurisdiction.id" :value="jurisdiction.id">
                {{ jurisdiction.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="max-w-7xl mx-auto px-4 py-12 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
      <p class="text-gray-600">Carregando igrejas...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-12 text-center">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Churches list -->
    <div v-else class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <!-- Results count -->
      <div class="mb-6">
        <p class="text-gray-600">
          Mostrando <span class="font-semibold">{{ filteredChurches.length }}</span>
          {{ filteredChurches.length === 1 ? 'igreja' : 'igrejas' }}
        </p>
      </div>

      <!-- No results -->
      <div v-if="filteredChurches.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-xl font-medium text-gray-900 mb-2">
          Nenhuma igreja encontrada
        </h3>
        <p class="text-gray-600">
          Tente ajustar os filtros ou buscar por outros termos
        </p>
      </div>

      <!-- Churches grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="church in filteredChurches"
          :key="church.id"
          :to="`/igrejas/${church.jurisdiction?.slug.toLowerCase()}/${church.slug}`"
          class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
        >
          <!-- Jurisdiction color bar -->
          <div
            class="h-2"
            :style="{ backgroundColor: church.jurisdiction?.color || '#6366f1' }"
          ></div>

          <div class="p-6">
            <!-- Church name -->
            <h2 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {{ church.name }}
            </h2>

            <!-- Jurisdiction badge -->
            <div v-if="church.jurisdiction" class="mb-3">
              <span
                class="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                :style="{ backgroundColor: church.jurisdiction.color }"
              >
                {{ church.jurisdiction.name }}
              </span>
            </div>

            <!-- Location -->
            <div class="flex items-start text-gray-600 mb-2">
              <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p class="text-sm">{{ church.city }}, {{ church.state }}</p>
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
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
