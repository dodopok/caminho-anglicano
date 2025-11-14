/**
 * Tipos de notificação suportados pelo bot do Telegram
 */
type NotificationType = 'church_submission' | 'bulk_submission'

/**
 * Interface para os dados de submissão de igreja
 */
interface ChurchSubmissionData {
  id: string
  name: string
  city?: string
  state?: string
  email?: string
  phone?: string
  contact_name?: string
  created_at?: string
}

/**
 * Interface para os dados de submissão bulk
 */
interface BulkSubmissionData {
  id: string
  bulk_data: string
  created_at?: string
}

/**
 * Envia uma notificação para o Telegram quando há uma nova submissão
 * Usa a API HTTP do Telegram diretamente para melhor compatibilidade com serverless
 *
 * @param type - Tipo da notificação (church_submission ou bulk_submission)
 * @param data - Dados da submissão
 */
export async function sendTelegramNotification(
  type: NotificationType,
  data: ChurchSubmissionData | BulkSubmissionData
): Promise<void> {
  const config = useRuntimeConfig()

  // Verifica se as credenciais do Telegram estão configuradas
  const botToken = config.telegramBotToken
  const chatId = config.telegramChatId

  if (!botToken || !chatId) {
    console.warn('⚠️  Telegram bot token ou chat ID não configurados. Notificação não enviada.')
    return
  }

  try {
    // Formata a mensagem de acordo com o tipo
    const message = formatMessage(type, data)

    // Envia a mensagem usando a API HTTP do Telegram
    // Usa fetch() nativo (Node.js 18+) para máxima compatibilidade com serverless
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Telegram API error (${response.status}): ${errorText}`)
    }

    console.log(`✅ Notificação do Telegram enviada: ${type}`)
  } catch (error) {
    // Não falha o request principal se houver erro ao enviar notificação
    console.error('❌ Erro ao enviar notificação do Telegram:', error)
  }
}

/**
 * Formata a mensagem de acordo com o tipo de notificação
 */
function formatMessage(
  type: NotificationType,
  data: ChurchSubmissionData | BulkSubmissionData
): string {
  const timestamp = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  })

  if (type === 'church_submission') {
    const churchData = data as ChurchSubmissionData

    return `
🏛️ <b>Nova Submissão de Igreja!</b>

📝 <b>Nome:</b> ${churchData.name}
📍 <b>Localização:</b> ${churchData.city || 'N/A'}, ${churchData.state || 'N/A'}

👤 <b>Contato:</b>
   • Nome: ${churchData.contact_name || 'N/A'}
   • Email: ${churchData.email || 'N/A'}
   • Telefone: ${churchData.phone || 'N/A'}

🆔 <b>ID:</b> ${churchData.id}
🕐 <b>Data/Hora:</b> ${timestamp}

<i>Acesse o painel admin para revisar e aprovar.</i>
    `.trim()
  }

  if (type === 'bulk_submission') {
    const bulkData = data as BulkSubmissionData
    const preview = bulkData.bulk_data.substring(0, 100) + '...'

    return `
📦 <b>Nova Submissão BULK!</b>

👀 <b>Preview:</b>
${preview}

🆔 <b>ID:</b> ${bulkData.id}
🕐 <b>Data/Hora:</b> ${timestamp}

<i>Acesse o painel admin para revisar e processar.</i>
    `.trim()
  }

  return 'Notificação desconhecida'
}
