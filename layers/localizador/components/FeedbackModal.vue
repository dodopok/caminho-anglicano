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

const { submitFeedback } = useChurchFeedback()

const name = ref('')
const email = ref('')
const message = ref('')
const isSubmitting = ref(false)
const showToast = ref(false)
const toastType = ref<'success' | 'error'>('success')
const toastMessage = ref('')

function resetForm() {
  name.value = ''
  email.value = ''
  message.value = ''
  showToast.value = false
  toastType.value = 'success'
  toastMessage.value = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSubmit() {
  if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, preencha todos os campos.'
    showToast.value = true
    return
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, insira um e-mail válido.'
    showToast.value = true
    return
  }

  isSubmitting.value = true
  showToast.value = false

  try {
    await submitFeedback({
      name: name.value,
      email: email.value,
      message: message.value
    })

    toastType.value = 'success'
    toastMessage.value = 'Feedback enviado com sucesso! Obrigado pela colaboração.'
    showToast.value = true
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 2500)
  } catch (error: any) {
    console.error('Error submitting feedback:', error)
    toastType.value = 'error'
    
    // Check for rate limit error (429)
    if (error?.response?.status === 429 || error?.statusCode === 429) {
      toastMessage.value = 'Você enviou muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.'
    } else {
      toastMessage.value = 'Erro ao enviar feedback. Por favor, tente novamente.'
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
          class="bg-white rounded-lg shadow-xl max-w-md w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          <div class="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
            <h2 id="feedback-modal-title" class="text-xl font-bold text-gray-900">
              Reportar erro ou atualização
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
            <p class="text-sm text-gray-600">
              Encontrou algum erro nas informações de uma igreja ou tem informações atualizadas? Nos avise!
            </p>

            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Seu nome <span class="text-red-500">*</span>
              </label>
              <input
                id="name"
                v-model="name"
                type="text"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Digite seu nome"
              >
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Seu e-mail <span class="text-red-500">*</span>
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="seu@email.com"
              >
            </div>

            <div>
              <label for="message" class="block text-sm font-medium text-gray-700 mb-1">
                Mensagem <span class="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                v-model="message"
                required
                rows="5"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Descreva o erro ou as informações atualizadas..."
              />
              <p class="mt-1 text-xs text-gray-500">
                Seja o mais específico possível sobre qual igreja e qual informação está incorreta ou precisa ser atualizada.
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
                {{ isSubmitting ? 'Enviando...' : 'Enviar Feedback' }}
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
