<template>
  <AdminLayout>
    <div>
      <!-- Bulk Submission Detail Modal -->
      <BulkSubmissionDetailModal
        v-if="selectedSubmission"
        :is-open="isDetailModalOpen"
        :submission="selectedSubmission"
        @close="closeDetailModal"
        @success="handleSuccess"
      />

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          Submissões em Lote
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Gerencie submissões de múltiplas igrejas
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              v-model="statusFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pendentes</option>
              <option value="all">Todas</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
            </select>
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma submissão encontrada</h3>
        <p class="mt-1 text-sm text-gray-500">
          Não há submissões em lote {{ statusFilter === 'pending' ? 'pendentes' : '' }} no momento.
        </p>
      </div>

      <!-- Submissions Table -->
      <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Submissão
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {{ submission.id.substring(0, 8) }}...
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(submission.submitted_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <StatusBadge :status="submission.status" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ getChurchCount(submission.bulk_data) }} igrejas
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    @click="openDetailModal(submission)"
                    class="text-blue-600 hover:text-blue-700 transition-colors"
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
  </AdminLayout>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

definePageMeta({
  layout: false,
})

const { getToken } = useAdminAuth()

const submissions = ref<BulkSubmission[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const statusFilter = ref('pending')

// Detail modal state
const isDetailModalOpen = ref(false)
const selectedSubmission = ref<BulkSubmission | null>(null)

// Watch for status filter changes
watch(statusFilter, () => {
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

    const data = await $fetch<{ submissions: BulkSubmission[] }>('/api/admin/submissions/bulk', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: {
        status: statusFilter.value,
      },
    })

    submissions.value = data.submissions
  }
  catch (error: any) {
    errorMessage.value = error.message || 'Erro ao carregar submissões'
    console.error('Error loading bulk submissions:', error)
  }
  finally {
    isLoading.value = false
  }
}

function openDetailModal(submission: BulkSubmission) {
  selectedSubmission.value = submission
  isDetailModalOpen.value = true
}

function closeDetailModal() {
  isDetailModalOpen.value = false
  selectedSubmission.value = null
}

function handleSuccess() {
  // Reload submissions after approval/rejection
  loadSubmissions()
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getChurchCount(bulkData: string): number {
  try {
    const data = JSON.parse(bulkData)
    return Array.isArray(data) ? data.length : 0
  }
  catch {
    return 0
  }
}
</script>
