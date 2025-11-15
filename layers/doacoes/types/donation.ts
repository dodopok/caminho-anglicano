export interface DonationProduct {
  externalId: string
  name: string
  description: string
  quantity: number
  price: number // em centavos
}

export interface DonationCustomer {
  name: string
  email: string
  cellphone: string
  taxId: string // CPF
}

export interface CreateDonationRequest {
  amount?: number // valor customizado em centavos (opcional)
  frequency: 'ONE_TIME' | 'MONTHLY'
  methods: ('PIX' | 'CARD')[]
  customer: DonationCustomer
}

export interface DonationBillingResponse {
  id: string
  url: string
  amount: number
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  methods: string[]
  frequency: string
  customer: DonationCustomer & { metadata?: Record<string, unknown> }
  createdAt: string
  updatedAt: string
}

export interface DonationOption {
  label: string
  value: number // em centavos
  description?: string
  popular?: boolean
}

export const DONATION_OPTIONS: DonationOption[] = [
  {
    label: 'R$ 5',
    value: 500,
    description: 'Cafezinho'
  },
  {
    label: 'R$ 10',
    value: 1000,
    description: 'Apoio básico'
  },
  {
    label: 'R$ 25',
    value: 2500,
    description: 'Apoio generoso',
    popular: true
  },
  {
    label: 'R$ 50',
    value: 5000,
    description: 'Grande apoiador'
  },
  {
    label: 'R$ 100',
    value: 10000,
    description: 'Benfeitor'
  }
]
