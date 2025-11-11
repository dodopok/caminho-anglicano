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
  { value: 'IARB', label: 'IARB', color: 'bg-red-500' }
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

function clearFilters() {
  filters.value = {
    jurisdiction: undefined,
    searchQuery: '',
    address: ''
  }
  applyFilters()
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
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <nav class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="text-2xl font-bold text-slate-800 hover:text-slate-600 transition-colors">
            Caminho Anglicano
          </NuxtLink>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">
          Localizador de Igrejas Anglicanas
        </h1>
        <p class="text-slate-600">
          Encontre igrejas anglicanas em todo o Brasil
        </p>
      </div>

      <div v-if="errorMessage" class="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {{ errorMessage }}
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 class="text-xl font-semibold text-slate-900 mb-4">
              Filtros
            </h2>

            <div class="space-y-4">
              <div>
                <label for="searchQuery" class="block text-sm font-medium text-slate-700 mb-2">
                  Buscar por nome ou cidade
                </label>
                <input
                  id="searchQuery"
                  v-model="filters.searchQuery"
                  type="text"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Digite o nome da igreja ou cidade"
                >
              </div>

              <div>
                <label for="address" class="block text-sm font-medium text-slate-700 mb-2">
                  Buscar por endereço ou CEP
                </label>
                <div class="flex gap-2">
                  <input
                    id="address"
                    v-model="filters.address"
                    type="text"
                    class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Digite seu CEP ou endereço"
                    @keyup.enter="handleAddressSearch"
                  >
                  <button
                    type="button"
                    @click="handleAddressSearch"
                    class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
                    aria-label="Buscar por endereço"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">
                  Filtrar por jurisdição
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="j in jurisdictions"
                    :key="j.value"
                    type="button"
                    @click="filters.jurisdiction = filters.jurisdiction === j.value ? undefined : j.value"
                    :class="[
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      filters.jurisdiction === j.value
                        ? `${j.color} text-white shadow-md`
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    ]"
                  >
                    {{ j.label }}
                  </button>
                </div>
              </div>

              <button
                type="button"
                @click="clearFilters"
                class="w-full px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 class="text-xl font-semibold text-slate-900 mb-4">
              Adicionar Igreja
            </h2>

            <div class="space-y-3">
              <button
                type="button"
                @click="isAddChurchModalOpen = true"
                class="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Uma Igreja
              </button>

              <button
                type="button"
                @click="isAddBulkModalOpen = true"
                class="w-full px-4 py-3 bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Adicionar Múltiplas
              </button>
            </div>
          </div>

          <div class="bg-slate-50 rounded-lg border border-slate-200 p-4">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-xl">📖</span>
              Legenda
            </h3>
            <div class="space-y-2">
              <div v-for="j in jurisdictions" :key="j.value" class="flex items-center gap-2">
                <div :class="`w-4 h-4 rounded-full ${j.color}`" />
                <span class="text-sm text-slate-700">{{ j.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden h-[500px]">
            <ClientOnly>
              <GoogleMap
                :churches="filteredChurches"
                :selected-church-id="selectedChurchId"
                @select-church="selectChurch"
              />
              <template #fallback>
                <div class="w-full h-full flex items-center justify-center bg-slate-100">
                  <p class="text-slate-600">Carregando mapa...</p>
                </div>
              </template>
            </ClientOnly>
          </div>

          <div class="bg-white rounded-lg shadow-md border border-slate-200">
            <div class="p-6 border-b border-slate-200">
              <h2 class="text-xl font-semibold text-slate-900">
                Igrejas Encontradas ({{ filteredChurches.length }})
              </h2>
            </div>

            <div v-if="isLoading" class="p-6">
              <p class="text-slate-600">Carregando igrejas...</p>
            </div>

            <div v-else-if="filteredChurches.length === 0" class="p-6">
              <p class="text-slate-600">Nenhuma igreja encontrada com os filtros selecionados.</p>
            </div>

            <div v-else class="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              <button
                v-for="church in filteredChurches"
                :key="church.id"
                type="button"
                @click="selectChurch(church.id)"
                :class="[
                  'w-full text-left p-6 hover:bg-slate-50 transition-colors',
                  selectedChurchId === church.id ? 'bg-slate-50' : ''
                ]"
              >
                <div class="flex items-start gap-4">
                  <div
                    :class="`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                      jurisdictions.find(j => j.value === church.jurisdiction)?.color
                    }`"
                  />
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-slate-900 mb-1">
                      {{ church.name }}
                    </h3>
                    <p class="text-sm text-slate-600 mb-2">
                      {{ church.address }}, {{ church.city }} - {{ church.state }}
                    </p>
                    <div class="flex items-center gap-2 text-xs">
                      <span
                        :class="`px-2 py-1 rounded ${
                          jurisdictions.find(j => j.value === church.jurisdiction)?.color
                        } text-white font-medium`"
                      >
                        {{ church.jurisdiction }}
                      </span>
                      <span v-if="church.schedules.length > 0" class="text-slate-500">
                        {{ church.schedules.length }} horário(s) de culto
                      </span>
                    </div>
                  </div>
                </div>
              </button>
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
