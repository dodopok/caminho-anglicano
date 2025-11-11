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
const googleMaps = ref<any>(null)

const jurisdictionColors: Record<Jurisdiction, string> = {
  IAB: '#3B82F6',
  IEAB: '#10B981',
  IECB: '#F59E0B',
  IARB: '#EF4444'
}

async function loadGoogleMapsScript() {
  if (typeof window === 'undefined') return

  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps) {
      resolve((window as any).google.maps)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.public.googleMapsApiKey}&v=weekly&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps)
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
    const maps = await loadGoogleMapsScript()
    googleMaps.value = maps

    const brazilCenter = { lat: -14.235004, lng: -51.92528 }

    const { Map } = await (window as any).google.maps.importLibrary('maps')

    mapInstance.value = new Map(mapContainer.value, {
      center: brazilCenter,
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      mapId: 'CAMINHO_ANGLICANO_MAP'
    })

    await updateMarkers()
  } catch (error) {
    console.error('Error loading Google Maps:', error)
  }
}

async function updateMarkers() {
  if (!mapInstance.value || !googleMaps.value || typeof window === 'undefined') return

  markers.value.forEach((marker: any) => marker.setMap(null))
  markers.value = []

  const { LatLngBounds } = await (window as any).google.maps.importLibrary('core')
  const { Marker } = await (window as any).google.maps.importLibrary('marker')

  const bounds = new LatLngBounds()

  props.churches.forEach(church => {
    const marker = new Marker({
      position: { lat: church.latitude, lng: church.longitude },
      map: mapInstance.value,
      title: church.name
    })

    marker.addListener('click', () => {
      emit('selectChurch', church.id)
    })

    markers.value.push(marker)
    const position = marker.getPosition()
    if (position) {
      bounds.extend(position)
    }
  })

  if (props.churches.length > 0 && !bounds.isEmpty()) {
    mapInstance.value.fitBounds(bounds)
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
