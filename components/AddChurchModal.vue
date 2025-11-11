<script setup lang="ts">
import type { Jurisdiction } from '~/types/church'

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

const jurisdictions: { value: Jurisdiction | 'other'; label: string }[] = [
  { value: 'IAB', label: 'IAB - Igreja Anglicana do Brasil' },
  { value: 'IEAB', label: 'IEAB - Igreja Episcopal Anglicana do Brasil' },
  { value: 'IECB', label: 'IECB - Igreja Episcopal Carismática do Brasil' },
  { value: 'IARB', label: 'IARB - Igreja Anglicana Reformada do Brasil' },
  { value: 'REB', label: 'REB - Rede Evangélica Brasileira' },
  { value: 'other', label: 'Outra (especifique abaixo)' }
]

const formData = ref({
  jurisdiction: '' as Jurisdiction | 'other' | '',
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
const errorMessage = ref('')
const successMessage = ref('')

function resetForm() {
  formData.value = {
    jurisdiction: '',
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
  errorMessage.value = ''
  successMessage.value = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.address || !formData.value.responsibleEmail) {
    errorMessage.value = 'Por favor, preencha todos os campos obrigatórios.'
    return
  }

  if (!formData.value.jurisdiction) {
    errorMessage.value = 'Por favor, selecione uma jurisdição.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const jurisdictionValue = formData.value.jurisdiction === 'other'
      ? formData.value.customJurisdiction
      : formData.value.jurisdiction

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

    successMessage.value = 'Igreja submetida com sucesso! Ela será revisada em breve.'
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 2000)
  } catch (error) {
    console.error('Error submitting church:', error)
    errorMessage.value = 'Erro ao enviar a igreja. Por favor, tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}
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
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h2 id="modal-title" class="text-2xl font-bold text-slate-900">
              Adicionar Igreja
            </h2>
            <button
              type="button"
              @click="handleClose"
              class="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Fechar modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {{ errorMessage }}
            </div>

            <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {{ successMessage }}
            </div>

            <div>
              <label for="jurisdiction" class="block text-sm font-medium text-slate-700 mb-1">
                Jurisdição <span class="text-red-500">*</span>
              </label>
              <select
                id="jurisdiction"
                v-model="formData.jurisdiction"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="" disabled>
                  Selecione uma jurisdição
                </option>
                <option v-for="j in jurisdictions" :key="j.value" :value="j.value">
                  {{ j.label }}
                </option>
              </select>
            </div>

            <div v-if="formData.jurisdiction === 'other'">
              <label for="customJurisdiction" class="block text-sm font-medium text-slate-700 mb-1">
                Nome da Jurisdição <span class="text-red-500">*</span>
              </label>
              <input
                id="customJurisdiction"
                v-model="formData.customJurisdiction"
                type="text"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Digite o nome da jurisdição"
              >
            </div>

            <div>
              <label for="name" class="block text-sm font-medium text-slate-700 mb-1">
                Nome da Igreja <span class="text-red-500">*</span>
              </label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Ex: Igreja Anglicana São Paulo"
              >
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-slate-700 mb-1">
                Endereço Completo <span class="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                v-model="formData.address"
                required
                rows="2"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Rua, número, bairro, cidade, estado, CEP"
              />
            </div>

            <div>
              <label for="schedules" class="block text-sm font-medium text-slate-700 mb-1">
                Horários de Culto
              </label>
              <textarea
                id="schedules"
                v-model="formData.schedules"
                rows="3"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Ex: Domingo às 10h e 18h"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                v-model="formData.description"
                rows="3"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Informações adicionais sobre a igreja"
              />
            </div>

            <div>
              <label for="pastors" class="block text-sm font-medium text-slate-700 mb-1">
                Pastores Responsáveis
              </label>
              <input
                id="pastors"
                v-model="formData.pastors"
                type="text"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="Ex: Rev. João Silva, Rev. Maria Santos"
              >
            </div>

            <div>
              <label for="responsibleEmail" class="block text-sm font-medium text-slate-700 mb-1">
                E-mail do Responsável <span class="text-red-500">*</span>
              </label>
              <input
                id="responsibleEmail"
                v-model="formData.responsibleEmail"
                type="email"
                required
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="email@exemplo.com"
              >
            </div>

            <div class="border-t border-slate-200 pt-4">
              <h3 class="text-lg font-semibold text-slate-900 mb-3">
                Redes Sociais (Opcional)
              </h3>

              <div class="space-y-3">
                <div>
                  <label for="website" class="block text-sm font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  <input
                    id="website"
                    v-model="formData.website"
                    type="url"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="https://exemplo.com"
                  >
                </div>

                <div>
                  <label for="instagram" class="block text-sm font-medium text-slate-700 mb-1">
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    v-model="formData.instagram"
                    type="text"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="@usuario ou https://instagram.com/usuario"
                  >
                </div>

                <div>
                  <label for="youtube" class="block text-sm font-medium text-slate-700 mb-1">
                    YouTube
                  </label>
                  <input
                    id="youtube"
                    v-model="formData.youtube"
                    type="text"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="https://youtube.com/@canal"
                  >
                </div>

                <div>
                  <label for="spotify" class="block text-sm font-medium text-slate-700 mb-1">
                    Spotify
                  </label>
                  <input
                    id="spotify"
                    v-model="formData.spotify"
                    type="text"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="https://open.spotify.com/..."
                  >
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                @click="handleClose"
                class="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSubmitting ? 'Enviando...' : 'Enviar para Revisão' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
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
