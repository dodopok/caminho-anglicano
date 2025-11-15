<script setup lang="ts">
interface Props {
  show: boolean
  type?: 'success' | 'error' | 'info'
  message: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success'
})

const emit = defineEmits<{
  close: []
}>()

const iconPath = computed(() => {
  switch (props.type) {
    case 'success':
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'error':
      return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'info':
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
})

const bgColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-50 border-green-500'
    case 'error':
      return 'bg-red-50 border-red-500'
    case 'info':
      return 'bg-blue-50 border-blue-500'
    default:
      return 'bg-blue-50 border-blue-500'
  }
})

const iconColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    case 'info':
      return 'text-blue-600'
    default:
      return 'text-blue-600'
  }
})

const textColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-800'
    case 'error':
      return 'text-red-800'
    case 'info':
      return 'text-blue-800'
    default:
      return 'text-blue-800'
  }
})
</script>

<template>
  <Transition name="toast">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
    >
      <div
        :class="[
          'max-w-md w-full mx-4 rounded-lg shadow-2xl border-l-4 p-4 pointer-events-auto',
          bgColor
        ]"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <svg
            :class="['w-6 h-6 flex-shrink-0', iconColor]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="iconPath"
            />
          </svg>
          <div class="flex-1">
            <p :class="['text-sm font-medium', textColor]">
              {{ message }}
            </p>
          </div>
          <button
            type="button"
            :class="['flex-shrink-0 hover:opacity-75 transition-opacity', iconColor]"
            aria-label="Fechar"
            @click="emit('close')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
