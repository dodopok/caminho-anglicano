<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="flex min-h-full items-center justify-center p-4">
          <!-- Overlay -->
          <div
            class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            @click="handleClose"
          />

          <!-- Modal Content -->
          <div class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-gray-900">
                  Editar Igreja
                </h2>
                <button
                  @click="handleClose"
                  class="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <span class="sr-only">Fechar</span>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Body (Scrollable) -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <!-- Error/Success Messages -->
              <div v-if="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>

              <div v-if="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p class="text-sm text-green-800">{{ successMessage }}</p>
              </div>


              <!-- Form -->
              <form @submit.prevent="handleSave" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <!-- Left Column - Form Fields -->
                  <div class="lg:col-span-2 space-y-6">
                    <!-- Nome -->
                    <div>
                      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Igreja *
                      </label>
                      <input
                        id="name"
                        v-model="formData.name"
                        type="text"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                    </div>

                    <!-- Jurisdição -->
                    <div>
                      <label for="jurisdiction" class="block text-sm font-medium text-gray-700 mb-1">
                        Jurisdição *
                      </label>
                      <select
                        id="jurisdiction"
                        v-model="formData.jurisdiction_id"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecione uma jurisdição</option>
                        <option v-for="j in jurisdictions" :key="j.id" :value="j.id">
                          {{ j.name }}
                        </option>
                      </select>
                    </div>

                    <!-- Endereço -->
                    <div>
                      <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
                        Endereço Completo *
                      </label>
                      <textarea
                        id="address"
                        v-model="formData.address"
                        rows="2"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p class="mt-1 text-xs text-gray-500">
                        Ao salvar, as coordenadas serão atualizadas automaticamente no servidor
                      </p>
                    </div>

                    <!-- Cidade, Estado, CEP -->
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
                          Cidade
                        </label>
                        <input
                          id="city"
                          v-model="formData.city"
                          type="text"
                          readonly
                          class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        >
                      </div>
                      <div>
                        <label for="state" class="block text-sm font-medium text-gray-700 mb-1">
                          Estado
                        </label>
                        <input
                          id="state"
                          v-model="formData.state"
                          type="text"
                          readonly
                          class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        >
                      </div>
                      <div>
                        <label for="postal_code" class="block text-sm font-medium text-gray-700 mb-1">
                          CEP
                        </label>
                        <input
                          id="postal_code"
                          v-model="formData.postal_code"
                          type="text"
                          readonly
                          class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        >
                      </div>
                    </div>

                    <!-- Coordenadas -->
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label for="latitude" class="block text-sm font-medium text-gray-700 mb-1">
                          Latitude
                        </label>
                        <input
                          id="latitude"
                          v-model.number="formData.latitude"
                          type="number"
                          step="any"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>
                      <div>
                        <label for="longitude" class="block text-sm font-medium text-gray-700 mb-1">
                          Longitude
                        </label>
                        <input
                          id="longitude"
                          v-model.number="formData.longitude"
                          type="number"
                          step="any"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>
                    </div>

                    <!-- Horários -->
                    <SchedulesManager v-model="schedulesArray" />

                    <!-- Descrição -->
                    <div>
                      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        id="description"
                        v-model="formData.description"
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <!-- Pastores -->
                    <PastorsManager v-model="formData.pastors" />

                    <!-- Email -->
                    <div>
                      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                        Email do Responsável *
                      </label>
                      <input
                        id="email"
                        v-model="formData.responsible_email"
                        type="email"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                    </div>

                    <!-- Redes Sociais -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label for="website" class="block text-sm font-medium text-gray-700 mb-1">
                          Website
                        </label>
                        <input
                          id="website"
                          v-model="socialMedia.website"
                          type="url"
                          placeholder="https://..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>

                      <div>
                        <label for="instagram" class="block text-sm font-medium text-gray-700 mb-1">
                          Instagram
                        </label>
                        <input
                          id="instagram"
                          v-model="socialMedia.instagram"
                          type="url"
                          placeholder="https://instagram.com/..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>

                      <div>
                        <label for="youtube" class="block text-sm font-medium text-gray-700 mb-1">
                          YouTube
                        </label>
                        <input
                          id="youtube"
                          v-model="socialMedia.youtube"
                          type="url"
                          placeholder="https://youtube.com/..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>

                      <div>
                        <label for="spotify" class="block text-sm font-medium text-gray-700 mb-1">
                          Spotify
                        </label>
                        <input
                          id="spotify"
                          v-model="socialMedia.spotify"
                          type="url"
                          placeholder="https://spotify.com/..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Right Column - Map Preview -->
                  <div class="lg:col-span-1">
                    <div class="sticky top-4">
                      <h3 class="text-sm font-medium text-gray-700 mb-2">
                        Preview do Mapa
                      </h3>
                      <GoogleMapPreview
                        :latitude="formData.latitude"
                        :longitude="formData.longitude"
                        :zoom="15"
                        placeholder="Geocodifique o endereço para ver o mapa"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <!-- Footer Actions -->
            <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                @click="handleClose"
                class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                @click="handleSave"
                :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type Church = Database['public']['Tables']['churches']['Row']
