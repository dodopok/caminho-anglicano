export default defineNuxtConfig({
  // Layer do localizador de igrejas
  routeRules: {
    // IMPORTANTE: /api/churches aceita filtros por query string (search, city,
    // ids) e por isso NÃO pode ser cacheado. O cache de borda é chaveado pelo
    // caminho, então todas as variações passariam a receber a lista completa.
    // Filtros que precisam de cache têm rotas próprias baseadas em path:
    '/api/churches/state/**': { swr: 3600 }, // Cache de 1 hora - por estado
    '/api/churches/jurisdiction/**': { swr: 3600 }, // Cache de 1 hora - por jurisdição
    '/api/churches/slug/**': { swr: 3600 }, // Cache de 1 hora - busca por slug
    '/api/churches/locations': { swr: 3600 }, // Cache de 1 hora - diretório de localidades
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
