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
                    @click="handleClose"
                    class="text-gray-400 hover:text-gray-500 transition-colors"
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
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '4xl',
  showHeader: true,
  showFooter: true,
  showClose: true,
  closeOnOverlay: true,
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
