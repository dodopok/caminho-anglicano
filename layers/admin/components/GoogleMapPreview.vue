<template>
  <div class="map-container">
    <div v-if="!latitude || !longitude" class="map-placeholder">
      <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="mt-2 text-sm text-gray-500">
        {{ placeholder }}
      </p>
    </div>
    <div v-else ref="mapContainer" class="map-canvas" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  latitude?: number | null
  longitude?: number | null
  placeholder?: string
  zoom?: number
}

const props = withDefaults(defineProps<Props>(), {
  latitude: null,
  longitude: null,
  placeholder: 'Coordenadas não disponíveis',
  zoom: 15,
})

const config = useRuntimeConfig()
const mapContainer = ref<HTMLDivElement>()
const map = ref<unknown>()
const marker = ref<unknown>()
const isLoading = ref(false)

// Initialize map when coordinates are available
watch([() => props.latitude, () => props.longitude], () => {
  if (props.latitude && props.longitude && mapContainer.value) {
    initMap()
  }
}, { immediate: true })

onMounted(() => {
  if (props.latitude && props.longitude) {
    initMap()
  }
})

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject()

  return new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>
    const google = win.google as Record<string, unknown> | undefined
    const maps = google?.maps as Record<string, unknown> | undefined
    if (maps?.Map) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.public.googleMapsApiKey}`
    script.async = true
    script.defer = true
    script.onload = () => {
      const win = window as unknown as Record<string, unknown>
      const google = win.google as Record<string, unknown> | undefined
      const maps = google?.maps as Record<string, unknown> | undefined
      if (maps?.Map) {
        resolve()
      } else {
        reject(new Error('Google Maps failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

async function initMap() {
  if (!props.latitude || !props.longitude || !mapContainer.value || isLoading.value) {
    return
  }

  isLoading.value = true

  try {
    await loadGoogleMapsScript()

    const position = {
      lat: props.latitude,
      lng: props.longitude,
    }

    // Create or update map
    if (!map.value) {
      const win = window as unknown as Record<string, unknown>
      const google = win.google as Record<string, unknown> | undefined
      const maps = google?.maps as Record<string, unknown> | undefined
      if (!google || !maps) {
        console.error('Google Maps not loaded')
        return
      }

      const Map = maps.Map as new (element: HTMLElement, options: Record<string, unknown>) => Record<string, unknown>
      const Marker = maps.Marker as new (options: Record<string, unknown>) => Record<string, unknown>

      map.value = new Map(mapContainer.value, {
        center: position,
        zoom: props.zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      })

      marker.value = new Marker({
        position,
        map: map.value,
        title: 'Localização',
      })
    }
    else {
      // Update existing map
      const mapObj = map.value as Record<string, unknown>
      if (typeof mapObj.setCenter === 'function') {
        mapObj.setCenter(position)
      }
      if (marker.value) {
        const markerObj = marker.value as Record<string, unknown>
        if (typeof markerObj.setPosition === 'function') {
          markerObj.setPosition(position)
        }
      }
    }
  }
  catch (error) {
    console.error('Error loading Google Maps:', error)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 200px;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
}

.map-canvas {
  width: 100%;
  height: 100%;
}
</style>