type Jurisdiction = Database['public']['Tables']['jurisdictions']['Row']

interface Props {
  isOpen: boolean
  church: Church
  jurisdictions: Jurisdiction[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

const { getToken } = useAdminAuth()

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Form data with all editable fields
const formData = ref({
  name: '',
  jurisdiction_id: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: 0,
  longitude: 0,
  schedules: [] as any[],
  description: '',
  pastors: [] as string[],
  responsible_email: '',
  social_media: {} as Record<string, any>,
})

// Helper refs
const socialMedia = ref({
  website: '',
  instagram: '',
  youtube: '',
  spotify: '',
})

// Schedules as structured array
interface Schedule {
  day: string
  time: string
}
const schedulesArray = ref<Schedule[]>([])

// Watch for church changes and initialize form
watch(() => props.church, (newChurch) => {
  if (newChurch) {
    initializeForm(newChurch)
  }
}, { immediate: true })

function initializeForm(church: Church) {
  formData.value = {
    name: church.name,
    jurisdiction_id: church.jurisdiction_id,
    address: church.address,
    city: church.city,
    state: church.state,
    postal_code: church.postal_code,
    latitude: church.latitude,
    longitude: church.longitude,
    schedules: (church.schedules || []) as any[],
    description: church.description || '',
    pastors: church.pastors || [],
    responsible_email: church.responsible_email,
    social_media: church.social_media || {},
  }

  // Parse pastors array
  formData.value.pastors = Array.isArray(church.pastors) ? church.pastors : []

  // Parse schedules - handle different formats
  if (Array.isArray(church.schedules)) {
    // If elements are objects with day/time, use directly
    const firstItem = church.schedules[0]
    if (firstItem && typeof firstItem === 'object' && 'day' in firstItem && 'time' in firstItem) {
      schedulesArray.value = church.schedules as Schedule[]
    }
    else {
      // If elements are strings, try to parse or use as-is
      schedulesArray.value = church.schedules.map((s: any) => {
        if (typeof s === 'string') {
          // Try to split "Domingo 10h" format
          const parts = s.split(' ')
          return { day: parts[0] || '', time: parts.slice(1).join(' ') || '' }
        }
        return { day: '', time: String(s) }
      })
    }
  }
  else if (church.schedules && typeof church.schedules === 'object') {
    // If it's an object with day/time keys
    const entries = Object.entries(church.schedules)
    if (entries.length > 0) {
      schedulesArray.value = entries.map(([day, time]) => ({
        day,
        time: String(time),
      }))
    }
    else {
      schedulesArray.value = []
    }
  }
  else {
    schedulesArray.value = []
  }

  // Parse social media - handle both object and nested structure
  const sm = (church.social_media as Record<string, any>) || {}
  socialMedia.value = {
    website: sm.website || '',
    instagram: sm.instagram || '',
    youtube: sm.youtube || '',
    spotify: sm.spotify || '',
  }

  errorMessage.value = ''
  successMessage.value = ''
}

async function handleSave() {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // Filter out empty schedules and pastors
    const validSchedules = schedulesArray.value.filter(s => s.day.trim() || s.time.trim())
    const validPastors = formData.value.pastors.filter(p => p.trim())

    // Prepare update data
    const updateData = {
      name: formData.value.name,
      jurisdiction_id: formData.value.jurisdiction_id,
      address: formData.value.address,
      city: formData.value.city,
      state: formData.value.state,
      postal_code: formData.value.postal_code,
      latitude: formData.value.latitude,
      longitude: formData.value.longitude,
      schedules: validSchedules,
      description: formData.value.description || null,
      pastors: validPastors,
      responsible_email: formData.value.responsible_email,
      social_media: socialMedia.value,
    }

    await $fetch(`/api/admin/churches/${props.church.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: updateData,
    })

    successMessage.value = 'Igreja atualizada com sucesso!'

    setTimeout(() => {
      emit('success')
      emit('close')
    }, 1500)
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || error.message || 'Erro ao atualizar igreja'
    console.error('Error updating church:', error)
  }
  finally {
    isLoading.value = false
  }
}

function handleClose() {
  if (!isLoading.value) {
    emit('close')
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
