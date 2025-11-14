<template>
  <BaseModal
    :is-open="isOpen"
    title="Detalhes da Submissão"
    @close="handleClose"
  >
    <template #header>
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

    <!-- Form -->
    <form @submit.prevent="handleSave" class="space-y-6">
                <!-- Nome -->
                <BaseInput
                  v-model="formData.name"
                  label="Nome da Igreja"
                  required
                />

                <!-- Jurisdição -->
                <BaseInput
                  v-model="formData.jurisdiction"
                  label="Jurisdição"
                  required
                />

                <!-- Endereço -->
                <BaseTextarea
                  v-model="formData.address"
                  label="Endereço Completo"
                  :rows="2"
                  required
                />

                <!-- Horários -->
                <BaseTextarea
                  v-model="formData.schedules"
                  label="Horários de Culto"
                  :rows="2"
                  placeholder="Ex: Domingos às 10h, Quartas às 19h30"
                />

                <!-- Descrição -->
                <BaseTextarea
                  v-model="formData.description"
                  label="Descrição"
                  :rows="3"
                />

                <!-- Pastores -->
                <BaseInput
                  v-model="formData.pastors"
                  label="Pastores Responsáveis"
                  placeholder="Ex: Rev. João Silva, Rev. Maria Santos"
                />

                <!-- Email -->
                <BaseInput
                  v-model="formData.responsible_email"
                  label="Email do Responsável"
                  type="email"
                  required
                />

                <!-- Redes Sociais -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BaseInput
                    v-model="formData.website"
                    label="Website"
                    type="url"
                    placeholder="https://..."
                  />
                  <BaseInput
                    v-model="formData.instagram"
                    label="Instagram"
                    type="url"
                    placeholder="https://instagram.com/..."
                  />
                  <BaseInput
                    v-model="formData.youtube"
                    label="YouTube"
                    type="url"
                    placeholder="https://youtube.com/..."
                  />
                  <BaseInput
                    v-model="formData.spotify"
                    label="Spotify"
                    type="url"
                    placeholder="https://spotify.com/..."
                  />
                </div>

                <!-- Review Notes (for rejection) -->
                <BaseTextarea
                  :model-value="submission.review_notes || ''"
                  label="Notas da Revisão"
                  :rows="2"
      />
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

        <div class="flex gap-3 ml-auto">
          <BaseButton
            variant="secondary"
            :disabled="isLoading"
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
            loading-text="Aprovando..."
            @click="handleApprove"
          >
            Aprovar
          </BaseButton>
        </div>
      </div>
    </template>
  </BaseModal>
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
      method: 'PATCH' as any,
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
      method: 'PATCH' as any,
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
      }
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
        review_notes: reason,
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
