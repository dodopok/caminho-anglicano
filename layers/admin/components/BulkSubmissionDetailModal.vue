<template>
  <BaseModal
    :is-open="isOpen"
    title="Detalhes da Submissão em Lote"
    max-width="7xl"
    @close="handleClose"
  >
    <template #header>
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
    </template>

    <!-- Error/Success Messages -->
    <BaseAlert
      v-model="showErrorMessage"
      type="error"
      :message="errorMessage"
    />

    <BaseAlert
      v-model="showSuccessMessage"
      type="success"
      :message="successMessage"
    />

    <!-- Parse Error -->
    <BaseAlert
      v-if="parseError"
      :model-value="true"
      type="error"
      title="Erro ao processar dados"
      :message="parseError"
    />

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
                    <BaseInput
                      :id="`name-${index}`"
                      v-model="church.name"
                      label="Nome"
                      :disabled="submission.status !== 'pending'"
                      required
                    />

                    <!-- Jurisdição -->
                    <BaseInput
                      :id="`jurisdiction-${index}`"
                      v-model="church.jurisdiction"
                      label="Jurisdição"
                      :disabled="submission.status !== 'pending'"
                      required
                    />

                    <!-- Email -->
                    <BaseInput
                      :id="`email-${index}`"
                      v-model="church.responsible_email"
                      label="Email"
                      type="email"
                      :disabled="submission.status !== 'pending'"
                      required
                    />

                    <!-- Endereço (full width) -->
                    <div class="md:col-span-2 lg:col-span-3">
                      <BaseTextarea
                        :id="`address-${index}`"
                        v-model="church.address"
                        label="Endereço"
                        :rows="2"
                        :disabled="submission.status !== 'pending'"
                        required
                      />
                    </div>

                    <!-- Horários -->
                    <BaseInput
                      :id="`schedules-${index}`"
                      v-model="church.schedules"
                      label="Horários"
                      :disabled="submission.status !== 'pending'"
                    />

                    <!-- Pastores -->
                    <BaseInput
                      :id="`pastors-${index}`"
                      v-model="church.pastors"
                      label="Pastores"
                      :disabled="submission.status !== 'pending'"
                    />

                    <!-- Website -->
                    <BaseInput
                      :id="`website-${index}`"
                      v-model="church.website"
                      label="Website"
                      type="url"
                      :disabled="submission.status !== 'pending'"
                    />

          <!-- Descrição (full width) -->
          <div class="md:col-span-2 lg:col-span-3">
            <BaseTextarea
              :id="`description-${index}`"
              v-model="church.description"
              label="Descrição"
              :rows="2"
              :disabled="submission.status !== 'pending'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Review Notes (for processed submissions) -->
    <div v-if="submission.status !== 'pending' && submission.review_notes" class="mt-6 pt-6 border-t border-gray-200">
      <BaseTextarea
        :model-value="submission.review_notes"
        label="Notas da Revisão"
        :rows="3"
        disabled
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

    <template #footer>
      <div class="flex justify-between w-full gap-3">
        <BaseButton
          v-if="submission.status === 'pending'"
          variant="danger"
          :loading="isLoading"
          @click="handleReject"
        >
          Rejeitar
        </BaseButton>

        <div class="flex-1" />

        <BaseButton
          variant="secondary"
          @click="handleClose"
        >
          Cancelar
        </BaseButton>

        <BaseButton
          v-if="submission.status === 'pending'"
          variant="primary"
          :loading="isLoading"
          @click="handleSave"
        >
          Salvar Alterações
        </BaseButton>

        <BaseButton
          v-if="submission.status === 'pending'"
          variant="success"
          :loading="isLoading"
          @click="handleApprove"
        >
          Aprovar e Criar Igrejas
        </BaseButton>
      </div>
    </template>
  </BaseModal>
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

// Computed for alert visibility
const showErrorMessage = computed({
  get: () => !!errorMessage.value,
  set: (value: boolean) => {
    if (!value) errorMessage.value = ''
  },
})

const showSuccessMessage = computed({
  get: () => !!successMessage.value,
  set: (value: boolean) => {
    if (!value) successMessage.value = ''
  },
})

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
        review_notes: reason,
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
