<template>
  <div
    v-if="modelValue"
    class="mb-4 p-4 rounded-lg border"
    :class="alertClass"
    role="alert"
  >
    <div class="flex items-start">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <svg v-if="type === 'success'" class="h-5 w-5" :class="iconClass" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="type === 'error'" class="h-5 w-5" :class="iconClass" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="type === 'warning'" class="h-5 w-5" :class="iconClass" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <svg v-else class="h-5 w-5" :class="iconClass" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </div>

      <!-- Content -->
      <div class="ml-3 flex-1">
        <h3 v-if="title" class="font-medium" :class="titleClass">
          {{ title }}
        </h3>
        <div class="text-sm" :class="[messageClass, title ? 'mt-1' : '']">
          <slot>
            {{ message }}
          </slot>
        </div>
      </div>

      <!-- Dismiss button -->
      <button
        v-if="dismissible"
        class="ml-3 flex-shrink-0 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
        :class="dismissClass"
        @click="handleDismiss"
      >
        <span class="sr-only">Fechar</span>
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message?: string
  dismissible?: boolean
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  message: '',
  dismissible: false,
  modelValue: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  dismiss: []
}>()

const alertClass = computed(() => {
  const classes = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }
  return classes[props.type]
})

const iconClass = computed(() => {
  const classes = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }
  return classes[props.type]
})

const titleClass = computed(() => {
  const classes = {
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900',
  }
  return classes[props.type]
})

const messageClass = computed(() => {
  const classes = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }
  return classes[props.type]
})

const dismissClass = computed(() => {
  const classes = {
    success: 'text-green-600 hover:bg-green-100 focus:ring-green-500',
    error: 'text-red-600 hover:bg-red-100 focus:ring-red-500',
    warning: 'text-yellow-600 hover:bg-yellow-100 focus:ring-yellow-500',
    info: 'text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
  }
  return classes[props.type]
})

function handleDismiss() {
  emit('update:modelValue', false)
  emit('dismiss')
}
</script>
