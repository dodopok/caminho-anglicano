<script setup lang="ts">
import type { Church, ChurchSchedule } from '../types/church'

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
const { getJurisdictionById, getJurisdictionColor } = useJurisdictions()
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = shallowRef<any>(null)
const markers = ref<any[]>([])
const userMarker = ref<any>(null)
const infoWindow = ref<any>(null)

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371
  const dLat = degreesToRadians(lat2 - lat1)
  const dLon = degreesToRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function normalizeInstagramUrl(instagram: string): string {
  if (!instagram) return ''
  
  // Se já é uma URL completa, retorna como está
  if (instagram.startsWith('http://') || instagram.startsWith('https://')) {
    return instagram
  }
  
  // Remove @ se tiver
  const username = instagram.replace('@', '').trim()
  
  // Retorna URL completa do Instagram
  return `https://www.instagram.com/${username}`
}

function normalizeYoutubeUrl(youtube: string): string {
  if (!youtube) return ''
  
  // Se já é uma URL completa, retorna como está
  if (youtube.startsWith('http://') || youtube.startsWith('https://')) {
    return youtube
  }
  
  // Remove @ se tiver
  const handle = youtube.replace('@', '').trim()
  
  // Retorna URL completa do YouTube
  return `https://www.youtube.com/@${handle}`
}

function formatSchedules(schedules: ChurchSchedule[]): string {
  if (!schedules || schedules.length === 0) return 'Não informado'

  return schedules.map(s => `${s.day} às ${s.time}`).join('<br>')
}

function createInfoWindowContent(church: Church): string {
  const jurisdiction = getJurisdictionById(church.jurisdictionId)
  const jurisdictionColor = jurisdiction?.color || '#6B7280'
  const jurisdictionSlug = (jurisdiction?.slug || '').toLowerCase()

  let socialMediaHtml = ''
  if (church.socialMedia) {
    const links = []
    if (church.socialMedia.website) {
      links.push(`<a href="${church.socialMedia.website}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800">Site</a>`)
    }
    if (church.socialMedia.instagram) {
      const instagramUrl = normalizeInstagramUrl(church.socialMedia.instagram)
      links.push(`<a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800">Instagram</a>`)
    }
    if (church.socialMedia.youtube) {
      const youtubeUrl = normalizeYoutubeUrl(church.socialMedia.youtube)
      links.push(`<a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800">YouTube</a>`)
    }
    if (church.socialMedia.spotify) {
      links.push(`<a href="${church.socialMedia.spotify}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800">Spotify</a>`)
    }
    if (links.length > 0) {
      socialMediaHtml = `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">Redes Sociais:</div>
          <div>${links.join(' • ')}</div>
        </div>
      `
    }
  }

  let pastorsHtml = ''
  if (church.pastors && church.pastors.length > 0) {
    pastorsHtml = `
      <div style="margin-top: 8px;">
        <span style="font-weight: 600; color: #374151;">Pastores:</span> ${church.pastors.join(', ')}
      </div>
    `
  }

  let descriptionHtml = ''
  if (church.description) {
    descriptionHtml = `
      <div style="margin-top: 8px; color: #6b7280;">
        ${church.description}
      </div>
    `
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${church.latitude},${church.longitude}`
  const churchPageUrl = `/igrejas/${jurisdictionSlug}/${church.slug}`

  return `
    <div style="max-width: 300px; padding: 4px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
        <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0; flex: 1;">
          ${church.name}
        </h3>
        <span style="padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: ${jurisdictionColor}22; color: ${jurisdictionColor}; white-space: nowrap;">
          ${jurisdictionSlug.toUpperCase()}
        </span>
      </div>

      <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
        📍 ${church.address}, ${church.city} - ${church.state}
      </div>

      ${descriptionHtml}

      <div style="margin-top: 8px; font-size: 13px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">Horários de Culto:</div>
        <div style="color: #6b7280;">${formatSchedules(church.schedules)}</div>
      </div>

      ${pastorsHtml}
      ${socialMediaHtml}

      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; gap: 6px;">
        <a
          href="${churchPageUrl}"
          style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 10px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; transition: background-color 0.2s; flex: 1; white-space: nowrap;"
          onmouseover="this.style.backgroundColor='#047857'"
          onmouseout="this.style.backgroundColor='#059669'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          Detalhes
        </a>
        <a
          href="${mapsUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 10px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; transition: background-color 0.2s; flex: 1; white-space: nowrap;"
          onmouseover="this.style.backgroundColor='#4338CA'"
          onmouseout="this.style.backgroundColor='#4F46E5'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Rota
        </a>
      </div>
    </div>
  `
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
      fullscreenControl: true,
      mapId: '15c5fc6af6a2c5bb28486504' // Using demo Map ID - AdvancedMarkerElement requires a valid Map ID
    })

    // Create InfoWindow instance
    infoWindow.value = new google.maps.InfoWindow()

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
    userMarker.value.map = null // AdvancedMarkerElement uses .map instead of .setMap()
    userMarker.value = null
  }

  // Add new user marker if location is provided
  if (props.userLocation) {
    // Create a custom element for user marker
    const userPin = document.createElement('div')
    userPin.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#4F46E5" stroke="#ffffff" stroke-width="2"/>
        <path d="M12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8ZM12 13C14.2 13 16 14.8 16 17V18H8V17C8 14.8 9.8 13 12 13Z" fill="#ffffff"/>
      </svg>
    `

    userMarker.value = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: props.userLocation.lat, lng: props.userLocation.lng },
      map: mapInstance.value,
      title: 'Você está aqui',
      content: userPin,
      zIndex: 1000
    })
  }
}

