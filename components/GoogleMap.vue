<script setup lang="ts">
import type { Church, Jurisdiction } from '~/types/church'

interface Props {
  churches: Church[]
  selectedChurchId?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  selectChurch: [churchId: string]
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<any>(null)
const markers = ref<any[]>([])

const jurisdictionColors: Record<Jurisdiction, string> = {
  IAB: '#3B82F6',
  IEAB: '#10B981',
  IECB: '#F59E0B',
  IARB: '#EF4444',
  REB: '#8B5CF6'
}

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject()

  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.Map) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.public.googleMapsApiKey}&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = () => {
      if ((window as any).google?.maps?.Map) {
        resolve()
      } else {
        reject(new Error('Google Maps failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

async function initializeMap() {
  if (!mapContainer.value || typeof window === 'undefined') return

  try {
    await loadGoogleMapsScript()

    const google = (window as any).google
    const brazilCenter = { lat: -14.235004, lng: -51.92528 }

    mapInstance.value = new google.maps.Map(mapContainer.value, {
      center: brazilCenter,
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    })

    updateMarkers()
  } catch (error) {
    console.error('Error loading Google Maps:', error)
  }
}

function updateMarkers() {
  if (!mapInstance.value || typeof window === 'undefined') return

  const google = (window as any).google
  if (!google?.maps) return

  markers.value.forEach((marker: any) => marker.setMap(null))
  markers.value = []

  const bounds = new google.maps.LatLngBounds()

  props.churches.forEach(church => {
    const marker = new google.maps.Marker({
      position: { lat: church.latitude, lng: church.longitude },
      map: mapInstance.value,
      title: church.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: jurisdictionColors[church.jurisdiction],
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    })

    marker.addListener('click', () => {
      emit('selectChurch', church.id)
    })

    markers.value.push(marker)
    bounds.extend(marker.getPosition())
  })

  if (props.churches.length > 0) {
    mapInstance.value.fitBounds(bounds)

    // Prevent zooming in too much for single marker
    const listener = google.maps.event.addListener(mapInstance.value, 'idle', () => {
      if (props.churches.length === 1 && mapInstance.value.getZoom() > 15) {
        mapInstance.value.setZoom(15)
      }
      google.maps.event.removeListener(listener)
    })
  }
}

watch(() => props.churches, updateMarkers, { deep: true })

watch(() => props.selectedChurchId, (newId) => {
  if (!newId || !mapInstance.value) return

  const church = props.churches.find(c => c.id === newId)
  if (church) {
    mapInstance.value.panTo({ lat: church.latitude, lng: church.longitude })
    mapInstance.value.setZoom(15)
  }
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    initializeMap()
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="w-full h-full min-h-[400px] rounded-lg"
    role="application"
    aria-label="Mapa interativo de igrejas anglicanas"
  />
</template>
