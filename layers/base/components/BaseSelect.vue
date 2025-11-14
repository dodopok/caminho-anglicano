<template>
  <div>
    <label
      v-if="label"
      :for="selectId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="w-full px-3 py-2 border rounded-md transition-colors"
      :class="[
        error
          ? 'border-red-300 focus:ring-1 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
        disabled ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'
      ]"
      @change="handleChange"
    >
      <option v-if="placeholder" value="">
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  label?: string
  id?: string
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectId = computed(() => props.id || `select-${Math.random().toString(36).substr(2, 9)}`)

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>
