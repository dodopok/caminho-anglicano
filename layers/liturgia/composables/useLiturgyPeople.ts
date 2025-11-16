import type { LiturgyPerson } from '../types'

export const useLiturgyPeople = () => {
  const people = useState<LiturgyPerson[]>('liturgy-people', () => [])
  const loading = useState<boolean>('liturgy-people-loading', () => false)
  const error = useState<string | null>('liturgy-people-error', () => null)

  /**
   * Busca todas as pessoas
   */
  const fetchPeople = async (filters?: { active?: boolean; ordained?: boolean }) => {
    loading.value = true
    error.value = null

    try {
      const query: Record<string, string> = {}
      if (filters?.active !== undefined) query.active = filters.active.toString()
      if (filters?.ordained !== undefined) query.ordained = filters.ordained.toString()

      const data = await $fetch<LiturgyPerson[]>('/api/liturgy/people', {
        params: query
      })

      people.value = data
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar pessoas'
      error.value = errorMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Busca pessoa por ID
   */
  const fetchPersonById = async (id: string) => {
    try {
      const data = await $fetch<LiturgyPerson>(`/api/liturgy/people/${id}`)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar pessoa'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Cria nova pessoa
   */
  const createPerson = async (personData: Partial<LiturgyPerson>) => {
    try {
      const data = await $fetch<LiturgyPerson>('/api/liturgy/people', {
        method: 'POST',
        body: personData
      })

      people.value.push(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar pessoa'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Atualiza pessoa
   */
  const updatePerson = async (id: string, personData: Partial<LiturgyPerson>) => {
    try {
      const data = await $fetch<LiturgyPerson>(`/api/liturgy/people/${id}`, {
        method: 'PUT',
        body: personData
      })

      const index = people.value.findIndex(p => p.id === id)
      if (index !== -1) {
        people.value[index] = data
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar pessoa'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Deleta pessoa
   */
  const deletePerson = async (id: string) => {
    try {
      await $fetch(`/api/liturgy/people/${id}`, {
        method: 'DELETE'
      })

      people.value = people.value.filter(p => p.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar pessoa'
      error.value = errorMessage
      throw err
    }
  }

  /**
   * Pessoas ativas
   */
  const activePeople = computed(() =>
    people.value.filter(p => p.is_active)
  )

  /**
   * Pessoas ordenadas
   */
  const ordainedPeople = computed(() =>
    people.value.filter(p => p.is_ordained && p.is_active)
  )

  /**
   * Busca pessoas por nome
   */
  const searchPeople = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return people.value.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.email?.toLowerCase().includes(lowerQuery)
    )
  }

  return {
    people,
    loading,
    error,
    activePeople,
    ordainedPeople,
    fetchPeople,
    fetchPersonById,
    createPerson,
    updatePerson,
    deletePerson,
    searchPeople
  }
}
