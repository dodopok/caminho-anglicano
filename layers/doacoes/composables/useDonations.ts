import type { CreateDonationRequest, DonationBillingResponse } from '../types/donation'

export const useDonations = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const createDonation = async (data: CreateDonationRequest): Promise<DonationBillingResponse | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: DonationBillingResponse }>('/api/donations/create', {
        method: 'POST',
        body: data
      })

      return response.data
    } catch (err: any) {
      console.error('Erro ao criar doação:', err)
      error.value = err?.data?.message || 'Erro ao processar doação. Tente novamente.'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    createDonation
  }
}
