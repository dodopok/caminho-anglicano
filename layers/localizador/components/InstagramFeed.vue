<script setup lang="ts">
interface Props {
  username: string
}

const props = defineProps<Props>()

const cleanUsername = computed(() => {
  return props.username.replace('@', '').trim()
})

const instagramProfileUrl = computed(() => {
  return `https://www.instagram.com/${cleanUsername.value}`
})

// Load Instagram embed script
onMounted(() => {
  // Check if script already exists
  if (document.querySelector('script[src*="instagram.com/embed.js"]')) {
    // If exists, just process the embeds
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process()
    }
    return
  }

  // Load Instagram embed script
  const script = document.createElement('script')
  script.src = 'https://www.instagram.com/embed.js'
  script.async = true
  document.body.appendChild(script)
})
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-gray-900 flex items-center">
      <svg class="w-6 h-6 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
      Instagram
    </h2>

    <div class="bg-gray-50 rounded-lg p-6">
      <!-- Instagram Profile Link -->
      <div class="mb-4 text-center">
        <a
          :href="instagramProfileUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition font-medium"
        >
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Ver perfil @{{ cleanUsername }}
        </a>
      </div>

      <!-- Instagram Embed Widget -->
      <div class="flex justify-center">
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/{{ cleanUsername }}/"
          data-instgrm-version="14"
          style="max-width: 540px; width: 100%;"
        >
          <div style="padding: 16px;">
            <a
              :href="instagramProfileUrl"
              target="_blank"
              rel="noopener noreferrer"
              style="color: #3897f0; font-family: Arial, sans-serif; font-size: 14px; text-decoration: none;"
            >
              Ver no Instagram
            </a>
          </div>
        </blockquote>
      </div>

      <!-- Fallback message -->
      <p class="text-sm text-gray-500 text-center mt-4">
        Siga @{{ cleanUsername }} para ver as últimas atualizações da igreja
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Ensure Instagram embeds are responsive */
.instagram-media {
  margin: 0 auto !important;
}
</style>
