/**
 * Integration with Evolution API for WhatsApp messaging
 * Docs: https://doc.evolution-api.com/
 */

interface EvolutionAPIConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

interface SendMessageParams {
  number: string // Format: 5511999999999 (country code + area code + number)
  message: string
}

interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a text message via Evolution API
 */
export async function sendWhatsAppMessage(
  config: EvolutionAPIConfig,
  params: SendMessageParams
): Promise<SendMessageResponse> {
  try {
    const { apiUrl, apiKey, instanceName } = config
    const { number, message } = params

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanNumber = number.replace(/[^\d]/g, '')

    // Ensure it starts with country code
    const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`

    const url = `${apiUrl}/message/sendText/${instanceName}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      messageId: data.key?.id
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send messages to multiple recipients
 */
export async function sendWhatsAppBulk(
  config: EvolutionAPIConfig,
  messages: Array<{ number: string; message: string }>
): Promise<Array<SendMessageResponse & { number: string }>> {
  const results = await Promise.allSettled(
    messages.map(async (msg) => {
      const result = await sendWhatsAppMessage(config, msg)
      return { ...result, number: msg.number }
    })
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      success: false,
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      number: messages[index].number
    }
  })
}

/**
 * Check if Evolution API instance is connected
 */
export async function checkEvolutionAPIStatus(
  config: EvolutionAPIConfig
): Promise<{ connected: boolean; error?: string }> {
  try {
    const { apiUrl, apiKey, instanceName } = config
    const url = `${apiUrl}/instance/connectionState/${instanceName}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    })

    if (!response.ok) {
      return {
        connected: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    return {
      connected: data.state === 'open'
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
