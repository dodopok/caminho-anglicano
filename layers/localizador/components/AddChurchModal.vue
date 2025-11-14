<script setup lang="ts">
import type { Jurisdiction } from '../types/church'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { submitChurch } = useSubmissions()
const { fetchJurisdictions } = useJurisdictions()

const jurisdictions = ref<Jurisdiction[]>([])
const isLoadingJurisdictions = ref(false)

const formData = ref({
  jurisdictionId: '',
  customJurisdiction: '',
  name: '',
  address: '',
  schedules: '',
  description: '',
  pastors: '',
  responsibleEmail: '',
  website: '',
  instagram: '',
  youtube: '',
  spotify: ''
})

const isSubmitting = ref(false)
const showToast = ref(false)
const toastType = ref<'success' | 'error'>('success')
const toastMessage = ref('')

async function loadJurisdictions() {
  isLoadingJurisdictions.value = true
  try {
    jurisdictions.value = await fetchJurisdictions()
  } catch (error) {
    console.error('Error loading jurisdictions:', error)
  } finally {
    isLoadingJurisdictions.value = false
  }
}

function resetForm() {
  formData.value = {
    jurisdictionId: '',
    customJurisdiction: '',
    name: '',
    address: '',
    schedules: '',
    description: '',
    pastors: '',
    responsibleEmail: '',
    website: '',
    instagram: '',
    youtube: '',
    spotify: ''
  }
  showToast.value = false
  toastType.value = 'success'
  toastMessage.value = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.address || !formData.value.responsibleEmail) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, preencha todos os campos obrigatórios.'
    showToast.value = true
    return
  }

  if (!formData.value.jurisdictionId && !formData.value.customJurisdiction) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, selecione uma jurisdição.'
    showToast.value = true
    return
  }

  isSubmitting.value = true
  showToast.value = false

  try {
    const jurisdictionValue = formData.value.jurisdictionId === 'other'
      ? formData.value.customJurisdiction
      : jurisdictions.value.find(j => j.id === formData.value.jurisdictionId)?.name || ''

    await submitChurch({
      jurisdiction: jurisdictionValue,
      name: formData.value.name,
      address: formData.value.address,
      schedules: formData.value.schedules,
      description: formData.value.description,
      pastors: formData.value.pastors,
      responsibleEmail: formData.value.responsibleEmail,
      website: formData.value.website,
      instagram: formData.value.instagram,
      youtube: formData.value.youtube,
      spotify: formData.value.spotify
    })

    toastType.value = 'success'
    toastMessage.value = 'Igreja submetida com sucesso! Ela será revisada em breve.'
    showToast.value = true
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 2500)
  } catch (error: any) {
    console.error('Error submitting church:', error)
    toastType.value = 'error'
    
    // Check for rate limit error (429)
    if (error?.response?.status === 429 || error?.statusCode === 429) {
      toastMessage.value = 'Você enviou muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.'
    } else {
      toastMessage.value = 'Erro ao enviar a igreja. Por favor, tente novamente.'
    }
    
    showToast.value = true
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && jurisdictions.value.length === 0) {
    loadJurisdictions()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click.self="handleClose"
      >
        <div
          class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 id="modal-title" class="text-xl font-bold text-gray-900">
              Adicionar Igreja
            </h2>
            <button
              type="button"
              @click="handleClose"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <div>
              <label for="jurisdiction" class="block text-sm font-medium text-gray-700 mb-1">
                Jurisdição <span class="text-red-500">*</span>
              </label>
              <select
                id="jurisdiction"
                v-model="formData.jurisdictionId"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                :disabled="isLoadingJurisdictions"
              >
                <option value="" disabled>
                  {{ isLoadingJurisdictions ? 'Carregando...' : 'Selecione uma jurisdição' }}
                </option>
                <option v-for="j in jurisdictions" :key="j.id" :value="j.id">
                  {{ j.name }} - {{ j.fullName }}
                </option>
                <option value="other">
                  Outra (especifique abaixo)
                </option>
              </select>
            </div>

            <div v-if="formData.jurisdictionId === 'other'">
              <label for="customJurisdiction" class="block text-sm font-medium text-gray-700 mb-1">
                Nome da Jurisdição <span class="text-red-500">*</span>
              </label>
              <input
                id="customJurisdiction"
                v-model="formData.customJurisdiction"
                type="text"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Digite o nome da jurisdição"
              >
            </div>

            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Nome da Igreja <span class="text-red-500">*</span>
              </label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Ex: Igreja Anglicana São Paulo"
              >
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
                Endereço Completo <span class="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                v-model="formData.address"
                required
                rows="2"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Rua, número, bairro, cidade, estado, CEP"
              />
            </div>

            <div>
              <label for="schedules" class="block text-sm font-medium text-gray-700 mb-1">
                Horários de Culto
              </label>
              <textarea
                id="schedules"
                v-model="formData.schedules"
                rows="3"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Ex: Domingo às 10h e 18h"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                v-model="formData.description"
                rows="3"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Informações adicionais sobre a igreja"
              />
            </div>

            <div>
              <label for="pastors" class="block text-sm font-medium text-gray-700 mb-1">
                Pastores Responsáveis
              </label>
              <input
                id="pastors"
                v-model="formData.pastors"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Ex: Rev. João Silva, Rev. Maria Santos"
              >
            </div>

            <div>
              <label for="responsibleEmail" class="block text-sm font-medium text-gray-700 mb-1">
                E-mail do Responsável <span class="text-red-500">*</span>
              </label>
              <input
                id="responsibleEmail"
                v-model="formData.responsibleEmail"
                type="email"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                placeholder="email@exemplo.com"
              >
            </div>

            <div class="border-t border-gray-200 pt-4">
              <h3 class="text-base font-semibold text-gray-900 mb-3">
                Redes Sociais (Opcional)
              </h3>

              <div class="space-y-3">
                <div>
                  <label for="website" class="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    id="website"
                    v-model="formData.website"
                    type="url"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="https://exemplo.com"
                  >
                </div>

                <div>
                  <label for="instagram" class="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    v-model="formData.instagram"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="@usuario ou https://instagram.com/usuario"
                  >
                </div>

                <div>
                  <label for="youtube" class="block text-sm font-medium text-gray-700 mb-1">
                    YouTube
                  </label>
                  <input
                    id="youtube"
                    v-model="formData.youtube"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="https://youtube.com/@canal"
                  >
                </div>

                <div>
                  <label for="spotify" class="block text-sm font-medium text-gray-700 mb-1">
                    Spotify
                  </label>
                  <input
                    id="spotify"
                    v-model="formData.spotify"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="https://open.spotify.com/..."
                  >
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="handleClose"
                class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSubmitting ? 'Enviando...' : 'Enviar para Revisão' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <BaseToast
    :show="showToast"
    :type="toastType"
    :message="toastMessage"
    @close="showToast = false"
  />
</template>

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
