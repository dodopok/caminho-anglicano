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
const errorMessage = ref('')
const successMessage = ref('')

function resetForm() {
  name.value = ''
  email.value = ''
  message.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSubmit() {
  if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
    errorMessage.value = 'Por favor, preencha todos os campos.'
    return
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    errorMessage.value = 'Por favor, insira um e-mail válido.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await submitFeedback({
      name: name.value,
      email: email.value,
      message: message.value
    })

    successMessage.value = 'Feedback enviado com sucesso! Obrigado pela colaboração.'
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 2000)
  } catch (error) {
    console.error('Error submitting feedback:', error)
    errorMessage.value = 'Erro ao enviar feedback. Por favor, tente novamente.'
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
            <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {{ errorMessage }}
            </div>

            <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              {{ successMessage }}
            </div>

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
