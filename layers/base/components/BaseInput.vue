<template>
  <div>
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :step="step"
      :autocomplete="autocomplete"
      class="w-full px-3 py-2 border rounded-md transition-colors"
      :class="[
        error
          ? 'border-red-300 focus:ring-1 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
        disabled || readonly ? 'bg-gray-50 text-gray-600' : 'bg-white',
        disabled ? 'cursor-not-allowed' : ''
      ]"
      @input="handleInput"
    >
    <p v-if="hint && !error" class="mt-1 text-xs text-gray-500">
      {{ hint }}
    </p>
    <p v-if="error" class="mt-1 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | number
  label?: string
  id?: string
  type?: 'text' | 'email' | 'url' | 'password' | 'number'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  hint?: string
  error?: string
  step?: string
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  readonly: false,
  autocomplete: 'off',
  label: '',
  placeholder: '',
  hint: '',
  error: '',
  step: '',
  id: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substr(2, 9)}`)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}
</script>
