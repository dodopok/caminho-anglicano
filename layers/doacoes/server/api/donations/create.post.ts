import type { CreateDonationRequest, DonationBillingResponse } from '../../../types/donation'

export default defineEventHandler(async (event): Promise<DonationBillingResponse> => {
  const config = useRuntimeConfig()
  const body = await readBody<CreateDonationRequest>(event)

  // Validação
  if (!body.customer || !body.customer.name || !body.customer.email) {
    throw createError({
      statusCode: 400,
      message: 'Dados do cliente são obrigatórios'
    })
  }

  if (!body.amount || body.amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Valor da doação inválido'
    })
  }

  if (!config.abacatepayApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Configuração de pagamento não encontrada'
    })
  }

  try {
    // Construir URL base do site
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const host = event.node.req.headers.host || 'caminhoanglicano.com.br'
    const baseUrl = `${protocol}://${host}`

    // Preparar dados para a API do AbacatePay
    const abacatePayload = {
      frequency: body.frequency,
      methods: body.methods,
      products: [
        {
          externalId: `DONATION-${Date.now()}`,
          name: body.frequency === 'MONTHLY' ? 'Doação Mensal - Caminho Anglicano' : 'Doação - Caminho Anglicano',
          description: 'Apoio ao portal Caminho Anglicano',
          quantity: 1,
          price: body.amount
        }
      ],
      returnUrl: `${baseUrl}/`,
      completionUrl: `${baseUrl}/doacao/sucesso`,
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        cellphone: body.customer.cellphone,
        taxId: body.customer.taxId
      }
    }

    // Fazer requisição para a API do AbacatePay
    const response = await $fetch<DonationBillingResponse>('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.abacatepayApiKey}`,
        'Content-Type': 'application/json'
      },
      body: abacatePayload
    })

    // Log para debug (remover em produção ou usar logger apropriado)
    console.log('[Donation] Billing created:', {
      id: response.id,
      amount: response.amount,
      status: response.status
    })

    return response
  } catch (error: unknown) {
    console.error('[Donation] Error creating billing:', error)

    // Melhor tratamento de erros
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
      throw createError({
        statusCode: 500,
        message: 'Erro de autenticação com o gateway de pagamento'
      })
    }

    const { statusCode, message } = parseError(error)

    throw createError({
      statusCode: statusCode || 500,
      message: message || 'Erro ao processar doação. Tente novamente.'
    })
  }
})