function updateMarkers() {
  if (!mapInstance.value || typeof window === 'undefined') return

  const google = (window as any).google
  if (!google?.maps) return

  // Remove all existing markers (AdvancedMarkerElement uses different API)
  markers.value.forEach((marker: any) => {
    marker.map = null // Remove from map
  })
  markers.value.length = 0 // Clear the array

  const bounds = new google.maps.LatLngBounds()
  const MAX_DISTANCE_KM = 20 // Zoom to show 20km radius when user location is set

  // If user location is set, create bounds for 20km radius around user
  if (props.userLocation) {
    // Add user location to bounds
    bounds.extend({ lat: props.userLocation.lat, lng: props.userLocation.lng })

    // Create a circle around user location to ensure proper bounds
    // Calculate points around the user at 20km distance to ensure bounds include the full radius
    const earthRadiusKm = 6371
    const radiusInDegrees = (MAX_DISTANCE_KM / earthRadiusKm) * (180 / Math.PI)

    // Add points at cardinal directions to ensure 20km radius is visible
    bounds.extend({ lat: props.userLocation.lat + radiusInDegrees, lng: props.userLocation.lng })
    bounds.extend({ lat: props.userLocation.lat - radiusInDegrees, lng: props.userLocation.lng })
    bounds.extend({ lat: props.userLocation.lat, lng: props.userLocation.lng + radiusInDegrees / Math.cos(props.userLocation.lat * Math.PI / 180) })
    bounds.extend({ lat: props.userLocation.lat, lng: props.userLocation.lng - radiusInDegrees / Math.cos(props.userLocation.lat * Math.PI / 180) })
  }
  
  props.churches.forEach((church, index) => {
    try {
      const lat = church.latitude
      const lng = church.longitude
      
      // Validate coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.warn(`Invalid coordinates for ${church.name}:`, lat, lng)
        return
      }

      // Create a custom pin element with color
      const pinElement = new google.maps.marker.PinElement({
        background: getJurisdictionColor(church.jurisdictionId),
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 0.6,
        glyph: ''
      })

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: mapInstance.value,
        title: church.name,
        content: pinElement.element,
        gmpClickable: true
      })

      // Use google.maps.event.addListener for AdvancedMarkerElement
      google.maps.event.addListener(marker, 'click', () => {
        // Open InfoWindow with church details
        if (infoWindow.value) {
          infoWindow.value.setContent(createInfoWindowContent(church))
          // For AdvancedMarkerElement, use position instead of anchor
          infoWindow.value.open({
            map: mapInstance.value,
            anchor: marker
          })
        }

        // Also emit selectChurch event for sidebar highlighting
        emit('selectChurch', church.id)
      })

      markers.value.push(marker)

      // Only extend bounds with churches if no user location (show all churches)
      if (!props.userLocation) {
        bounds.extend({ lat, lng })
      }
    } catch (error) {
      console.error(`Error creating marker for ${church.name}:`, error)
    }
  })

  updateUserMarker()

  // Fit bounds to show appropriate area only if we have churches or user location
  if (props.userLocation || props.churches.length > 0) {
    mapInstance.value.fitBounds(bounds)

    // For user location, set a reasonable zoom level
    if (props.userLocation) {
      const listener = google.maps.event.addListener(mapInstance.value, 'idle', () => {
        const zoom = mapInstance.value.getZoom()
        // Limit zoom between 11 and 14 for 20km radius view
        if (zoom > 14) {
          mapInstance.value.setZoom(14)
        } else if (zoom < 11) {
          mapInstance.value.setZoom(11)
        }
        google.maps.event.removeListener(listener)
      })
    } else {
      // For all churches view, prevent zooming in too much
      const listener = google.maps.event.addListener(mapInstance.value, 'idle', () => {
        const zoom = mapInstance.value.getZoom()
        if (zoom > 15) {
          mapInstance.value.setZoom(15)
        }
        google.maps.event.removeListener(listener)
      })
    }
  }
}

watch(() => props.churches, () => {
  updateMarkers()
}, { deep: true })

watch(() => props.userLocation, () => {
  updateMarkers()
}, { deep: true })

watch(() => props.selectedChurchId, (newId) => {
  if (!newId || !mapInstance.value) return

  const church = props.churches.find(c => c.id === newId)
  if (church) {
    // Find the marker for this church
    const markerIndex = props.churches.findIndex(c => c.id === newId)
    const marker = markers.value[markerIndex]

    if (marker && infoWindow.value) {
      // Open InfoWindow at the marker without panning or zooming
      infoWindow.value.setContent(createInfoWindowContent(church))
      infoWindow.value.open(mapInstance.value, marker)
    }
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
