<script setup lang="ts">
import type { Church } from '../types/church'

interface Props {
  church: Church
}

const props = defineProps<Props>()

// Normalize social media URLs
const normalizeInstagramUrl = (instagram: string): string => {
  if (!instagram) return ''
  if (instagram.startsWith('http://') || instagram.startsWith('https://')) {
    return instagram
  }
  const username = instagram.replace('@', '').trim()
  return `https://www.instagram.com/${username}`
}

const normalizeWebsiteUrl = (website: string): string => {
  if (!website) return ''
  if (website.startsWith('http://') || website.startsWith('https://')) {
    return website
  }
  return `https://${website}`
}

const getInstagramUsername = (instagram: string): string => {
  if (!instagram) return ''
  const username = instagram.replace('@', '').trim()
  if (username.includes('instagram.com/')) {
    return username.split('instagram.com/')[1].split('/')[0].split('?')[0]
  }
  return username
}

// Google Maps direction URL
const googleMapsUrl = computed(() => {
  const query = encodeURIComponent(`${props.church.address}, ${props.church.city}, ${props.church.state}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
})

// Format schedules for display
const formattedSchedules = computed(() => {
  if (!props.church.schedules || props.church.schedules.length === 0) {
    return []
  }
  return props.church.schedules.map(schedule => {
    if (typeof schedule === 'string') {
      return schedule
    }
    return `${schedule.day}: ${schedule.time}`
  })
})

// Breadcrumb
const breadcrumbs = computed(() => [
  { label: 'Início', to: '/' },
  { label: 'Localizador', to: '/localizador' },
  { label: props.church.name, to: `/igrejas/${props.church.jurisdiction?.slug}/${props.church.slug}` }
])
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg overflow-hidden">
    <!-- Header with jurisdiction color -->
    <div
      class="h-2"
      :style="{ backgroundColor: church.jurisdiction?.color || '#6366f1' }"
    ></div>

    <!-- Breadcrumb -->
    <nav class="px-6 py-3 bg-gray-50 border-b border-gray-200">
      <ol class="flex items-center space-x-2 text-sm">
        <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center">
          <NuxtLink
            v-if="index < breadcrumbs.length - 1"
            :to="crumb.to"
            class="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span v-else class="text-gray-700 font-medium">{{ crumb.label }}</span>
          <svg
            v-if="index < breadcrumbs.length - 1"
            class="w-4 h-4 mx-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </li>
      </ol>
    </nav>

    <!-- Main content -->
    <div class="p-6 sm:p-8">
      <!-- Church name and jurisdiction -->
      <div class="mb-6">
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          {{ church.name }}
        </h1>
        <div v-if="church.jurisdiction" class="inline-flex items-center">
          <span
            class="px-3 py-1 rounded-full text-sm font-medium text-white"
            :style="{ backgroundColor: church.jurisdiction.color }"
          >
            {{ church.jurisdiction.name }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <div v-if="church.description" class="mb-8">
        <p class="text-lg text-gray-700 leading-relaxed">
          {{ church.description }}
        </p>
      </div>

      <!-- Grid layout for details -->
      <div class="grid md:grid-cols-2 gap-8 mb-8">
        <!-- Location -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center">
            <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Localização
          </h2>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-gray-700 mb-2">
              📍 {{ church.address }}
            </p>
            <p class="text-gray-600 text-sm">
              {{ church.city }} - {{ church.state }}
              <template v-if="church.postalCode">
                • CEP: {{ church.postalCode }}
              </template>
            </p>
            <a
              :href="googleMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Como chegar
            </a>
          </div>
        </div>

        <!-- Schedules -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center">
            <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Horários dos Cultos
          </h2>
          <div class="bg-gray-50 rounded-lg p-4">
            <ul v-if="formattedSchedules.length > 0" class="space-y-2">
              <li
                v-for="(schedule, index) in formattedSchedules"
                :key="index"
                class="text-gray-700 flex items-start"
              >
                <span class="text-blue-600 mr-2">•</span>
                <span>{{ schedule }}</span>
              </li>
            </ul>
            <p v-else class="text-gray-500 italic">
              Horários não informados
            </p>
          </div>
        </div>
      </div>

      <!-- Pastors -->
      <div v-if="church.pastors && church.pastors.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Liderança
        </h2>
        <div class="bg-gray-50 rounded-lg p-4">
          <ul class="space-y-2">
            <li
              v-for="(pastor, index) in church.pastors"
              :key="index"
              class="text-gray-700"
            >
              {{ pastor }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Social Media Links -->
      <div v-if="church.socialMedia && Object.keys(church.socialMedia).some(key => church.socialMedia[key])" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Redes Sociais
        </h2>
        <div class="flex flex-wrap gap-3">
          <a
            v-if="church.socialMedia.website"
            :href="normalizeWebsiteUrl(church.socialMedia.website)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Website
          </a>

          <a
            v-if="church.socialMedia.instagram"
            :href="normalizeInstagramUrl(church.socialMedia.instagram)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </a>

          <a
            v-if="church.socialMedia.youtube"
            :href="church.socialMedia.youtube"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            YouTube
          </a>

          <a
            v-if="church.socialMedia.spotify"
            :href="church.socialMedia.spotify"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </a>
        </div>
      </div>

      <!-- Instagram Feed Section (will be implemented next) -->
      <div v-if="church.socialMedia?.instagram" id="instagram-feed" class="mb-8">
        <InstagramFeed :username="getInstagramUsername(church.socialMedia.instagram)" />
      </div>

      <!-- Contact -->
      <div class="border-t border-gray-200 pt-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contato
        </h2>
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-gray-700">
            <span class="font-medium">Email:</span>
            <a :href="`mailto:${church.responsibleEmail}`" class="text-blue-600 hover:underline ml-2">
              {{ church.responsibleEmail }}
            </a>
          </p>
        </div>
      </div>

      <!-- Back to locator -->
      <div class="mt-8 text-center">
        <NuxtLink
          to="/localizador"
          class="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar ao Localizador
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
