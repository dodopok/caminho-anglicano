<template>
  <div class="calendar">
    <!-- Days of week header -->
    <div class="grid grid-cols-7 border-b border-gray-200">
      <div
        v-for="day in daysOfWeek"
        :key="day"
        class="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar days -->
    <div class="grid grid-cols-7 divide-x divide-y divide-gray-200">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="min-h-[120px] p-2 bg-white hover:bg-gray-50 transition-colors cursor-pointer relative"
        :class="{
          'bg-gray-100': !day.isCurrentMonth,
          'bg-blue-50': day.isToday
        }"
        @click="handleDayClick(day)"
      >
        <!-- Day number -->
        <div
          class="text-sm font-medium mb-1"
          :class="{
            'text-gray-400': !day.isCurrentMonth,
            'text-blue-600 font-bold': day.isToday,
            'text-gray-900': day.isCurrentMonth && !day.isToday
          }"
        >
          {{ day.date.getDate() }}
        </div>

        <!-- Service info -->
        <div v-if="day.service" class="space-y-1">
          <!-- Liturgical color indicator -->
          <div
            v-if="day.service.liturgical_color"
            class="h-2 rounded-full"
            :style="{ backgroundColor: getLiturgicalColorHex(day.service.liturgical_color) }"
            :title="day.service.liturgical_color"
          />

          <!-- Service type -->
          <div class="text-xs font-medium text-purple-700 truncate">
            {{ day.service.service_type?.name || 'Culto' }}
          </div>

          <!-- Liturgical week -->
          <div
            v-if="day.service.liturgical_week"
            class="text-xs text-gray-600 line-clamp-2"
          >
            {{ day.service.liturgical_week }}
          </div>

          <!-- Time -->
          <div v-if="day.service.service_time" class="text-xs text-gray-500">
            {{ formatTime(day.service.service_time) }}
          </div>

          <!-- Status badge -->
          <div class="flex items-center gap-1 mt-1">
            <span
              v-if="!day.service.is_published"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
            >
              Rascunho
            </span>
            <span
              v-else
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
            >
              Publicado
            </span>
          </div>
        </div>

        <!-- Add service button -->
        <button
          v-else-if="day.isCurrentMonth && isSunday(day.date)"
          class="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
          @click.stop="$emit('select-date', day.dateString)"
          title="Adicionar culto"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyService, MonthCalendarDay } from '../types'
import { getLiturgicalColorHex } from '../utils/liturgical-calendar'

interface Props {
  year: number
  month: number
  services?: LiturgyService[]
}

defineEmits<{
  'select-date': [date: string]
}>()

const props = withDefaults(defineProps<Props>(), {
  services: () => []
})

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const calendarDays = computed<MonthCalendarDay[]>(() => {
  const days: MonthCalendarDay[] = []
  const firstDay = new Date(props.year, props.month, 1)
  const lastDay = new Date(props.year, props.month + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(props.year, props.month, -i)
    const dateString = date.toISOString().split('T')[0]
    days.push({
      date,
      dateString,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      service: findServiceForDate(dateString)
    })
  }

  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(props.year, props.month, day)
    const dateString = date.toISOString().split('T')[0]
    days.push({
      date,
      dateString,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      service: findServiceForDate(dateString)
    })
  }

  // Add days from next month to complete the last week
  const remainingDays = 7 - (days.length % 7)
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(props.year, props.month + 1, i)
      const dateString = date.toISOString().split('T')[0]
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        service: findServiceForDate(dateString)
      })
    }
  }

  return days
})

const findServiceForDate = (dateString: string) => {
  return props.services?.find(s => s.service_date === dateString)
}

const isSunday = (date: Date) => {
  return date.getDay() === 0
}

const formatTime = (time: string) => {
  return time.substring(0, 5) // HH:MM
}

const handleDayClick = (day: MonthCalendarDay) => {
  if (day.service) {
    navigateTo(`/liturgia/${day.service.id}`)
  }
}
</script>

<style scoped>
.calendar {
  @apply w-full;
}
</style>
