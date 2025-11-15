import { ref } from 'vue'

// Estados compartilhados do modal de sugestão
const showSuggestionModal = ref(false)
const isSubmitting = ref(false)
const submissionError = ref('')
const suggestion = ref({
  term: '',
  definition: '',
  email: ''
})

// Estados do toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')

export const useTermSuggestion = () => {
  const openSuggestionModal = (initialTerm = '') => {
    suggestion.value = {
      term: initialTerm,
      definition: '',
      email: ''
    }
    submissionError.value = ''
    showSuggestionModal.value = true
  }

  const closeSuggestionModal = () => {
    showSuggestionModal.value = false
    suggestion.value = {
      term: '',
      definition: '',
      email: ''
    }
    submissionError.value = ''
  }

  const displayToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toastMessage.value = message
    toastType.value = type
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 3000)
  }

  const submitSuggestion = async () => {
    if (!suggestion.value.term) return

    isSubmitting.value = true
    submissionError.value = ''

    try {
      // Formatar dados como string para o campo bulk_data
      const bulkDataString = `SUGESTÃO DE TERMO PARA O GLOSSÁRIO
Termo: ${suggestion.value.term}
${suggestion.value.definition ? `Definição sugerida: ${suggestion.value.definition}` : 'Sem definição sugerida'}
${suggestion.value.email ? `Email: ${suggestion.value.email}` : 'Email não fornecido'}
Data: ${new Date().toLocaleString('pt-BR')}`

      await $fetch('/api/submissions/bulk', {
        method: 'POST',
        body: {
          bulkData: bulkDataString
        }
      })

      closeSuggestionModal()
      displayToast('Sugestão enviada com sucesso! Obrigado pela contribuição.', 'success')
    } catch (err) {
      console.error('Erro ao enviar sugestão:', err)
      submissionError.value = 'Erro ao enviar sugestão. Tente novamente.'
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    // Estados
    showSuggestionModal,
    isSubmitting,
    submissionError,
    suggestion,
    showToast,
    toastMessage,
    toastType,

    // Métodos
    openSuggestionModal,
    closeSuggestionModal,
    displayToast,
    submitSuggestion
  }
}
