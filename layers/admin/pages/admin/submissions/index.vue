<template>
  <AdminLayout>
    <div>
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          Submissões de Igrejas
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Gerencie e revise as submissões de novas igrejas
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Status Filter -->
          <div>
            <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              v-model="statusFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Apenas Pendentes</option>
              <option value="all">Todos</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
            </select>
          </div>

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
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p class="mt-4 text-gray-600">Carregando submissões...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="bg-white rounded-lg shadow-sm p-6">
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!submissions.length" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma submissão encontrada</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ statusFilter === 'pending' ? 'Não há submissões pendentes no momento.' : 'Ajuste os filtros para ver resultados.' }}
        </p>
      </div>

      <!-- Submissions Table -->
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
                  Data
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="submission in submissions"
                :key="submission.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ submission.name }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ submission.responsible_email }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ submission.jurisdiction }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ extractLocation(submission.address) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(submission.submitted_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <StatusBadge :status="submission.status" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    class="text-blue-600 hover:text-blue-700 transition-colors"
                    @click="openModal(submission)"
                  >
                    Ver Detalhes
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="submissions.length > 0" class="mt-4 text-sm text-gray-600 text-center">
        Mostrando {{ submissions.length }} submiss{{ submissions.length === 1 ? 'ão' : 'ões' }}
      </div>
    </div>

    <!-- Detail Modal -->
    <SubmissionDetailModal
      v-if="selectedSubmission"
      :is-open="isModalOpen"
      :submission="selectedSubmission"
      @close="closeModal"
      @success="handleSuccess"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']

const { getToken } = useAdminAuth()

const submissions = ref<ChurchSubmission[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

const statusFilter = ref<string>('pending')
const searchQuery = ref('')

const selectedSubmission = ref<ChurchSubmission | null>(null)
const isModalOpen = ref(false)

// Watch filters and reload
watch([statusFilter, searchQuery], () => {
  loadSubmissions()
})

// Load on mount
onMounted(() => {
  loadSubmissions()
})

async function loadSubmissions() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    const params = new URLSearchParams()
    if (statusFilter.value) {
      params.append('status', statusFilter.value)
    }
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    const data = await $fetch<{ submissions: ChurchSubmission[] }>(`/api/admin/submissions?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    submissions.value = data.submissions
  }
  catch (error: unknown) {
    const { message } = parseError(error)
    errorMessage.value = message || 'Erro ao carregar submissões'
    console.error('Error loading submissions:', error)
  }
  finally {
    isLoading.value = false
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function extractLocation(address: string): string {
  // Try to extract city and state from address
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim() + ', ' + parts[parts.length - 1].trim()
  }
  return address
}

function openModal(submission: ChurchSubmission) {
  selectedSubmission.value = submission
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  // Don't clear selectedSubmission immediately to avoid flashing during transition
  setTimeout(() => {
    selectedSubmission.value = null
  }, 300)
}

function handleSuccess() {
  loadSubmissions()
}
</script>
