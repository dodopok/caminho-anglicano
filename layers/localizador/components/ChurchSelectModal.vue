<script setup lang="ts">
import type { Church, Jurisdiction } from '../types/church'

interface Props {
  isOpen: boolean
  jurisdictions: Jurisdiction[]
  initialSelectedIds?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  confirm: [selectedChurches: Church[]]
}>()

const { fetchChurches } = useChurches()

const searchQuery = ref('')
const selectedJurisdictionId = ref<string | null>(null)
const allChurches = ref<Church[]>([])
const isLoading = ref(false)
const selectedChurches = ref<Church[]>([])

// Fetch all churches when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    try {
      allChurches.value = await fetchChurches()
      
      // Initialize selected churches from props
      if (props.initialSelectedIds?.length) {
        selectedChurches.value = allChurches.value.filter(c => 
          props.initialSelectedIds?.includes(c.id)
        )
      } else {
        selectedChurches.value = []
      }
    } catch (error) {
      console.error('Error loading churches:', error)
    } finally {
      isLoading.value = false
    }
  }
})

const filteredChurches = computed(() => {
  return allChurches.value.filter(church => {
    const matchesSearch = !searchQuery.value || 
      church.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      church.city.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesJurisdiction = !selectedJurisdictionId.value || 
      church.jurisdictionId === selectedJurisdictionId.value
    
    return matchesSearch && matchesJurisdiction
  })
})

function toggleChurch(church: Church) {
  const index = selectedChurches.value.findIndex(c => c.id === church.id)
  if (index === -1) {
    selectedChurches.value.push(church)
  } else {
    selectedChurches.value.splice(index, 1)
  }
}

function isSelected(churchId: string) {
  return selectedChurches.value.some(c => c.id === churchId)
}

function handleConfirm() {
  emit('confirm', selectedChurches.value)
  emit('close')
}

function removeSelected(churchId: string) {
  selectedChurches.value = selectedChurches.value.filter(c => c.id !== churchId)
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="Selecionar Igrejas para o Mapa"
    max-width="4xl"
    @close="emit('close')"
  >
    <div class="flex flex-col h-[60vh]">
      <!-- Search and Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Buscar por nome ou cidade
          </label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Ex: Paróquia, São Paulo..."
              class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div>
          <JurisdictionSelect
            v-model="selectedJurisdictionId"
            :jurisdictions="jurisdictions"
            label="Filtrar por jurisdição"
          />
        </div>
      </div>

      <div class="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        <!-- Church List -->
        <div class="flex-1 flex flex-col min-h-0">
          <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center justify-between">
            Igrejas Disponíveis
            <span class="text-xs font-normal text-gray-500">{{ filteredChurches.length }} encontradas</span>
          </h3>
          <div class="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
            <div v-if="isLoading" class="flex items-center justify-center h-full">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
            <div v-else-if="filteredChurches.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
              <p>Nenhuma igreja encontrada.</p>
            </div>
            <div v-else class="space-y-1">
              <button
                v-for="church in filteredChurches"
                :key="church.id"
                type="button"
                class="w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left"
                :class="isSelected(church.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-100 border'"
                @click="toggleChurch(church)"
              >
                <div class="flex-shrink-0">
                  <div 
                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    :class="isSelected(church.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'"
                  >
                    <svg v-if="isSelected(church.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ church.name }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ church.city }}, {{ church.state }}</p>
                </div>
                <div 
                  v-if="church.jurisdiction"
                  class="flex-shrink-0 w-2 h-2 rounded-full"
                  :style="{ backgroundColor: church.jurisdiction.color }"
                  :title="church.jurisdiction.name"
                ></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Selected Summary -->
        <div class="w-full md:w-64 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-2 flex items-center justify-between">
            Selecionadas
            <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{{ selectedChurches.length }}</span>
          </h3>
          <div class="flex-1 overflow-y-auto space-y-2">
            <div v-if="selectedChurches.length === 0" class="text-xs text-gray-500 italic">
              Nenhuma igreja selecionada.
            </div>
            <div
              v-for="church in selectedChurches"
              :key="'sel-' + church.id"
              class="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-900 truncate">{{ church.name }}</p>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-red-500 transition-colors"
                @click="removeSelected(church.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer-actions>
      <button
        type="button"
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
        :disabled="selectedChurches.length === 0"
        @click="handleConfirm"
      >
        Confirmar Seleção
      </button>
    </template>
  </BaseModal>
</template>
