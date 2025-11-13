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
          <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">
                    Detalhes da Submissão
                  </h2>
                  <div class="mt-1">
                    <StatusBadge :status="submission.status" />
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

              <!-- Form -->
              <form @submit.prevent="handleSave" class="space-y-6">
                <!-- Nome -->
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Igreja *
                  </label>
                  <input
                    id="name"
                    v-model="formData.name"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>

                <!-- Jurisdição -->
                <div>
                  <label for="jurisdiction" class="block text-sm font-medium text-gray-700 mb-1">
                    Jurisdição *
                  </label>
                  <input
                    id="jurisdiction"
                    v-model="formData.jurisdiction"
                    type="text"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>

                <!-- Endereço -->
                <div>
                  <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
                    Endereço Completo *
                  </label>
                  <textarea
                    id="address"
                    v-model="formData.address"
                    rows="2"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- Horários -->
                <div>
                  <label for="schedules" class="block text-sm font-medium text-gray-700 mb-1">
                    Horários de Culto
                  </label>
                  <textarea
                    id="schedules"
                    v-model="formData.schedules"
                    rows="2"
                    placeholder="Ex: Domingos às 10h, Quartas às 19h30"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- Descrição -->
                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    v-model="formData.description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <!-- Pastores -->
                <div>
                  <label for="pastors" class="block text-sm font-medium text-gray-700 mb-1">
                    Pastores Responsáveis
                  </label>
                  <input
                    id="pastors"
                    v-model="formData.pastors"
                    type="text"
                    placeholder="Ex: Rev. João Silva, Rev. Maria Santos"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>

                <!-- Email -->
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                    Email do Responsável *
                  </label>
                  <input
                    id="email"
                    v-model="formData.responsible_email"
                    type="email"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                </div>

                <!-- Redes Sociais -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="website" class="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      id="website"
                      v-model="formData.website"
                      type="url"
                      placeholder="https://..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>

                  <div>
                    <label for="instagram" class="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      id="instagram"
                      v-model="formData.instagram"
                      type="url"
                      placeholder="https://instagram.com/..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>

                  <div>
                    <label for="youtube" class="block text-sm font-medium text-gray-700 mb-1">
                      YouTube
                    </label>
                    <input
                      id="youtube"
                      v-model="formData.youtube"
                      type="url"
                      placeholder="https://youtube.com/..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>

                  <div>
                    <label for="spotify" class="block text-sm font-medium text-gray-700 mb-1">
                      Spotify
                    </label>
                    <input
                      id="spotify"
                      v-model="formData.spotify"
                      type="url"
                      placeholder="https://spotify.com/..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                </div>

                <!-- Review Notes (for rejection) -->
                <div v-if="submission.status !== 'pending'">
                  <label for="review-notes" class="block text-sm font-medium text-gray-700 mb-1">
                    Notas da Revisão
                  </label>
                  <textarea
                    id="review-notes"
                    :value="submission.review_notes"
                    rows="2"
                    disabled
                    class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                </div>
              </form>

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

              <div class="flex gap-3 ml-auto">
                <button
                  type="button"
                  @click="handleClose"
                  :disabled="isLoading"
                  class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  {{ isLoading ? 'Aprovando...' : 'Aprovar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']

interface Props {
  isOpen: boolean
  submission: ChurchSubmission
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { getToken } = useAdminAuth()

const formData = ref({
  name: '',
  jurisdiction: '',
  address: '',
  schedules: '',
  description: '',
  pastors: '',
  responsible_email: '',
  website: '',
  instagram: '',
  youtube: '',
  spotify: '',
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Watch for submission changes to update form
watch(() => props.submission, (newSubmission) => {
  if (newSubmission) {
    formData.value = {
      name: newSubmission.name,
      jurisdiction: newSubmission.jurisdiction,
      address: newSubmission.address,
      schedules: newSubmission.schedules || '',
      description: newSubmission.description || '',
      pastors: newSubmission.pastors || '',
      responsible_email: newSubmission.responsible_email,
      website: newSubmission.website || '',
      instagram: newSubmission.instagram || '',
      youtube: newSubmission.youtube || '',
      spotify: newSubmission.spotify || '',
    }
  }
}, { immediate: true })

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

function handleClose() {
  errorMessage.value = ''
  successMessage.value = ''
  emit('close')
}

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/submissions/${props.submission.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData.value,
    })

    successMessage.value = 'Alterações salvas com sucesso!'
    setTimeout(() => {
      emit('success')
    }, 1000)
  }
  catch (error: any) {
    errorMessage.value = error.message || 'Erro ao salvar alterações'
  }
  finally {
    isLoading.value = false
  }
}

async function handleApprove() {
  if (!confirm('Tem certeza que deseja aprovar esta submissão? Isso criará uma nova igreja no sistema.')) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // Save any changes first
    await $fetch(`/api/admin/submissions/${props.submission.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData.value,
    })

    // Then approve
    await $fetch(`/api/admin/submissions/${props.submission.id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    successMessage.value = 'Submissão aprovada e igreja criada com sucesso!'
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 1500)
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || error.message || 'Erro ao aprovar submissão'
  }
  finally {
    isLoading.value = false
  }
}

async function handleReject() {
  const reason = prompt('Por favor, informe o motivo da rejeição:')

  if (!reason) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/submissions/${props.submission.id}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        reviewNotes: reason,
      },
    })

    successMessage.value = 'Submissão rejeitada com sucesso!'
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 1500)
  }
  catch (error: any) {
    errorMessage.value = error.message || 'Erro ao rejeitar submissão'
  }
  finally {
    isLoading.value = false
  }
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
</style>
