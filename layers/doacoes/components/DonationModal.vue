<template>
  <BaseModal
    :is-open="isOpen"
    title="Apoie o Caminho Anglicano"
    max-width="2xl"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <!-- Mensagem de introdução -->
      <div class="text-center">
        <p class="text-gray-700 dark:text-gray-300">
          Sua doação ajuda a manter este projeto funcionando e expandindo os recursos para a comunidade anglicana brasileira.
        </p>
      </div>

      <!-- Seleção de valor -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Escolha o valor da doação
        </label>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="option in DONATION_OPTIONS.slice(0, 3)"
            :key="option.value"
            type="button"
            :class="[
              'relative p-4 border-2 rounded-lg transition-all duration-200 text-left',
              selectedAmount === option.value
                ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500',
              option.popular && 'ring-2 ring-purple-400 ring-offset-2'
            ]"
            @click="selectAmount(option.value)"
          >
            <div v-if="option.popular" class="absolute -top-2 -right-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
                Popular
              </span>
            </div>
            <div class="font-bold text-lg text-gray-900 dark:text-white">{{ option.label }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ option.description }}</div>
          </button>
        </div>

        <!-- Valor customizado -->
        <div class="mt-4">
          <label class="flex items-center space-x-2">
            <input
              v-model="useCustomAmount"
              type="checkbox"
              class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            >
            <span class="text-sm text-gray-700 dark:text-gray-300">Outro valor</span>
          </label>
          <div v-if="useCustomAmount" class="mt-2">
            <BaseInput
              v-model="customAmountDisplay"
              type="text"
              placeholder="R$ 0,00"
              @input="formatCurrency"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- Tipo de doação -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Frequência
          </label>
          <div class="space-y-2">
            <button
              type="button"
              :class="[
                'w-full p-3 border-2 rounded-lg transition-all duration-200 text-center',
                frequency === 'ONE_TIME'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              ]"
              @click="frequency = 'ONE_TIME'"
            >
              <div class="font-semibold text-gray-900 dark:text-white text-sm">Uma vez</div>
            </button>
            <button
              type="button"
              :class="[
                'w-full p-3 border-2 rounded-lg transition-all duration-200 text-center opacity-50 cursor-not-allowed',
                'border-gray-300 dark:border-gray-600'
              ]"
              disabled
              title="Em breve"
            >
              <div class="font-semibold text-gray-900 dark:text-white text-sm">Mensal</div>
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            * Mensal em breve
          </p>
        </div>

        <!-- Método de pagamento -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Método de pagamento
          </label>
          <div class="space-y-2">
            <button
              type="button"
              :class="[
                'w-full p-3 border-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2',
                paymentMethod === 'PIX'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
              ]"
              @click="paymentMethod = 'PIX'"
            >
              <svg class="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
                <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.5H112.6C132.6 391.5 151.5 383.7 165.7 369.5L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.1C151.5 127.9 132.6 120.1 112.6 120.1H103.3L200.7 23.4C231.1-6.1 280.3-6.1 310.6 23.4L407.7 120.1H392.6C372.6 120.1 353.7 127.9 339.5 142.1L262.5 218.9zM112.6 142.1C126.4 142.1 139.1 148.3 149.3 158.5L226 235.2C247.6 256.8 281.4 256.8 303 235.2L379.7 158.5C389.9 148.3 402.6 142.1 416.4 142.1H421.2L514.3 235.2C542.6 263.5 542.6 308.5 514.3 336.8L421.2 429.9H416.4C402.6 429.9 389.9 423.7 379.7 413.5L303 336.8C281.4 315.2 247.6 315.2 226 336.8L149.3 413.5C139.1 423.7 126.4 429.9 112.6 429.9H107.8L14.7 336.8C-13.6 308.5-13.6 263.5 14.7 235.2L107.8 142.1H112.6z"/>
              </svg>
              <span class="font-semibold text-gray-900 dark:text-white text-sm">PIX</span>
            </button>
            <button
              type="button"
              :class="[
                'w-full p-3 border-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 opacity-50 cursor-not-allowed',
                'border-gray-300 dark:border-gray-600'
              ]"
              disabled
              title="Em breve"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <span class="font-semibold text-gray-900 dark:text-white text-sm">Cartão</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            * Cartão em breve
          </p>
        </div>
      </div>

      <!-- Formulário de dados -->
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            v-model="formData.name"
            label="Nome completo"
            required
            placeholder="Seu nome"
            autocomplete="name"
          />
          <BaseInput
            v-model="formData.email"
            type="email"
            label="E-mail"
            required
            placeholder="seu@email.com"
            autocomplete="email"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            v-model="formData.cellphone"
            label="Celular"
            required
            placeholder="(11) 99999-9999"
            autocomplete="tel-national"
            @input="formatPhone"
          />
          <BaseInput
            v-model="formData.taxId"
            label="CPF"
            required
            placeholder="000.000.000-00"
            autocomplete="off"
            @input="formatCPF"
          />
        </div>

        <!-- Erro -->
        <BaseAlert v-if="error" type="error" class="mt-4">
          {{ error }}
        </BaseAlert>

        <!-- Botões -->
        <div class="flex space-x-3 pt-4">
          <BaseButton
            type="button"
            variant="secondary"
            class="flex-1"
            @click="emit('close')"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            class="flex-1"
            :disabled="isLoading || !isFormValid"
            :loading="isLoading"
          >
            {{ isLoading ? 'Processando...' : 'Continuar' }}
          </BaseButton>
        </div>
      </form>
    </div>

    <BaseToast
      :show="showToast"
      :type="toastType"
      :message="toastMessage"
      @close="showToast = false"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { DONATION_OPTIONS } from '../types/donation'
