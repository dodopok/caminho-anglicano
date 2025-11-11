<script setup lang="ts">
import type { Church } from '~/types/church'

interface Props {
  churches: Church[]
  selectedChurchId?: string | null
  userLocation?: { lat: number; lng: number } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  selectChurch: [churchId: string]
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<any>(null)
const markers = ref<any[]>([])
const userMarker = ref<any>(null)

function getJurisdictionColor(church: Church): string {
  return church.jurisdiction?.color || '#6B7280'
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

function updateUserMarker() {
  if (!mapInstance.value || typeof window === 'undefined') return

  const google = (window as any).google
  if (!google?.maps) return

  // Remove existing user marker
  if (userMarker.value) {
    userMarker.value.setMap(null)
    userMarker.value = null
  }

  // Add new user marker if location is provided
  if (props.userLocation) {
    userMarker.value = new google.maps.Marker({
      position: { lat: props.userLocation.lat, lng: props.userLocation.lng },
      map: mapInstance.value,
      title: 'Você está aqui',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      },
      zIndex: 1000
    })

    // Center map on user location
    mapInstance.value.panTo({ lat: props.userLocation.lat, lng: props.userLocation.lng })
    mapInstance.value.setZoom(13)
  }
}

function updateMarkers() {
  if (!mapInstance.value || typeof window === 'undefined') return

  const google = (window as any).google
  if (!google?.maps) return

  markers.value.forEach((marker: any) => marker.setMap(null))
  markers.value = []

  const bounds = new google.maps.LatLngBounds()

  // Add user location to bounds if available
  if (props.userLocation) {
    bounds.extend({ lat: props.userLocation.lat, lng: props.userLocation.lng })
  }

  props.churches.forEach(church => {
    const marker = new google.maps.Marker({
      position: { lat: church.latitude, lng: church.longitude },
      map: mapInstance.value,
      title: church.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: getJurisdictionColor(church),
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

  updateUserMarker()

  // Only fit bounds if no user location (otherwise updateUserMarker handles centering)
  if (props.churches.length > 0 && !props.userLocation) {
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

watch(() => props.userLocation, () => {
  updateUserMarker()
}, { deep: true })

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
    class="w-full h-full"
    role="application"
    aria-label="Mapa interativo de igrejas anglicanas"
  />
</template>
