<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>

      <template v-else-if="person">
        <!-- Header -->
        <div class="mb-8">
          <NuxtLink
            to="/liturgia/pessoas"
            class="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Pessoas
          </NuxtLink>

          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            Escalas de {{ person.name }}
          </h1>
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span v-if="person.email">{{ person.email }}</span>
            <span v-if="person.whatsapp">{{ person.whatsapp }}</span>
            <span
              v-if="person.is_ordained"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
            >
              Ordenado
            </span>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="mb-6 flex gap-4 border-b border-gray-200">
          <button
            class="px-4 py-2 font-medium border-b-2 transition-colors"
            :class="filter === 'upcoming' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="filter = 'upcoming'"
          >
            Próximos
          </button>
          <button
            class="px-4 py-2 font-medium border-b-2 transition-colors"
            :class="filter === 'past' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="filter = 'past'"
          >
            Passados
          </button>
          <button
            class="px-4 py-2 font-medium border-b-2 transition-colors"
            :class="filter === 'all' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="filter = 'all'"
          >
            Todos
          </button>
        </div>

        <!-- Schedules List -->
        <div class="space-y-4">
          <div
            v-for="schedule in filteredSchedules"
            :key="schedule.id"
            class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            @click="navigateTo(`/liturgia/${schedule.service.id}`)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ schedule.service.liturgical_week || 'Culto' }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ formatDate(schedule.service.service_date) }}
                  {{ schedule.service.service_time ? `às ${schedule.service.service_time.substring(0, 5)}` : '' }}
                </p>
              </div>

              <div class="flex flex-col items-end gap-2">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {{ schedule.ministry?.name }}
                </span>

                <div class="flex gap-2">
                  <span
                    v-if="schedule.confirmed"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                    title="Confirmado"
                  >
                    ✓ Confirmado
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    title="Pendente"
                  >
                    Pendente
                  </span>

                  <span
                    v-if="schedule.notified"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    title="Notificado"
                  >
                    🔔 Notificado
                  </span>
                </div>
              </div>
            </div>

            <div v-if="schedule.service.liturgical_season" class="text-sm text-gray-500">
              <strong>Tempo:</strong> {{ schedule.service.liturgical_season }}
            </div>

            <div v-if="schedule.notes" class="mt-2 text-sm text-gray-600 italic">
              {{ schedule.notes }}
            </div>
          </div>

          <div v-if="filteredSchedules.length === 0" class="text-center py-12 text-gray-500">
            <p class="text-lg">Nenhuma escala encontrada</p>
            <p v-if="filter === 'upcoming'" class="text-sm mt-2">
              Esta pessoa não tem escalas futuras
            </p>
            <p v-else-if="filter === 'past'" class="text-sm mt-2">
              Esta pessoa não tem escalas passadas
            </p>
          </div>
        </div>

        <!-- Summary -->
        <div class="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Resumo
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p class="text-sm text-gray-500">Total de Escalas</p>
              <p class="text-2xl font-bold text-gray-900">{{ schedules.length }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Próximas</p>
              <p class="text-2xl font-bold text-purple-600">
                {{ schedules.filter(s => new Date(s.service.service_date) >= new Date()).length }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Confirmadas</p>
              <p class="text-2xl font-bold text-green-600">
                {{ schedules.filter(s => s.confirmed).length }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <p class="text-sm text-gray-500 mb-2">Ministérios Mais Frequentes</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="ministry in topMinistries"
                :key="ministry.name"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-50 text-purple-700"
              >
                {{ ministry.name }} ({{ ministry.count }}x)
              </span>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="text-center py-12 text-gray-500">
        Pessoa não encontrada
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyPerson, LiturgySchedule } from '../../../../types'

const route = useRoute()
const personId = route.params.id as string

const person = ref<LiturgyPerson | null>(null)
const schedules = ref<LiturgySchedule[]>([])
const loading = ref(true)
const filter = ref<'upcoming' | 'past' | 'all'>('upcoming')

const filteredSchedules = computed(() => {
  const today = new Date().toISOString().split('T')[0]

  if (filter.value === 'upcoming') {
    return schedules.value.filter(s => s.service && s.service.service_date >= today)
  } else if (filter.value === 'past') {
    return schedules.value.filter(s => s.service && s.service.service_date < today)
  }
  return schedules.value
})

const topMinistries = computed(() => {
  const counts: Record<string, number> = {}

  schedules.value.forEach(schedule => {
    if (schedule.ministry?.name) {
      counts[schedule.ministry.name] = (counts[schedule.ministry.name] || 0) + 1
    }
  })

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const loadData = async () => {
  loading.value = true
  try {
    const [personData, schedulesData] = await Promise.all([
      $fetch<LiturgyPerson>(`/api/liturgy/people/${personId}`),
      $fetch<LiturgySchedule[]>(`/api/liturgy/people/${personId}/schedules`, {
        params: { filter: 'all' }
      })
    ])

    person.value = personData
    schedules.value = schedulesData
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

onMounted(() => {
  loadData()
})

useHead({
  title: computed(() => `Escalas de ${person.value?.name || 'Pessoa'} - Liturgia - Caminho Anglicano`)
})
</script>
