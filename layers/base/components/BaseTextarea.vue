<template>
  <div>
    <label
      v-if="label"
      :for="textareaId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      class="w-full px-3 py-2 border rounded-md transition-colors"
      :class="[
        error
          ? 'border-red-300 focus:ring-1 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
        disabled || readonly ? 'bg-gray-50 text-gray-600' : 'bg-white',
        disabled ? 'cursor-text' : ''
      ]"
      @input="handleInput"
    />
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
  modelValue: string
  label?: string
  id?: string
  rows?: number
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  hint?: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  rows: 3,
  required: false,
  disabled: false,
  readonly: false,
  label: '',
  hint: '',
  error: '',
  placeholder: '',
  id: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaId = computed(() => props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`)

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>
