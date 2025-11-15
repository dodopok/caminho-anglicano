export default defineNuxtConfig({
  // Layer do localizador de igrejas
  routeRules: {
    // Removido cache de /api/churches pois aceita query parameters (jurisdiction, search)
    // e o SWR não considera os parâmetros, causando resultados incorretos
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
