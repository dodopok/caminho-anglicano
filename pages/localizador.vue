<script setup lang="ts">
import type { Church, Jurisdiction, ChurchFilters } from '~/types/church'

useHead({
  title: 'Localizador de Igrejas - Caminho Anglicano',
  meta: [
    { name: 'description', content: 'Encontre igrejas anglicanas perto de você em todo o Brasil' }
  ]
})

const { fetchChurches } = useChurches()
const { geocodePostalCode, geocodeAddress } = useGeocoding()

const churches = ref<Church[]>([])
const filteredChurches = ref<Church[]>([])
const selectedChurchId = ref<string | null>(null)
const isLoading = ref(true)
const errorMessage = ref('')

const filters = ref<ChurchFilters>({
  jurisdiction: undefined,
  searchQuery: '',
  address: ''
})

const isAddChurchModalOpen = ref(false)
const isAddBulkModalOpen = ref(false)

const jurisdictions: { value: Jurisdiction; label: string; color: string }[] = [
  { value: 'IAB', label: 'IAB', color: 'bg-blue-500' },
  { value: 'IEAB', label: 'IEAB', color: 'bg-green-500' },
  { value: 'IECB', label: 'IECB', color: 'bg-amber-500' },
  { value: 'IARB', label: 'IARB', color: 'bg-red-500' },
  { value: 'REB', label: 'REB', color: 'bg-purple-500' }
]

async function loadChurches() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    churches.value = await fetchChurches()
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

  if (filters.value.jurisdiction) {
    result = result.filter(c => c.jurisdiction === filters.value.jurisdiction)
  }

  if (filters.value.searchQuery) {
    const query = filters.value.searchQuery.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query)
    )
  }

  filteredChurches.value = result
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
      const sortedByDistance = churches.value
        .map(church => ({
          church,
          distance: calculateDistance(
            result.latitude,
            result.longitude,
            church.latitude,
            church.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.church)

      filteredChurches.value = sortedByDistance
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
}

function handleSubmissionSuccess() {
  loadChurches()
}

watch(() => filters.value.jurisdiction, applyFilters)
watch(() => filters.value.searchQuery, applyFilters)

onMounted(() => {
  loadChurches()
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <nav class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="text-xl font-semibold text-slate-900 hover:text-slate-600 transition-colors">
            Caminho Anglicano
          </NuxtLink>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {{ errorMessage }}
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-4">
          <div class="bg-white rounded-lg border border-slate-200 p-4">
            <div class="space-y-4">
              <div>
                <label for="searchQuery" class="block text-sm font-medium text-slate-700 mb-1.5">
                  Buscar por nome ou endereço
                </label>
                <input
                  id="searchQuery"
                  v-model="filters.searchQuery"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="Ex: Catedral Anglicana"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">
                  Perto de mim
                </label>
                <div class="flex gap-2">
                  <input
                    id="address"
                    v-model="filters.address"
                    type="text"
                    class="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    placeholder="CEP ou endereço"
                    @keyup.enter="handleAddressSearch"
                  >
                  <button
                    type="button"
                    class="px-3 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
                    aria-label="Buscar"
                    @click="handleAddressSearch"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">
                  Filtrar por jurisdição
                </label>
                <select
                  v-model="filters.jurisdiction"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                >
                  <option :value="undefined">Todas</option>
                  <option v-for="j in jurisdictions" :key="j.value" :value="j.value">
                    {{ j.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white rounded-lg border border-slate-200 overflow-hidden" style="height: 500px;">
            <ClientOnly>
              <GoogleMap
                :churches="filteredChurches"
                :selected-church-id="selectedChurchId"
                @select-church="selectChurch"
              />
              <template #fallback>
                <div class="w-full h-full flex items-center justify-center bg-slate-50">
                  <p class="text-slate-500 text-sm">Carregando mapa...</p>
                </div>
              </template>
            </ClientOnly>
          </div>

          <div class="bg-white rounded-lg border border-slate-200">
            <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 class="text-base font-medium text-slate-900">
                {{ filteredChurches.length }} igreja{{ filteredChurches.length !== 1 ? 's' : '' }} encontrada{{ filteredChurches.length !== 1 ? 's' : '' }}
              </h2>
            </div>

            <div v-if="isLoading" class="p-4">
              <p class="text-slate-500 text-sm">Carregando...</p>
            </div>

            <div v-else-if="filteredChurches.length === 0" class="p-8 text-center">
              <p class="text-slate-500 text-sm mb-4">Nenhuma igreja encontrada.</p>
              <button
                type="button"
                class="text-sm text-slate-600 hover:text-slate-900 underline"
                @click="isAddChurchModalOpen = true"
              >
                Não encontrou a sua igreja aqui? Adicione.
              </button>
            </div>

            <div v-else class="divide-y divide-slate-200" style="max-height: 500px; overflow-y: auto;">
              <button
                v-for="church in filteredChurches"
                :key="church.id"
                type="button"
                :class="[
                  'w-full text-left p-4 hover:bg-slate-50 transition-colors',
                  selectedChurchId === church.id ? 'bg-slate-50' : ''
                ]"
                @click="selectChurch(church.id)"
              >
                <div class="flex items-start gap-3">
                  <div
                    :class="`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      jurisdictions.find(j => j.value === church.jurisdiction)?.color
                    }`"
                  />
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-medium text-slate-900 mb-0.5">
                      {{ church.name }}
                    </h3>
                    <p class="text-xs text-slate-500 mb-2">
                      {{ church.address }}, {{ church.city }} - {{ church.state }}
                    </p>
                    <div v-if="church.schedules.length > 0" class="text-xs text-slate-400">
                      Cultos: {{ church.schedules[0] }}{{ church.schedules.length > 1 ? ` +${church.schedules.length - 1}` : '' }}
                    </div>
                  </div>
                </div>
              </button>
              
              <div class="p-4 bg-slate-50 text-center">
                <button
                  type="button"
                  class="text-sm text-slate-600 hover:text-slate-900 underline"
                  @click="isAddChurchModalOpen = true"
                >
                  Não encontrou a sua igreja aqui? Adicione.
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

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
