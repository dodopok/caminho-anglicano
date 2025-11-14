<template>
  <BaseModal
    :is-open="isOpen"
    title="Buscar Igreja no Google"
    max-width="4xl"
    @close="handleClose"
  >
    <div class="space-y-4">
      <!-- Search Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Nome da Igreja
        </label>
        <div class="flex gap-2">
          <BaseInput
            v-model="searchQuery"
            placeholder="Ex: Igreja Episcopal Anglicana Recife"
            @keyup.enter="handleSearch"
          />
          <BaseButton
            variant="primary"
            :loading="isSearching"
            @click="handleSearch"
          >
            🔍 Buscar
          </BaseButton>
        </div>
      </div>

      <!-- Error Message -->
      <BaseAlert
        v-model="showErrorMessage"
        type="error"
        :message="errorMessage"
      />

      <!-- Loading State -->
      <div v-if="isSearching" class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p class="mt-3 text-sm font-medium text-gray-900">Buscando no Google...</p>
        </div>
      </div>

      <!-- Result -->
      <div v-else-if="placeResult" class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-green-900">Igreja encontrada!</h3>
              <p class="mt-1 text-sm text-green-700">
                Copie o JSON abaixo e cole no campo de dados da igreja
              </p>
            </div>
          </div>
        </div>

        <!-- JSON Result -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">
              JSON Gerado
            </label>
            <button
              type="button"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              @click="copyToClipboard"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {{ copied ? '✓ Copiado!' : 'Copiar' }}
            </button>
          </div>
          <BaseTextarea
            :model-value="jsonResult"
            :rows="20"
            disabled
            class="font-mono text-sm"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p class="mt-2 text-sm text-gray-500">Digite o nome da igreja e clique em Buscar</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton
          variant="secondary"
          @click="handleClose"
        >
          Fechar
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { getToken } = useAdminAuth()

const searchQuery = ref('')
const isSearching = ref(false)
const errorMessage = ref('')
const placeResult = ref<any>(null)
const jsonResult = ref('')
const copied = ref(false)

const showErrorMessage = computed({
  get: () => !!errorMessage.value,
  set: (value: boolean) => {
    if (!value) errorMessage.value = ''
  },
})

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    errorMessage.value = 'Digite o nome da igreja'
    return
  }

  isSearching.value = true
  errorMessage.value = ''
  placeResult.value = null
  jsonResult.value = ''
  copied.value = false

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    const result = await $fetch('/api/admin/places/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        query: searchQuery.value,
      },
    })

    placeResult.value = result
    jsonResult.value = JSON.stringify(result, null, 2)
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro ao buscar no Google'
    console.error('Error searching place:', error)
  } finally {
    isSearching.value = false
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(jsonResult.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Error copying to clipboard:', error)
  }
}

function handleClose() {
  if (!isSearching.value) {
    emit('close')
  }
}
</script>
