<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            @click="handleClose"
          />

          <!-- Modal Content -->
          <div class="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">
                    Detalhes da Submissão em Lote
                  </h2>
                  <div class="mt-1 flex items-center gap-3">
                    <StatusBadge :status="submission.status" />
                    <span class="text-sm text-gray-600">
                      {{ churches.length }} igreja{{ churches.length === 1 ? '' : 's' }}
                    </span>
                  </div>
                </div>
                <button
                  @click="handleClose"
                  class="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <span class="sr-only">Fechar</span>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Body (Scrollable) -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <!-- Error/Success Messages -->
              <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>

              <div v-if="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p class="text-sm text-green-800">{{ successMessage }}</p>
              </div>

              <!-- Parse Error -->
              <div v-if="parseError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm font-medium text-red-800">Erro ao processar dados:</p>
                <p class="text-sm text-red-700 mt-1">{{ parseError }}</p>
              </div>

              <!-- Churches List -->
              <div v-if="!parseError" class="space-y-6">
                <div
                  v-for="(church, index) in churches"
                  :key="index"
                  class="border border-gray-200 rounded-lg p-4"
                >
                  <!-- Church Header -->
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                      Igreja #{{ index + 1 }}
                    </h3>
                    <button
                      v-if="submission.status === 'pending'"
                      @click="removeChurch(index)"
                      class="text-red-600 hover:text-red-700 text-sm transition-colors"
                    >
                      Remover
                    </button>
                  </div>

                  <!-- Church Fields -->
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Nome -->
                    <div>
                      <label :for="`name-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Nome *
                      </label>
                      <input
                        :id="`name-${index}`"
                        v-model="church.name"
                        type="text"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Jurisdição -->
                    <div>
                      <label :for="`jurisdiction-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Jurisdição *
                      </label>
                      <input
                        :id="`jurisdiction-${index}`"
                        v-model="church.jurisdiction"
                        type="text"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Email -->
                    <div>
                      <label :for="`email-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        :id="`email-${index}`"
                        v-model="church.responsible_email"
                        type="email"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Endereço (full width) -->
                    <div class="md:col-span-2 lg:col-span-3">
                      <label :for="`address-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Endereço *
                      </label>
                      <textarea
                        :id="`address-${index}`"
                        v-model="church.address"
                        rows="2"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <!-- Horários -->
                    <div>
                      <label :for="`schedules-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Horários
                      </label>
                      <input
                        :id="`schedules-${index}`"
                        v-model="church.schedules"
                        type="text"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Pastores -->
                    <div>
                      <label :for="`pastors-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Pastores
                      </label>
                      <input
                        :id="`pastors-${index}`"
                        v-model="church.pastors"
                        type="text"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Website -->
                    <div>
                      <label :for="`website-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        :id="`website-${index}`"
                        v-model="church.website"
                        type="url"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                    </div>

                    <!-- Descrição (full width) -->
                    <div class="md:col-span-2 lg:col-span-3">
                      <label :for="`description-${index}`" class="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        :id="`description-${index}`"
                        v-model="church.description"
                        rows="2"
                        :disabled="submission.status !== 'pending'"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Review Notes (for processed submissions) -->
              <div v-if="submission.status !== 'pending' && submission.review_notes" class="mt-6 pt-6 border-t border-gray-200">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Notas da Revisão
                </label>
                <textarea
                  :value="submission.review_notes"
                  rows="3"
                  disabled
                  class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
              </div>

              <!-- Metadata -->
              <div class="mt-6 pt-6 border-t border-gray-200">
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt class="font-medium text-gray-500">Data da Submissão</dt>
                    <dd class="mt-1 text-gray-900">
                      {{ formatDate(submission.submitted_at) }}
                    </dd>
                  </div>
                  <div v-if="submission.reviewed_at">
                    <dt class="font-medium text-gray-500">Data da Revisão</dt>
                    <dd class="mt-1 text-gray-900">
                      {{ formatDate(submission.reviewed_at) }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-between gap-3">
              <button
                v-if="submission.status === 'pending'"
                type="button"
                @click="handleReject"
                :disabled="isLoading"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rejeitar
              </button>

              <div class="flex-1" />

              <button
                type="button"
                @click="handleClose"
                class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Cancelar
              </button>

              <button
                v-if="submission.status === 'pending'"
                type="button"
                @click="handleSave"
                :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Alterações
              </button>

              <button
                v-if="submission.status === 'pending'"
                type="button"
                @click="handleApprove"
                :disabled="isLoading"
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aprovar e Criar Igrejas
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

interface BulkChurchData {
  name: string
  jurisdiction: string
  address: string
  schedules?: string
  description?: string
  pastors?: string
  responsible_email: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
}

interface Props {
  isOpen: boolean
  submission: BulkSubmission
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

const { getToken } = useAdminAuth()

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const parseError = ref('')

const churches = ref<BulkChurchData[]>([])

// Watch for submission changes and parse bulk_data
watch(() => props.submission, (newSubmission) => {
  if (newSubmission) {
    parseBulkData(newSubmission.bulk_data)
  }
}, { immediate: true })

function parseBulkData(bulkData: string) {
  parseError.value = ''
  churches.value = []

  try {
    const data = JSON.parse(bulkData)

    if (!Array.isArray(data)) {
      parseError.value = 'Os dados devem ser um array de igrejas'
      return
    }

    churches.value = data.map(church => ({
      name: church.name || '',
      jurisdiction: church.jurisdiction || '',
      address: church.address || '',
      schedules: church.schedules || '',
      description: church.description || '',
      pastors: church.pastors || '',
      responsible_email: church.responsible_email || '',
      website: church.website || '',
      instagram: church.instagram || '',
      youtube: church.youtube || '',
      spotify: church.spotify || '',
    }))
  }
  catch (error: any) {
    parseError.value = `Erro ao fazer parse do JSON: ${error.message}`
  }
}

function removeChurch(index: number) {
  if (confirm('Tem certeza que deseja remover esta igreja da lista?')) {
    churches.value.splice(index, 1)
  }
}

async function handleSave() {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // Validate all churches have required fields
    for (let i = 0; i < churches.value.length; i++) {
      const church = churches.value[i]
      if (!church.name || !church.address || !church.responsible_email || !church.jurisdiction) {
        throw new Error(`Igreja #${i + 1} está com campos obrigatórios vazios`)
      }
    }

    const bulkData = JSON.stringify(churches.value)

    await $fetch(`/api/admin/submissions/bulk/${props.submission.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        bulk_data: bulkData,
      },
    })

    successMessage.value = 'Alterações salvas com sucesso!'
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || error.message || 'Erro ao salvar alterações'
    console.error('Error saving bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleApprove() {
  const confirmed = confirm(
    `Tem certeza que deseja aprovar esta submissão?\n\nIsso criará ${churches.value.length} igreja${churches.value.length === 1 ? '' : 's'} no sistema.`,
  )

  if (!confirmed) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // First save any pending changes
    await handleSave()

    // Then approve
    const result = await $fetch<{ success: boolean, insertedCount: number, totalCount: number, errors?: string[], message: string }>(
      `/api/admin/submissions/bulk/${props.submission.id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (result.errors && result.errors.length > 0) {
      alert(`Aprovado com avisos:\n\n${result.message}\n\nErros:\n${result.errors.join('\n')}`)
    }
    else {
      alert(result.message)
    }

    emit('success')
    emit('close')
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || error.message || 'Erro ao aprovar submissão'
    console.error('Error approving bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleReject() {
  const reason = prompt('Por que você está rejeitando esta submissão em lote?')

  if (!reason || reason.trim() === '') {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/submissions/bulk/${props.submission.id}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        reviewNotes: reason,
      },
    })

    emit('success')
    emit('close')
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || error.message || 'Erro ao rejeitar submissão'
    console.error('Error rejecting bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

function handleClose() {
  if (!isLoading.value) {
    emit('close')
  }
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
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
