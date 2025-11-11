// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: true
  },

  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],

  // Configuração do Tailwind
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config',
    exposeConfig: false,
    viewer: true,
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'pt-BR'
      },
      link: [
        // Preconnect para Google Fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
      ]
    }
  },

  // Otimizações de build para CSS
  vite: {
    css: {
      devSourcemap: false
    }
  },

  runtimeConfig: {
    // Chaves privadas do servidor
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
    }
  },

  // Cache da API
  routeRules: {
    '/api/churches': { swr: 60 }, // Cache de 60 segundos
    '/api/jurisdictions': { swr: 3600 } // Cache de 1 hora
  }
})
