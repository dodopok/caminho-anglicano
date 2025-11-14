<template>
  <BaseModal
    :is-open="isOpen"
    title="Editar Igreja"
    max-width="6xl"
    :loading="isLoading"
    loading-text="Salvando alterações..."
    @close="handleClose"
  >
    <!-- Form -->
    <form class="space-y-6" @submit.prevent="handleSave">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Form Fields -->
        <div class="lg:col-span-2 space-y-6">
                    <!-- Nome -->
                    <BaseInput
                      v-model="formData.name"
                      label="Nome da Igreja"
                      required
                    />

                    <!-- Jurisdição -->
                    <BaseSelect
                      v-model="formData.jurisdiction_id"
                      label="Jurisdição"
                      :options="jurisdictionOptions"
                      placeholder="Selecione uma jurisdição"
                      required
                    />

                    <!-- Endereço -->
                    <BaseTextarea
                      v-model="formData.address"
                      label="Endereço Completo"
                      :rows="2"
                      required
                      hint="Ao salvar, as coordenadas serão atualizadas automaticamente no servidor"
                    />

                    <!-- Cidade, Estado, CEP -->
                    <div class="grid grid-cols-3 gap-4">
                      <BaseInput
                        v-model="formData.city"
                        label="Cidade"
                        readonly
                      />
                      <BaseInput
                        v-model="formData.state"
                        label="Estado"
                        readonly
                      />
                      <BaseInput
                        v-model="formData.postal_code"
                        label="CEP"
                        readonly
                      />
                    </div>

                    <!-- Coordenadas -->
                    <div class="grid grid-cols-2 gap-4">
                      <BaseInput
                        v-model="formData.latitude"
                        label="Latitude"
                        type="number"
                        step="any"
                      />
                      <BaseInput
                        v-model="formData.longitude"
                        label="Longitude"
                        type="number"
                        step="any"
                      />
                    </div>

                    <!-- Horários -->
                    <SchedulesManager v-model="schedulesArray" />

                    <!-- Descrição -->
                    <BaseTextarea
                      v-model="formData.description"
                      label="Descrição"
                      :rows="3"
                    />

                    <!-- Pastores -->
                    <PastorsManager v-model="formData.pastors" />

                    <!-- Email -->
                    <BaseInput
                      v-model="formData.responsible_email"
                      label="Email do Responsável"
                      type="email"
                      required
                    />

                    <!-- Redes Sociais -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <BaseInput
                        v-model="socialMedia.website"
                        label="Website"
                        type="url"
                        placeholder="https://..."
                      />
                      <BaseInput
                        v-model="socialMedia.instagram"
                        label="Instagram"
                        type="url"
                        placeholder="https://instagram.com/..."
                      />
                      <BaseInput
                        v-model="socialMedia.youtube"
                        label="YouTube"
                        type="url"
                        placeholder="https://youtube.com/..."
                      />
                      <BaseInput
                        v-model="socialMedia.spotify"
                        label="Spotify"
                        type="url"
                        placeholder="https://spotify.com/..."
                      />
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

    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton
          variant="secondary"
          @click="handleClose"
        >
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          :loading="isLoading"
          @click="handleSave"
        >
          Salvar Alterações
        </BaseButton>
      </div>
    </template>
  </BaseModal>
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

// Computed for jurisdiction options
const jurisdictionOptions = computed(() => {
  return props.jurisdictions.map(j => ({
    value: j.id,
    label: j.name,
  }))
})

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
}

async function handleSave() {
  isLoading.value = true

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

    alert('✅ Igreja atualizada com sucesso!')
    emit('success')
    emit('close')
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar igreja'
    alert(`❌ ${message}`)
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
