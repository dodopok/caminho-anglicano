<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>

      <template v-else-if="service">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            Editar Culto
          </h1>
          <p class="text-gray-600">
            {{ service.liturgical_week || 'Culto' }} - {{ formatDate(service.service_date) }}
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Informações Básicas -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Informações Básicas
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tipo de Culto -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Culto *
                </label>
                <select
                  v-model="formData.service_type_id"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option v-for="type in serviceTypes" :key="type.id" :value="type.id">
                    {{ type.name }}
                  </option>
                </select>
              </div>

              <!-- Data -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  v-model="formData.service_date"
                  type="date"
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  @change="updateLiturgicalInfo"
                >
              </div>

              <!-- Horário -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Horário
                </label>
                <input
                  v-model="formData.service_time"
                  type="time"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
              </div>
            </div>
          </div>

          <!-- Informações Litúrgicas -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Informações Litúrgicas
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tempo Litúrgico
                </label>
                <input
                  v-model="formData.liturgical_season"
                  type="text"
                  readonly
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Domingo/Festa
                </label>
                <input
                  v-model="formData.liturgical_week"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Cor Litúrgica
                </label>
                <input
                  v-model="formData.liturgical_color"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
              </div>
            </div>

            <!-- Coleta -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Coleta do Dia
              </label>
              <textarea
                v-model="formData.collect_text"
                rows="4"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Insira a coleta do dia..."
              />
            </div>

            <!-- Leituras -->
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Leituras
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  v-model="readings.old_testament"
                  type="text"
                  placeholder="Antigo Testamento"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                <input
                  v-model="readings.psalm"
                  type="text"
                  placeholder="Salmo"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                <input
                  v-model="readings.epistle"
                  type="text"
                  placeholder="Epístola"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                <input
                  v-model="readings.gospel"
                  type="text"
                  placeholder="Evangelho *"
                  required
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
              </div>
            </div>
          </div>

          <!-- Escala de Ministérios -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Escala de Ministérios
            </h2>

            <div class="space-y-3">
              <div
                v-for="ministry in ministries"
                :key="ministry.id"
                class="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
              >
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700">
                    {{ ministry.name }}
                    <span v-if="ministry.requires_ordained" class="text-purple-600">*</span>
                  </label>
                </div>

                <div class="flex-1">
                  <select
                    v-model="schedules[ministry.id]"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="">Ninguém</option>
                    <option
                      v-for="person in getAvailablePeople(ministry)"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ person.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Músicas -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Músicas
            </h2>

            <div class="space-y-2">
              <div v-for="(song, index) in songs" :key="index" class="flex gap-2">
                <input
                  v-model="songs[index]"
                  type="text"
                  placeholder="Nome da música ou hino"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                <button
                  type="button"
                  class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  @click="removeSong(index)"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                class="text-purple-600 hover:text-purple-700 text-sm font-medium"
                @click="addSong"
              >
                + Adicionar música
              </button>
            </div>
          </div>

          <!-- Avisos -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Avisos
            </h2>

            <div class="space-y-2">
              <div v-for="(notice, index) in notices" :key="index" class="flex gap-2">
                <input
                  v-model="notices[index]"
                  type="text"
                  placeholder="Aviso"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                <button
                  type="button"
                  class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  @click="removeNotice(index)"
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                class="text-purple-600 hover:text-purple-700 text-sm font-medium"
                @click="addNotice"
              >
                + Adicionar aviso
              </button>
            </div>
          </div>

          <!-- Observações -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              Observações
            </h2>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Observações internas sobre este culto..."
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-4 justify-end">
            <button
              type="button"
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              @click="navigateTo(`/liturgia/${serviceId}`)"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="saving"
              class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </form>
      </template>

      <div v-else class="text-center py-12 text-gray-500">
        Culto não encontrado
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyMinistry, LiturgyPerson, LiturgyService, LiturgyServiceType } from '../../types'
import { getLiturgicalInfo } from '../../utils/liturgical-calendar'

const route = useRoute()
const serviceId = route.params.id as string

const { updateService } = useLiturgyServices()
const { people, fetchPeople } = useLiturgyPeople()

const loading = ref(true)
const saving = ref(false)
const service = ref<LiturgyService | null>(null)

