interface FeedbackData {
  name: string
  email: string
  message: string
}

export function useChurchFeedback() {
  async function submitFeedback(data: FeedbackData) {
    // Format feedback data to be saved in the bulk_church_submissions table
    // Using a structured format to identify it as feedback
    const formattedData = `TIPO: FEEDBACK DE USUÁRIO
---
Nome: ${data.name}
E-mail: ${data.email}

Mensagem:
${data.message}
---

Data de envio: ${new Date().toLocaleString('pt-BR')}`

    const response = await $fetch('/api/submissions/bulk', {
      method: 'POST',
      body: {
        bulkData: formattedData
      }
    })

    return response
  }

  return {
    submitFeedback
  }
}
