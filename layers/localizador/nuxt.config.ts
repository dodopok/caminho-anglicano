export default defineNuxtConfig({
  // Layer do localizador de igrejas
  routeRules: {
    '/api/churches': { swr: 60 }, // Cache de 60 segundos (controlado via headers na API)
    '/api/churches/slug/**': { swr: 3600 }, // Cache de 1 hora para páginas de igrejas
    '/api/jurisdictions': { swr: 3600 }, // Cache de 1 hora
    '/igrejas/**': { swr: 3600 } // Cache de 1 hora para páginas estáticas de igrejas
  },

  // Nitro config for prerendering
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: []
    }
  }
})
