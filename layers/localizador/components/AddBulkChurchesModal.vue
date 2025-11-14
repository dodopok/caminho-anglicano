<script setup lang="ts">
interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { submitBulkChurches } = useSubmissions()

const bulkData = ref('')
const isSubmitting = ref(false)
const showToast = ref(false)
const toastType = ref<'success' | 'error'>('success')
const toastMessage = ref('')

const exampleText = `Exemplo de formato:

---
Jurisdição: IAB
Nome: Igreja Anglicana São Paulo
Endereço: Rua Exemplo, 123, Centro, São Paulo, SP, 01000-000
Horários: Domingo às 10h e 18h
Descrição: Igreja tradicional no centro de São Paulo
Pastores: Rev. João Silva
E-mail: contato@igrejasp.com.br
Site: https://igrejasp.com.br
Instagram: @igrejasp
---

Jurisdição: IEAB
Nome: Igreja Episcopal Rio de Janeiro
Endereço: Av. Exemplo, 456, Copacabana, Rio de Janeiro, RJ, 22000-000
Horários: Domingo às 9h
E-mail: contato@igrejarj.com.br
---`

function resetForm() {
  bulkData.value = ''
  showToast.value = false
  toastType.value = 'success'
  toastMessage.value = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSubmit() {
  if (!bulkData.value.trim()) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, insira os dados das igrejas.'
    showToast.value = true
    return
  }

  isSubmitting.value = true
  showToast.value = false

  try {
    await submitBulkChurches(bulkData.value)

    toastType.value = 'success'
    toastMessage.value = 'Igrejas submetidas com sucesso! Elas serão revisadas em breve.'
    showToast.value = true
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 2500)
  } catch (error: any) {
    console.error('Error submitting bulk churches:', error)
    toastType.value = 'error'
    
    // Check for rate limit error (429)
    if (error?.response?.status === 429 || error?.statusCode === 429) {
      toastMessage.value = 'Você enviou muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.'
    } else {
      toastMessage.value = 'Erro ao enviar as igrejas. Por favor, tente novamente.'
    }
    
    showToast.value = true
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
          class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
        >
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 id="bulk-modal-title" class="text-xl font-bold text-gray-900">
              Adicionar Várias Igrejas
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
            <div class="bg-gray-50 border border-gray-200 rounded p-4">
              <h3 class="text-base font-semibold text-gray-900 mb-2">
                Instruções
              </h3>
              <p class="text-sm text-gray-600 mb-3">
                Cole abaixo as informações de múltiplas igrejas. Separe cada igreja com três traços (---).
                Você pode usar o formato livre, mas tente incluir as informações principais de cada igreja.
              </p>
              <details class="text-sm">
                <summary class="cursor-pointer text-gray-700 font-medium hover:text-gray-900">
                  Ver exemplo de formato
                </summary>
                <pre class="mt-2 text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto">{{ exampleText }}</pre>
              </details>
            </div>

            <div>
              <label for="bulkData" class="block text-sm font-medium text-gray-700 mb-1">
                Dados das Igrejas <span class="text-red-500">*</span>
              </label>
              <textarea
                id="bulkData"
                v-model="bulkData"
                required
                rows="15"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                placeholder="Cole aqui os dados das igrejas..."
              />
              <p class="mt-1 text-xs text-gray-500">
                Dica: Quanto mais informações você fornecer, mais fácil será para aprovar as igrejas.
              </p>
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
