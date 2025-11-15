<template>
  <AdminLayout>
    <div>
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Visão geral do sistema de submissões
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="bg-white rounded-lg shadow-sm p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div class="h-8 bg-gray-200 rounded w-3/4" />
        </div>
      </div>

      <!-- Stats Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Pending Submissions -->
        <div class="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-yellow-100 text-sm font-medium">
                Submissões Pendentes
              </p>
              <p class="text-3xl font-bold mt-2">
                {{ stats.pendingCount }}
              </p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-full p-3">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <NuxtLink
              to="/portal-do-douglas/submissions?status=pending"
              class="text-sm text-yellow-100 hover:text-white transition-colors"
            >
              Ver todas →
            </NuxtLink>
          </div>
        </div>

        <!-- Approved This Week -->
        <div class="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm font-medium">
                Aprovadas (7 dias)
              </p>
              <p class="text-3xl font-bold mt-2">
                {{ stats.approvedThisWeek }}
              </p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-full p-3">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Rejected This Week -->
        <div class="bg-gradient-to-br from-red-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-100 text-sm font-medium">
                Rejeitadas (7 dias)
              </p>
              <p class="text-3xl font-bold mt-2">
                {{ stats.rejectedThisWeek }}
              </p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-full p-3">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Churches -->
        <div class="bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm font-medium">
                Total de Igrejas
              </p>
              <p class="text-3xl font-bold mt-2">
                {{ stats.totalChurches }}
              </p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-full p-3">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div class="mt-4">
            <NuxtLink
              to="/portal-do-douglas/churches"
              class="text-sm text-blue-100 hover:text-white transition-colors"
            >
              Ver todas →
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Recent Submissions -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              Submissões Recentes
            </h2>
            <NuxtLink
              to="/portal-do-douglas/submissions"
              class="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver todas
            </NuxtLink>
          </div>
        </div>

        <div v-if="isLoading" class="p-6">
          <div class="animate-pulse space-y-4">
            <div v-for="i in 5" :key="i" class="h-12 bg-gray-200 rounded" />
          </div>
        </div>

        <div v-else-if="!stats.recentSubmissions || stats.recentSubmissions.length === 0" class="p-12 text-center">
          <p class="text-gray-500">Nenhuma submissão recente</p>
        </div>

        <div v-else class="overflow-x-auto">
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
                  Data
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="submission in stats.recentSubmissions"
                :key="submission.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ submission.name }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ submission.jurisdiction }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(submission.submitted_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <StatusBadge :status="submission.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']

const { getToken } = useAdminAuth()

interface Stats {
  pendingCount: number
  approvedThisWeek: number
  rejectedThisWeek: number
  totalChurches: number
  recentSubmissions: ChurchSubmission[]
}

const stats = ref<Stats>({
  pendingCount: 0,
  approvedThisWeek: 0,
  rejectedThisWeek: 0,
  totalChurches: 0,
  recentSubmissions: [],
})

const isLoading = ref(false)

onMounted(() => {
  loadStats()
})

async function loadStats() {
  isLoading.value = true

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    const data = await $fetch<Stats>('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    stats.value = data
  }
  catch (error: unknown) {
    console.error('Error loading stats:', error)
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
</script>
