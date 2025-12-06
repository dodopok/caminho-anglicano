<script setup lang="ts">
import type { Church, ChurchWithDistance, ChurchFilters } from '../../types/church'

const route = useRoute()
const { fetchChurches } = useChurches()
const { 
  fetchJurisdictions,
  getJurisdictionBySlug
} = useJurisdictions()

const churches = ref<Church[]>([])
const filteredChurches = ref<ChurchWithDistance[]>([])
const selectedChurchId = ref<string | null>(null)
const isLoading = ref(true)

// Get jurisdiction from slug in URL path
const jurisdictionSlug = computed(() => {
  const slug = route.params.slug
  return Array.isArray(slug) ? slug[0] : slug
})

const jurisdiction = computed(() => {
  if (!jurisdictionSlug.value) return null
  return getJurisdictionBySlug(jurisdictionSlug.value)
})

const filters = computed<ChurchFilters>(() => ({
  jurisdictionId: jurisdiction.value?.id,
  searchQuery: '',
  address: ''
}))

async function loadChurches() {
  isLoading.value = true
  
  try {
    churches.value = await fetchChurches(filters.value)
    filteredChurches.value = churches.value.map((church: Church) => {
      const { ...churchWithoutDistance } = church as ChurchWithDistance
      return churchWithoutDistance as ChurchWithDistance
    })
  } catch (error) {
    console.error('Error loading churches:', error)
  } finally {
    isLoading.value = false
  }
}

function selectChurch(churchId: string) {
  selectedChurchId.value = churchId
}

onMounted(async () => {
  await fetchJurisdictions()
  await loadChurches()
})

// SEO meta tags for widget page
useSeoMeta({
  title: 'Mapa de Igrejas Anglicanas - Widget',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <div class="h-screen flex flex-col bg-white overflow-hidden">
    <!-- Map -->
    <main class="flex-1 bg-gray-100 relative">
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div class="text-center">
          <svg class="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p class="text-sm text-gray-600">Carregando igrejas...</p>
        </div>
      </div>

      <ClientOnly>
        <GoogleMap
          :churches="filteredChurches"
          :selected-church-id="selectedChurchId"
          :user-location="null"
          @select-church="selectChurch"
        />
        <template #fallback>
          <div class="w-full h-full flex items-center justify-center">
            <p class="text-gray-500">Carregando mapa...</p>
          </div>
        </template>
      </ClientOnly>

      <!-- Branding Footer -->
      <div class="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-2 flex items-center justify-between shadow-lg">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-sm text-gray-700">
            <span v-if="jurisdiction" class="font-medium">{{ jurisdiction.name }}</span>
            <span v-else class="font-medium">Todas as jurisdições</span>
            <span class="hidden sm:inline"> • {{ filteredChurches.length }} {{ filteredChurches.length === 1 ? 'igreja' : 'igrejas' }}</span>
          </span>
        </div>
        <a
          href="https://caminhoanglicano.com.br/localizador"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          Um serviço de Caminho Anglicano
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Fix para iOS Safari - previne scroll vertical */
.h-screen {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height para iOS */
}
</style>
