<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div
        class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        @click="$emit('close')"
      />

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form @submit.prevent="handleSubmit">
          <!-- Header -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
              {{ isEditing ? 'Editar Pessoa' : 'Nova Pessoa' }}
            </h3>

            <!-- Form fields -->
            <div class="space-y-4">
              <!-- Nome -->
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700">
                  Nome *
                </label>
                <input
                  id="name"
                  v-model="formData.name"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
                >
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  v-model="formData.email"
                  type="email"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
                >
              </div>

              <!-- WhatsApp -->
              <div>
                <label for="whatsapp" class="block text-sm font-medium text-gray-700">
                  WhatsApp
                </label>
                <input
                  id="whatsapp"
                  v-model="formData.whatsapp"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
                >
              </div>

              <!-- Telefone -->
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <input
                  id="phone"
                  v-model="formData.phone"
                  type="tel"
                  placeholder="(00) 0000-0000"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
                >
              </div>

              <!-- Checkboxes -->
              <div class="space-y-2">
                <div class="flex items-center">
                  <input
                    id="is_ordained"
                    v-model="formData.is_ordained"
                    type="checkbox"
                    class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  >
                  <label for="is_ordained" class="ml-2 block text-sm text-gray-900">
                    Ordenado (pode absolver, benzer e presidir eucaristia)
                  </label>
                </div>

                <div class="flex items-center">
                  <input
                    id="is_active"
                    v-model="formData.is_active"
                    type="checkbox"
                    class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  >
                  <label for="is_active" class="ml-2 block text-sm text-gray-900">
                    Ativo (disponível para ser escalado)
                  </label>
                </div>
              </div>

              <!-- Observações -->
              <div>
                <label for="notes" class="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="notes"
                  v-model="formData.notes"
                  rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="submit"
              :disabled="saving"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyPerson } from '../types'

interface Props {
  person?: LiturgyPerson | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: []
}>()

const { createPerson, updatePerson } = useLiturgyPeople()

const isEditing = computed(() => !!props.person)

const formData = reactive({
  name: props.person?.name || '',
  email: props.person?.email || '',
  phone: props.person?.phone || '',
  whatsapp: props.person?.whatsapp || '',
  is_ordained: props.person?.is_ordained || false,
  is_active: props.person?.is_active !== undefined ? props.person.is_active : true,
  notes: props.person?.notes || ''
})

const saving = ref(false)

const handleSubmit = async () => {
  saving.value = true
  try {
    if (isEditing.value && props.person) {
      await updatePerson(props.person.id, formData)
    } else {
      await createPerson(formData)
    }
    emit('save')
  } catch (error) {
    console.error('Error saving person:', error)
    alert('Erro ao salvar pessoa. Por favor, tente novamente.')
  } finally {
    saving.value = false
  }
}
</script>
