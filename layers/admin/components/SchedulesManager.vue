<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 mb-1">
      Horários de Culto
    </label>

    <!-- List of schedules -->
    <div v-if="schedules.length > 0" class="space-y-2">
      <div
        v-for="(schedule, index) in schedules"
        :key="index"
        class="flex items-start gap-2"
      >
        <BaseInput
          v-model="schedules[index].day"
          placeholder="Dia (ex: Domingo)"
        />
        <BaseInput
          v-model="schedules[index].time"
          placeholder="Horário (ex: 10h00)"
        />
        <button
          type="button"
          @click="removeSchedule(index)"
          class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors mt-0.5"
          title="Remover horário"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-sm text-gray-500 italic py-2">
      Nenhum horário cadastrado
    </div>

    <!-- Add button -->
    <button
      type="button"
      @click="addSchedule"
      class="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Adicionar Horário
    </button>

    <p class="text-xs text-gray-500">
      Os horários serão salvos em formato estruturado no banco de dados
    </p>
  </div>
</template>

<script setup lang="ts">
interface Schedule {
  day: string
  time: string
}

interface Props {
  modelValue: Schedule[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: Schedule[]]
}>()

const schedules = ref<Schedule[]>([])

// Initialize from props
watch(() => props.modelValue, (newValue) => {
  if (newValue && Array.isArray(newValue)) {
    schedules.value = [...newValue]
  }
}, { immediate: true })

// Emit changes
watch(schedules, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

function addSchedule() {
  schedules.value.push({ day: '', time: '' })
}

function removeSchedule(index: number) {
  schedules.value.splice(index, 1)
}
</script>
