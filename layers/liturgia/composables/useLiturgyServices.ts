import type { LiturgyService, ServiceFormData } from '../types'
import { getLiturgicalInfo } from '../utils/liturgical-calendar'

export const useLiturgyServices = () => {
  const services = useState<LiturgyService[]>('liturgy-services', () => [])
  const loading = useState<boolean>('liturgy-services-loading', () => false)
  const error = useState<string | null>('liturgy-services-error', () => null)

  /**
   * Busca serviços (cultos) com filtros opcionais
   */
  const fetchServices = async (params?: {
    startDate?: string
    endDate?: string
    status?: string
    serviceTypeId?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<LiturgyService[]>('/api/liturgy/services', {
        params
      })

      services.value = data
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar cultos'
      error.value = errorMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Busca serviços de um mês específico
   */
  const fetchServicesByMonth = async (year: number, month: number) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    return fetchServices({ startDate, endDate })
  }

  /**
   * Busca serviço por ID com escalas
   */
  const fetchServiceById = async (id: string) => {
    try {
      const data = await $fetch<LiturgyService>(`/api/liturgy/services/${id}`)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar culto'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Cria novo serviço com informações litúrgicas calculadas
   */
  const createService = async (serviceData: ServiceFormData) => {
    try {
      // Calcular informações litúrgicas automaticamente
      const serviceDate = new Date(serviceData.service_date)
      const liturgicalInfo = getLiturgicalInfo(serviceDate)

      const enrichedData = {
        ...serviceData,
        liturgical_season: serviceData.liturgical_season || liturgicalInfo.season,
        liturgical_week: serviceData.liturgical_week || liturgicalInfo.week,
        liturgical_color: serviceData.liturgical_color || liturgicalInfo.color
      }

      const data = await $fetch<LiturgyService>('/api/liturgy/services', {
        method: 'POST',
        body: enrichedData
      })

      services.value.push(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar culto'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Atualiza serviço
   */
  const updateService = async (id: string, serviceData: Partial<ServiceFormData>) => {
    try {
      const data = await $fetch<LiturgyService>(`/api/liturgy/services/${id}`, {
        method: 'PUT',
        body: serviceData
      })

      const index = services.value.findIndex(s => s.id === id)
      if (index !== -1) {
        services.value[index] = data
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar culto'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Deleta serviço
   */
  const deleteService = async (id: string) => {
    try {
      await $fetch(`/api/liturgy/services/${id}`, {
        method: 'DELETE'
      })

      services.value = services.value.filter(s => s.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar culto'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Duplica um serviço para outra data
   */
  const duplicateService = async (id: string, newDate: string) => {
    try {
      const original = await fetchServiceById(id)

      const duplicated: ServiceFormData = {
        service_type_id: original.service_type_id,
        service_date: newDate,
        service_time: original.service_time,
        songs: original.songs || [],
        notices: original.notices || [],
        notes: original.notes,
        schedules: original.schedules?.map(s => ({
          ministry_id: s.ministry_id,
          person_id: s.person_id
        })) || []
      }

      return createService(duplicated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao duplicar culto'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Publica um serviço
   */
  const publishService = async (id: string) => {
    return updateService(id, { is_published: true, status: 'scheduled' } as Partial<ServiceFormData>)
  }

  /**
   * Gera documento (DOCX ou PDF)
   */
  const generateDocument = async (id: string, format: 'docx' | 'pdf') => {
    try {
      const response = await $fetch(`/api/liturgy/services/${id}/generate`, {
        method: 'POST',
        body: { format }
      })

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar documento'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Envia notificações para pessoas escaladas
   */
  const sendNotifications = async (id: string) => {
    try {
      const response = await $fetch(`/api/liturgy/services/${id}/notify`, {
        method: 'POST'
      })

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar notificações'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Serviços publicados
   */
  const publishedServices = computed(() =>
    services.value.filter(s => s.is_published)
  )

  /**
   * Próximos serviços
   */
  const upcomingServices = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return services.value
      .filter(s => s.service_date >= today)
      .sort((a, b) => a.service_date.localeCompare(b.service_date))
  })

  return {
    services,
    loading,
    error,
    publishedServices,
    upcomingServices,
    fetchServices,
    fetchServicesByMonth,
    fetchServiceById,
    createService,
    updateService,
    deleteService,
    duplicateService,
    publishService,
    generateDocument,
    sendNotifications
  }
}
