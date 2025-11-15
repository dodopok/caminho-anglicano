<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="handleOverlayClick"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            @click="handleOverlayClick"
          />

          <!-- Modal Content -->
          <div
            class="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col"
            :class="maxWidthClass"
          >
            <!-- Loading Overlay -->
            <div
              v-if="loading"
              class="absolute inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center rounded-lg"
            >
              <div class="text-center">
                <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p class="mt-3 text-sm font-medium text-gray-900">{{ loadingText }}</p>
              </div>
            </div>

            <!-- Header -->
            <div
              v-if="showHeader"
              class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10"
            >
              <slot name="header">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold text-gray-900">
                    {{ title }}
                  </h2>
                  <button
                    v-if="showClose"
                    class="text-gray-400 hover:text-gray-500 transition-colors"
                    @click="handleClose"
                  >
                    <span class="sr-only">Fechar</span>
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </slot>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="showFooter"
              class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg"
            >
              <slot name="footer">
                <div class="flex justify-end gap-3">
                  <slot name="footer-actions" />
                </div>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  showHeader?: boolean
  showFooter?: boolean
  showClose?: boolean
  closeOnOverlay?: boolean
  loading?: boolean
  loadingText?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '4xl',
  showHeader: true,
  showFooter: true,
  showClose: true,
  closeOnOverlay: true,
  loading: false,
  loadingText: 'Salvando...',
})

const emit = defineEmits<{
  close: []
}>()

const maxWidthClass = computed(() => {
  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  }
  return widths[props.maxWidth]
})

function handleClose() {
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    handleClose()
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
