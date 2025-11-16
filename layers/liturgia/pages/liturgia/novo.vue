<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          {{ isEditing ? 'Editar Culto' : 'Novo Culto' }}
        </h1>
        <p class="text-gray-600">
          Configure a escala e detalhes do culto
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
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
                @change="updateLiturgicalInfo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <div class="flex gap-2">
                <div
                  class="w-10 h-10 rounded border border-gray-300"
                  :class="getLiturgicalColorClass(formData.liturgical_color || 'Verde')"
                />
                <input
                  v-model="formData.liturgical_color"
                  type="text"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
              </div>
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
                @click="removeSong(index)"
                class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              @click="addSong"
              class="text-purple-600 hover:text-purple-700 text-sm font-medium"
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
                @click="removeNotice(index)"
                class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              @click="addNotice"
              class="text-purple-600 hover:text-purple-700 text-sm font-medium"
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
            @click="navigateTo('/liturgia')"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            :disabled="saving"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {{ saving ? 'Salvando...' : 'Salvar Culto' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyMinistry, LiturgyPerson, LiturgyServiceType, ServiceFormData } from '../types'
import { getLiturgicalInfo, getLiturgicalColorClass } from '../utils/liturgical-calendar'

const route = useRoute()
const { createService } = useLiturgyServices()
const { people, fetchPeople } = useLiturgyPeople()

const isEditing = ref(false)
const saving = ref(false)

const serviceTypes = ref<LiturgyServiceType[]>([])
const ministries = ref<LiturgyMinistry[]>([])

const formData = reactive({
  service_type_id: '',
  service_date: (route.query.date as string) || '',
  service_time: '10:00',
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

// Load data
const loadData = async () => {
  const [typesData, ministriesData] = await Promise.all([
    $fetch<LiturgyServiceType[]>('/api/liturgy/service-types'),
    $fetch<LiturgyMinistry[]>('/api/liturgy/ministries'),
    fetchPeople({ active: true })
  ])

  serviceTypes.value = typesData
  ministries.value = ministriesData

  // Auto-select first service type if empty
  if (!formData.service_type_id && typesData.length > 0) {
    formData.service_type_id = typesData[0].id
  }

  // Update liturgical info if date is set
  if (formData.service_date) {
    updateLiturgicalInfo()
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

    const serviceData: ServiceFormData = {
      ...formData,
      readings,
      songs: filteredSongs,
      notices: filteredNotices,
      schedules: schedulesArray
    }

    await createService(serviceData)
    navigateTo('/liturgia')
  } catch (error) {
    console.error('Error saving service:', error)
    alert('Erro ao salvar culto. Por favor, tente novamente.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})

useHead({
  title: 'Novo Culto - Liturgia - Caminho Anglicano'
})
</script>
