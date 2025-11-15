/**
 * Webhook para receber notificações de status de pagamento do AbacatePay
 * Configure este endpoint no painel do AbacatePay
 */

interface WebhookPayload {
  id: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  amount: number
  customer: {
    name: string
    email: string
  }
  metadata?: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  const body = await readBody<WebhookPayload>(event)

  // Log do webhook recebido
  console.log('[Donation Webhook] Received:', {
    id: body.id,
    status: body.status,
    amount: body.amount,
    customer: body.customer.email
  })

  // TODO: Implementar lógica de negócio
  // Exemplos:
  // - Enviar e-mail de confirmação quando status === 'PAID'
  // - Atualizar banco de dados com o status
  // - Ativar benefícios de doador
  // - Enviar notificação para admin

  switch (body.status) {
    case 'PAID':
      // Pagamento confirmado
      console.log(`[Donation] Payment confirmed for ${body.customer.email}`)
      // TODO: Enviar e-mail de agradecimento
      // TODO: Ativar benefícios se aplicável
      break

    case 'EXPIRED':
      // Pagamento expirou
      console.log(`[Donation] Payment expired for ${body.customer.email}`)
      break

    case 'CANCELLED':
      // Pagamento cancelado
      console.log(`[Donation] Payment cancelled for ${body.customer.email}`)
      break

    default:
      // Status pendente ou desconhecido
      break
  }

  // Retornar 200 para o AbacatePay saber que recebemos
  return {
    received: true,
    id: body.id
  }
})
