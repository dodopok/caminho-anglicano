export default defineNuxtConfig({
  // Layer do localizador de igrejas
  routeRules: {
    '/api/churches': { swr: 60 }, // Cache de 60 segundos
    '/api/jurisdictions': { swr: 3600 } // Cache de 1 hora
  }
})
