<template>
  <Analytics />
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
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
