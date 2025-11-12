<script setup lang="ts">
import type { Church, ChurchWithDistance, ChurchFilters } from '../types/church'

const siteUrl = 'https://caminhoanglicano.com.br' // Atualize com sua URL de produção

useSeoMeta({
  title: 'Busque uma igreja anglicana - Caminho Anglicano',
  description: 'Encontre igrejas anglicanas perto de você em todo o Brasil. Busque por localização, jurisdição ou endereço. Veja horários de culto, pastores e informações de contato.',
  ogTitle: 'Busque uma igreja anglicana - Caminho Anglicano',
  ogDescription: 'Encontre igrejas anglicanas perto de você em todo o Brasil. Busque por localização, jurisdição ou endereço.',
  ogImage: `${siteUrl}/og-image-localizador.png`,
  ogUrl: `${siteUrl}/localizador`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Busque uma igreja anglicana',
  twitterDescription: 'Encontre igrejas anglicanas perto de você em todo o Brasil. Busque por localização, jurisdição ou endereço.',
  twitterImage: `${siteUrl}/og-image-localizador.png`,
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/localizador` }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Localizador de Igrejas Anglicanas',
        url: `${siteUrl}/localizador`,
        description: 'Encontre igrejas anglicanas em todo o Brasil com mapa interativo, filtros por jurisdição e busca por proximidade.',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL'
        }
      })
    }
  ]
})

const { fetchChurches } = useChurches()
const { 
  jurisdictions, 
  fetchJurisdictions, 
  getJurisdictionById,
  getJurisdictionColor,
  getJurisdictionName 
} = useJurisdictions()
const { geocodePostalCode, geocodeAddress } = useGeocoding()

const churches = ref<Church[]>([])
const filteredChurches = ref<ChurchWithDistance[]>([])
const selectedChurchId = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')
const isGettingLocation = ref(false)
const userLocation = ref<{ lat: number; lng: number } | null>(null)

const filters = ref<ChurchFilters>({
  jurisdictionId: undefined,
  searchQuery: '',
  address: ''
})

const isAddChurchTypeModalOpen = ref(false)
const isAddChurchModalOpen = ref(false)
const isAddBulkModalOpen = ref(false)
const isSidebarOpen = ref(false)

async function loadChurches() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    churches.value = await fetchChurches(filters.value)
    applyFilters()
  } catch (error) {
    console.error('Error loading churches:', error)
    errorMessage.value = 'Erro ao carregar as igrejas. Por favor, tente novamente.'
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  let result = [...churches.value]

  if (filters.value.jurisdictionId) {
    result = result.filter(c => c.jurisdictionId === filters.value.jurisdictionId)
  }

  if (filters.value.searchQuery) {
    const query = filters.value.searchQuery.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query)
    )
  }

  // Clear distances when filtering (not location-based)
  if (!userLocation.value) {
    result = result.map((church: Church | ChurchWithDistance) => {
      const { distance, ...churchWithoutDistance } = church as ChurchWithDistance
      return churchWithoutDistance as ChurchWithDistance
    })
  }

  filteredChurches.value = result
}

async function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada pelo seu navegador'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        let errorMsg = 'Erro ao obter localização'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permissão de localização negada'
            break
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Localização indisponível'
            break
          case error.TIMEOUT:
            errorMsg = 'Tempo esgotado ao obter localização'
            break
        }
        reject(new Error(errorMsg))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

function sortChurchesByDistance(location: { lat: number; lng: number }) {
  const withDistances: ChurchWithDistance[] = churches.value
    .map((church: Church) => {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        church.latitude,
        church.longitude
      )
      return { ...church, distance }
    })
    .sort((a: ChurchWithDistance, b: ChurchWithDistance) => (a.distance ?? 0) - (b.distance ?? 0))

  filteredChurches.value = withDistances
}

function getChurchDistance(churchId: string): string | null {
  const church = filteredChurches.value.find((c: ChurchWithDistance) => c.id === churchId)
  const distance = church?.distance
  if (!distance) return null

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  }
  return `${distance.toFixed(1)}km`
}

async function handleNearMe() {
  isGettingLocation.value = true
  errorMessage.value = ''

  try {
    const location = await getUserLocation()
    userLocation.value = location

    // Clear jurisdiction filter when using location
    filters.value.jurisdictionId = undefined

    // Sort churches by distance
    sortChurchesByDistance(location)
  } catch (error) {
    console.error('Error getting location:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Erro ao obter sua localização'
  } finally {
    isGettingLocation.value = false
  }
}

async function handleAddressSearch() {
  if (!filters.value.address) {
    applyFilters()
    return
  }

  const postalCodePattern = /^\d{5}-?\d{3}$/
  const isPostalCode = postalCodePattern.test(filters.value.address.replace(/\D/g, ''))

  try {
    const result = isPostalCode
      ? await geocodePostalCode(filters.value.address)
      : await geocodeAddress(filters.value.address)

    if (result) {
      userLocation.value = { lat: result.latitude, lng: result.longitude }
      sortChurchesByDistance(userLocation.value)
    } else {
      errorMessage.value = 'Não foi possível encontrar o endereço. Tente novamente.'
    }
  } catch (error) {
    console.error('Error searching by address:', error)
    errorMessage.value = 'Erro ao buscar por endereço. Por favor, tente novamente.'
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371
  const dLat = degreesToRadians(lat2 - lat1)
  const dLon = degreesToRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function selectChurch(churchId: string) {
  selectedChurchId.value = churchId
  // Close sidebar on mobile when selecting a church
  isSidebarOpen.value = false
}

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function handleSubmissionSuccess() {
  loadChurches()
}

function handleSelectSingleChurch() {
  isAddChurchTypeModalOpen.value = false
  isAddChurchModalOpen.value = true
}

function handleSelectBulkChurches() {
  isAddChurchTypeModalOpen.value = false
  isAddBulkModalOpen.value = true
}

function formatSchedules(schedules: any[]): string {
  if (!schedules || schedules.length === 0) return ''

  if (typeof schedules[0] === 'string') {
    return schedules.join(', ')
  }

  const formatted = schedules.map(s => {
    if (typeof s === 'object' && s.day && s.time) {
      return `${s.day} às ${s.time}`
    }
    return String(s)
  })

  if (formatted.length <= 2) {
    return formatted.join(' e ')
  }

  return formatted.slice(0, 2).join(', ') + ` +${formatted.length - 2}`
}

function getJurisdictionBadgeClass(jurisdictionId: string): string {
  const jurisdiction = getJurisdictionById(jurisdictionId)
  if (!jurisdiction) return 'bg-gray-100 text-gray-700'

  // Convert hex color to Tailwind classes
  const colorMap: Record<string, string> = {
    '#3B82F6': 'bg-blue-100 text-blue-700',       // IAB - Blue
    '#10B981': 'bg-green-100 text-green-700',     // IEAB - Green
    '#8B5CF6': 'bg-purple-100 text-purple-700',   // REB - Purple
    '#EF4444': 'bg-red-100 text-red-700',         // IARB - Red
    '#EAB308': 'bg-yellow-100 text-yellow-700',   // ICEB - Yellow
    '#EC4899': 'bg-pink-100 text-pink-700',       // IECB - Pink
    '#06B6D4': 'bg-cyan-100 text-cyan-700',       // Independente - Cyan
    '#92400E': 'bg-amber-100 text-amber-900',     // IEUB - Brown
    '#F97316': 'bg-orange-100 text-orange-700'    // TAC - Orange
  }

  return colorMap[jurisdiction.color] || 'bg-gray-100 text-gray-700'
}

watch(() => filters.value.jurisdictionId, applyFilters)
watch(() => filters.value.searchQuery, applyFilters)

onMounted(async () => {
  await fetchJurisdictions()
  await loadChurches()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-white overflow-hidden">
    <!-- Header -->
    <nav class="bg-white shadow-sm border-b border-slate-200 flex-shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-slate-800">
            Localizador de igrejas
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

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Mobile overlay -->
      <Transition name="overlay">
        <div
          v-if="isSidebarOpen"
          class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          @click="isSidebarOpen = false"
        />
      </Transition>

      <!-- Sidebar -->
      <aside
        :class="[
          'w-80 border-r border-gray-200 flex flex-col bg-white transition-transform duration-300 lg:relative lg:translate-x-0 z-40',
          isSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'
        ]"
      >
        <!-- Mobile close button -->
        <div class="lg:hidden p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-900">Filtros</h2>
          <button
            type="button"
            @click="isSidebarOpen = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filters Section -->
        <div class="p-4 space-y-3 border-b border-gray-200">
          <!-- Search -->
          <div>
            <label for="searchQuery" class="block text-sm font-medium text-gray-700 mb-1">
              Buscar por nome ou endereço
            </label>
            <div class="relative">
              <input
                id="searchQuery"
                v-model="filters.searchQuery"
                type="text"
                class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Ex: Catedral Anglicana"
              >
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Jurisdiction Filter -->
          <JurisdictionSelect
            v-model="filters.jurisdictionId"
            :jurisdictions="jurisdictions"
          />

          <!-- Near Me Button -->
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isGettingLocation"
            @click="handleNearMe"
          >
            <svg v-if="!isGettingLocation" class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg v-else class="w-4 h-4 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isGettingLocation ? 'Obtendo localização...' : 'Perto de mim' }}
          </button>
        </div>

        <!-- Results Header -->
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span class="text-sm text-gray-600">
            {{ churches.length }} igreja(s) cadastrada(s)
          </span>
          <button
            type="button"
            class="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
            @click="isAddChurchTypeModalOpen = true"
          >
            + Adicionar
          </button>
        </div>

        <!-- Churches List -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="isLoading" class="p-4">
            <p class="text-sm text-gray-500">Carregando...</p>
          </div>

          <div v-else-if="filteredChurches.length === 0" class="p-6 text-center">
            <p class="text-sm text-gray-500 mb-3">Nenhuma igreja encontrada.</p>
            <button
              type="button"
              class="text-sm text-indigo-600 hover:text-indigo-700 underline"
              @click="isAddChurchTypeModalOpen = true"
            >
              Adicionar igreja
            </button>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <button
              v-for="church in filteredChurches"
              :key="church.id"
              type="button"
              :class="[
                'w-full text-left p-4 hover:bg-gray-50 transition-colors relative',
                selectedChurchId === church.id ? 'bg-gray-50' : ''
              ]"
              @click="selectChurch(church.id)"
            >
              <div class="pr-16">
                <div class="flex items-start gap-2 mb-1">
                  <h3 class="text-sm font-semibold text-gray-900 flex-1">
                    {{ church.name }}
                  </h3>
                  <span v-if="getChurchDistance(church.id)" class="text-xs font-medium text-indigo-600 whitespace-nowrap">
                    {{ getChurchDistance(church.id) }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mb-2">
                  {{ church.address }}, {{ church.city }} - {{ church.state }}
                </p>
                <p v-if="church.schedules.length > 0" class="text-xs text-gray-600">
                  <span class="font-medium">Cultos:</span> {{ formatSchedules(church.schedules) }}
                </p>
              </div>
              <span
                :class="[
                  'absolute top-4 right-4 px-2 py-0.5 text-xs font-medium rounded',
                  getJurisdictionBadgeClass(church.jurisdictionId)
                ]"
              >
                {{ getJurisdictionName(church.jurisdictionId) }}
              </span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Map -->
      <main class="flex-1 bg-gray-100 relative">
        <!-- Mobile menu button -->
        <button
          type="button"
          class="lg:hidden fixed top-24 left-4 z-20 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors"
          @click="toggleSidebar"
          aria-label="Abrir menu de filtros"
        >
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <ClientOnly>
          <GoogleMap
            :churches="filteredChurches"
            :selected-church-id="selectedChurchId"
            :user-location="userLocation"
            @select-church="selectChurch"
          />
          <template #fallback>
            <div class="w-full h-full flex items-center justify-center">
              <p class="text-gray-500">Carregando mapa...</p>
            </div>
          </template>
        </ClientOnly>
      </main>
    </div>

    <!-- Modals -->
    <AddChurchTypeModal
      :is-open="isAddChurchTypeModalOpen"
      @close="isAddChurchTypeModalOpen = false"
      @select-single="handleSelectSingleChurch"
      @select-bulk="handleSelectBulkChurches"
    />

    <AddChurchModal
      :is-open="isAddChurchModalOpen"
      @close="isAddChurchModalOpen = false"
      @success="handleSubmissionSuccess"
    />

    <AddBulkChurchesModal
      :is-open="isAddBulkModalOpen"
      @close="isAddBulkModalOpen = false"
      @success="handleSubmissionSuccess"
    />
  </div>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

/* Fix para iOS Safari - previne scroll vertical */
.h-screen {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height para iOS */
}
</style>