import type { CreateDonationRequest } from '../types/donation'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  success: [url: string]
}>()

const { createDonation, isLoading, error } = useDonations()

// Toast state
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'info'>('success')
const toastMessage = ref('')

// State
const selectedAmount = ref(2500) // R$ 25 default
const useCustomAmount = ref(false)
const customAmountDisplay = ref('')
const customAmountCents = ref(0)
const frequency = ref<'ONE_TIME' | 'MONTHLY'>('ONE_TIME')
const paymentMethod = ref<'PIX' | 'CARD'>('PIX')

const formData = ref({
  name: '',
  email: '',
  cellphone: '',
  taxId: ''
})

// Computed
const finalAmount = computed(() => {
  if (useCustomAmount.value) {
    return customAmountCents.value
  }
  return selectedAmount.value
})

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    formData.value.email.trim() !== '' &&
    formData.value.cellphone.trim() !== '' &&
    formData.value.taxId.trim() !== '' &&
    finalAmount.value > 0
  )
})

// Methods
const selectAmount = (value: number) => {
  selectedAmount.value = value
  useCustomAmount.value = false
}

const formatCurrency = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')

  if (value === '') {
    customAmountCents.value = 0
    customAmountDisplay.value = ''
    return
  }

  customAmountCents.value = parseInt(value)

  const reais = Math.floor(parseInt(value) / 100)
  const centavos = parseInt(value) % 100

  customAmountDisplay.value = `R$ ${reais},${centavos.toString().padStart(2, '0')}`
}

const formatPhone = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '')

  if (value.length > 11) value = value.slice(0, 11)

  if (value.length >= 11) {
    formData.value.cellphone = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (value.length >= 7) {
    formData.value.cellphone = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  } else if (value.length >= 3) {
    formData.value.cellphone = value.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  } else {
    formData.value.cellphone = value
  }
}

const formatCPF = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '')

  if (value.length > 11) value = value.slice(0, 11)

  if (value.length >= 10) {
    formData.value.taxId = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  } else if (value.length >= 7) {
    formData.value.taxId = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  } else if (value.length >= 4) {
    formData.value.taxId = value.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  } else {
    formData.value.taxId = value
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  const cleanCellphone = formData.value.cellphone.replace(/\D/g, '')
  const cleanTaxId = formData.value.taxId.replace(/\D/g, '')

  const donationData: CreateDonationRequest = {
    amount: finalAmount.value,
    frequency: frequency.value,
    methods: [paymentMethod.value],
    customer: {
      name: formData.value.name,
      email: formData.value.email,
      cellphone: `+55${cleanCellphone}`,
      taxId: cleanTaxId
    }
  }

  const result = await createDonation(donationData)

  if (result?.url) {
    toastType.value = 'success'
    toastMessage.value = 'Redirecionando para o pagamento...'
    showToast.value = true
    
    // Aguardar um pouco antes de redirecionar para o usuário ver o toast
    setTimeout(() => {
      window.location.href = result.url
    }, 1000)
  } else if (error.value) {
    toastType.value = 'error'
    toastMessage.value = error.value
    showToast.value = true
  }
}

// Reset form when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    // Reset após um delay para evitar "flash" ao fechar
    setTimeout(() => {
      formData.value = {
        name: '',
        email: '',
        cellphone: '',
        taxId: ''
      }
      useCustomAmount.value = false
      customAmountDisplay.value = ''
      customAmountCents.value = 0
      selectedAmount.value = 2500
      frequency.value = 'ONE_TIME'
      paymentMethod.value = 'PIX'
    }, 300)
  }
})
</script>
