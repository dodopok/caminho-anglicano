<template>
  <AdminLayout>
    <div>
      <!-- Church Edit Modal -->
      <ChurchEditModal
        v-if="selectedChurch"
        :is-open="isEditModalOpen"
        :church="selectedChurch"
        :jurisdictions="jurisdictions"
        @close="closeEditModal"
        @success="handleEditSuccess"
      />
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Igrejas Cadastradas
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Gerencie todas as igrejas do sistema
          </p>
        </div>

        <!-- Export Button -->
        <button
          @click="handleExport"
          :disabled="isExporting"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="!isExporting" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <svg v-else class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ isExporting ? 'Exportando...' : 'Exportar CSV' }}
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
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
              placeholder="Nome da igreja..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <!-- Jurisdiction Filter -->
          <div>
            <label for="jurisdiction-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Jurisdição
            </label>
            <select
              id="jurisdiction-filter"
              v-model="jurisdictionFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              <option v-for="j in jurisdictions" :key="j.id" :value="j.id">
                {{ j.name }}
              </option>
            </select>
          </div>

          <!-- State Filter -->
          <div>
            <label for="state-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="state-filter"
              v-model="stateFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option v-for="state in uniqueStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p class="mt-4 text-gray-600">Carregando igrejas...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="bg-white rounded-lg shadow-sm p-6">
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!churches.length" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma igreja encontrada</h3>
        <p class="mt-1 text-sm text-gray-500">
          Ajuste os filtros para ver resultados.
        </p>
      </div>

      <!-- Churches Table -->
      <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Igreja
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jurisdição
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localização
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="church in churches"
                :key="church.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="text-sm font-medium text-gray-900">
                    {{ church.name }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ church.address }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :style="{ backgroundColor: church.jurisdiction?.color + '20', color: church.jurisdiction?.color }"
                  >
                    {{ church.jurisdiction?.slug || 'N/A' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ church.city }}, {{ church.state }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ church.responsible_email }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      class="text-blue-600 hover:text-blue-700 transition-colors"
                      @click="openEditModal(church)"
                    >
                      Editar
                    </button>
                    <button
                      class="text-red-600 hover:text-red-700 transition-colors"
                      @click="handleDelete(church)"
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="churches.length > 0" class="mt-6 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Mostrando {{ churches.length }} de {{ totalCount }} igreja{{ totalCount === 1 ? '' : 's' }}
        </div>
        
        <div v-if="totalPages > 1" class="flex gap-2">
          <button
            class="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="currentPage--; loadChurches()"
          >
            Anterior
          </button>
          
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">
              Página {{ currentPage }} de {{ totalPages }}
            </span>
          </div>
          
          <button
            class="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="currentPage === totalPages"
            @click="currentPage++; loadChurches()"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type Church = Database['public']['Tables']['churches']['Row'] & {
  jurisdiction?: {
    id: string
    name: string
    slug: string
    color: string
  }
}

type Jurisdiction = Database['public']['Tables']['jurisdictions']['Row']

const { getToken } = useAdminAuth()

const churches = ref<Church[]>([])
const jurisdictions = ref<Jurisdiction[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isExporting = ref(false)

const searchQuery = ref('')
const jurisdictionFilter = ref('')
const stateFilter = ref('')

// Pagination
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const pageSize = ref(10)

// Edit modal state
const isEditModalOpen = ref(false)
const selectedChurch = ref<Church | null>(null)

// Unique states for filter (fetch from API)
const uniqueStates = ref<string[]>([])

let searchTimeout: NodeJS.Timeout | null = null

// Watch filters and trigger search with debounce
watch([searchQuery, jurisdictionFilter, stateFilter], () => {
  // Reset to page 1 when filters change
  currentPage.value = 1
  
  // Debounce search
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    loadChurches()
  }, 300)
})

// Load on mount
onMounted(() => {
  loadChurches()
  loadJurisdictions()
  loadStates()
})

async function loadChurches() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    const params: Record<string, string> = {
      page: String(currentPage.value),
      limit: String(pageSize.value),
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    if (jurisdictionFilter.value) {
      params.jurisdiction_id = jurisdictionFilter.value
    }

    if (stateFilter.value) {
      params.state = stateFilter.value
    }

    const data = await $fetch<{
      churches: Church[]
      count: number
      page: number
      totalPages: number
    }>('/api/admin/churches', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: params,
    })

    churches.value = data.churches
    totalCount.value = data.count
    totalPages.value = data.totalPages
  }
  catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro ao carregar igrejas'
    console.error('Error loading churches:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function loadStates() {
  try {
    const token = await getToken()
    if (!token) return

    // Fetch all unique states from the API without filters
    const data = await $fetch<{ churches: Church[] }>('/api/admin/churches', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: { limit: '9999' }, // Get all for unique states
    })

    const states = data.churches.map(c => c.state).filter(Boolean)
    uniqueStates.value = Array.from(new Set(states)).sort()
  }
  catch (error) {
    console.error('Error loading states:', error)
  }
}

async function loadJurisdictions() {
  try {
    jurisdictions.value = await $fetch<Jurisdiction[]>('/api/jurisdictions')
  }
  catch (error) {
    console.error('Error loading jurisdictions:', error)
  }
}

function openEditModal(church: Church) {
  selectedChurch.value = church
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
  selectedChurch.value = null
}

function handleEditSuccess() {
  // Reload churches after successful edit
  loadChurches()
}

async function handleDelete(church: Church) {
  const confirmed = confirm(
    `Tem certeza que deseja remover a igreja "${church.name}"?\n\nEsta ação não pode ser desfeita.`
  )

  if (!confirmed) {
    return
  }

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/churches/${church.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // Reload churches after successful deletion
    await loadChurches()
    
    alert('✅ Igreja removida com sucesso!')
  }
  catch (error: unknown) {
    alert(error instanceof Error ? `❌ Erro ao remover igreja: ${error.message}` : '❌ Erro ao remover igreja')
    console.error('Error deleting church:', error)
  }
}

async function handleExport() {
  isExporting.value = true

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // Fetch the CSV file
    const response = await fetch('/api/admin/churches/export', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Falha ao exportar')
    }

    // Get the blob
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `igrejas-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
  catch (error: unknown) {
    alert(error instanceof Error ? error.message : 'Erro ao exportar')
  }
  finally {
    isExporting.value = false
  }
}
</script>
