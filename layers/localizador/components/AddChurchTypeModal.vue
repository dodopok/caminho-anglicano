<script setup lang="ts">
interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  selectSingle: []
  selectBulk: []
}

const _props = defineProps<Props>()
const emit = defineEmits<Emits>()

function handleClose() {
  emit('close')
}

function handleSelectSingle() {
  emit('selectSingle')
}

function handleSelectBulk() {
  emit('selectBulk')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        @click.self="handleClose"
      >
        <div
          class="bg-white rounded-lg shadow-xl max-w-md w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 id="modal-title" class="text-xl font-bold text-gray-900">
              Adicionar Igreja
            </h2>
            <button
              type="button"
              @click="handleClose"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <p class="text-sm text-gray-600 mb-6">
              Como você gostaria de adicionar igrejas?
            </p>

            <button
              type="button"
              @click="handleSelectSingle"
              class="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
            >
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <svg class="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <h3 class="text-base font-semibold text-gray-900 mb-1">
                    Adicionar uma igreja
                  </h3>
                  <p class="text-sm text-gray-600">
                    Preencha um formulário com os dados de uma igreja
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              @click="handleSelectBulk"
              class="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
            >
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <svg class="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <h3 class="text-base font-semibold text-gray-900 mb-1">
                    Adicionar várias igrejas
                  </h3>
                  <p class="text-sm text-gray-600">
                    Cole uma lista com várias igrejas de uma vez
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
