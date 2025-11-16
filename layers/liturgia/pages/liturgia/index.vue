<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Gestão Litúrgica
        </h1>
        <p class="text-gray-600">
          Organize escalas, cultos e liturgias
        </p>
      </div>

      <!-- Actions -->
      <div class="mb-6 flex flex-wrap gap-4">
        <NuxtLink
          to="/liturgia/novo"
          class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Novo Culto
        </NuxtLink>

        <NuxtLink
          to="/liturgia/pessoas"
          class="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Gerenciar Pessoas
        </NuxtLink>

        <NuxtLink
          to="/liturgia/textos"
          class="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Textos Litúrgicos
        </NuxtLink>
      </div>

      <!-- Month Navigation -->
      <div class="mb-6 flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
        <button
          @click="previousMonth"
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Mês anterior"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 class="text-2xl font-bold text-gray-900">
          {{ monthName }} {{ currentYear }}
        </h2>

        <button
          @click="nextMonth"
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Próximo mês"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Calendar -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <LiturgyCalendar
          :year="currentYear"
          :month="currentMonth"
          :services="services"
          @select-date="handleDateSelect"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchServicesByMonth } = useLiturgyServices()

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const services = ref([])
const loading = ref(false)

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const monthName = computed(() => monthNames[currentMonth.value])

const loadServices = async () => {
  loading.value = true
  try {
    services.value = await fetchServicesByMonth(currentYear.value, currentMonth.value)
  } finally {
    loading.value = false
  }
}

const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadServices()
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadServices()
}

const handleDateSelect = (date: string) => {
  navigateTo(`/liturgia/novo?date=${date}`)
}

onMounted(() => {
  loadServices()
})

useHead({
  title: 'Gestão Litúrgica - Caminho Anglicano'
})
</script>