const serviceTypes = ref<LiturgyServiceType[]>([])
const ministries = ref<LiturgyMinistry[]>([])

const formData = reactive({
  service_type_id: '',
  service_date: '',
  service_time: '',
  liturgical_season: '',
  liturgical_week: '',
  liturgical_color: '',
  collect_text: '',
  notes: ''
})

const readings = reactive({
  old_testament: '',
  psalm: '',
  epistle: '',
  gospel: ''
})

const schedules = reactive<Record<string, string>>({})
const songs = ref<string[]>([''])
const notices = ref<string[]>([''])

const loadData = async () => {
  loading.value = true
  try {
    const [serviceData, typesData, ministriesData] = await Promise.all([
      $fetch<LiturgyService>(`/api/liturgy/services/${serviceId}`),
      $fetch<LiturgyServiceType[]>('/api/liturgy/service-types'),
      $fetch<LiturgyMinistry[]>('/api/liturgy/ministries'),
      fetchPeople({ active: true })
    ])

    service.value = serviceData
    serviceTypes.value = typesData
    ministries.value = ministriesData

    // Populate form
    formData.service_type_id = serviceData.service_type_id
    formData.service_date = serviceData.service_date
    formData.service_time = serviceData.service_time || ''
    formData.liturgical_season = serviceData.liturgical_season || ''
    formData.liturgical_week = serviceData.liturgical_week || ''
    formData.liturgical_color = serviceData.liturgical_color || ''
    formData.collect_text = serviceData.collect_text || ''
    formData.notes = serviceData.notes || ''

    // Readings
    if (serviceData.readings) {
      readings.old_testament = serviceData.readings.old_testament || ''
      readings.psalm = serviceData.readings.psalm || ''
      readings.epistle = serviceData.readings.epistle || ''
      readings.gospel = serviceData.readings.gospel || ''
    }

    // Songs
    songs.value = serviceData.songs && serviceData.songs.length > 0 ? [...serviceData.songs] : ['']

    // Notices
    notices.value = serviceData.notices && serviceData.notices.length > 0 ? [...serviceData.notices] : ['']

    // Schedules
    if (serviceData.schedules) {
      serviceData.schedules.forEach(schedule => {
        if (schedule.ministry_id && schedule.person_id) {
          schedules[schedule.ministry_id] = schedule.person_id
        }
      })
    }
  } catch (error) {
    console.error('Error loading service:', error)
  } finally {
    loading.value = false
  }
}

const updateLiturgicalInfo = () => {
  if (!formData.service_date) return

  const date = new Date(formData.service_date + 'T12:00:00')
  const liturgicalInfo = getLiturgicalInfo(date)

  formData.liturgical_season = liturgicalInfo.season
  formData.liturgical_week = liturgicalInfo.week
  formData.liturgical_color = liturgicalInfo.color
}

const getAvailablePeople = (ministry: LiturgyMinistry): LiturgyPerson[] => {
  if (ministry.requires_ordained) {
    return people.value.filter(p => p.is_ordained && p.is_active)
  }
  return people.value.filter(p => p.is_active)
}

const addSong = () => {
  songs.value.push('')
}

const removeSong = (index: number) => {
  songs.value.splice(index, 1)
}

const addNotice = () => {
  notices.value.push('')
}

const removeNotice = (index: number) => {
  notices.value.splice(index, 1)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const handleSubmit = async () => {
  saving.value = true
  try {
    // Build schedules array
    const schedulesArray = Object.entries(schedules)
      .filter(([, personId]) => personId)
      .map(([ministryId, personId]) => ({
        ministry_id: ministryId,
        person_id: personId
      }))

    // Filter empty songs and notices
    const filteredSongs = songs.value.filter(s => s.trim())
    const filteredNotices = notices.value.filter(n => n.trim())

    const serviceData = {
      ...formData,
      readings,
      songs: filteredSongs,
      notices: filteredNotices,
      schedules: schedulesArray
    }

    await updateService(serviceId, serviceData)
    navigateTo(`/liturgia/${serviceId}`)
  } catch (error) {
    console.error('Error updating service:', error)
    alert('Erro ao atualizar culto. Por favor, tente novamente.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})

useHead({
  title: computed(() => `Editar ${service.value?.liturgical_week || 'Culto'} - Liturgia - Caminho Anglicano`)
})
</script>
