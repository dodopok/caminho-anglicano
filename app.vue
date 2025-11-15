<template>
  <VitePwaManifest />
  <Analytics />
  <div class="min-h-screen flex flex-col">
    <NuxtPage />
  </div>

  <PwaInstallPrompt v-if="$pwa.showInstallPrompt"/>
</template>

<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';

useHead({
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-4509983CLQ',
      async: true
    },
    {
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-4509983CLQ');
      `
    }
  ]
})
</script>

<style>
/* CSS crítico inline para prevenir FOUC */
html {
  opacity: 1;
}

/* Reset básico inline antes do Tailwind carregar */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
