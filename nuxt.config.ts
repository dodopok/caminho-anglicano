// https://nuxt.com/docs/api/configuration/nuxt-config
import { createClient } from '@supabase/supabase-js'

// Simple slugify for build-time use
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Layers do projeto
  extends: [
    './layers/base',
    './layers/localizador',
    './layers/locs',
    './layers/glossario',
    './layers/dashboard',
    './layers/admin',
    './layers/doacoes',
    './layers/ordo'
  ],

  typescript: {
    strict: true,
    typeCheck: true
  },

  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@nuxtjs/sitemap'],

  // Configuração do Tailwind
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config',
    exposeConfig: false,
    viewer: true,
  },

  // Configuração do Sitemap para SEO
  site: {
    url: 'https://caminhoanglicano.com.br'
  },

  sitemap: {
    exclude: [
      '/admin/**',
      '/dashboard/**',
      '/portal-do-douglas/**',
      '/portal-do-ordo/**'
    ],
    urls: async () => {
      // Importar dinamicamente os termos do glossário
      const { glossaryTerms } = await import('./layers/glossario/data/terms')

      // Criar URLs para cada termo do glossário
      const glossaryRoutes = glossaryTerms.map(term => ({
        loc: `/glossario/${term.id}`,
        lastmod: new Date(),
        changefreq: 'monthly' as const,
        priority: 0.7 as const
      }))

      // Rotas de jurisdições
      const jurisdictionSlugs = [
        'ieab',
        'reb',
        'iecb',
        'iarb',
        'ieub',
        'iab'
      ]

      const jurisdictionRoutes = jurisdictionSlugs.map(slug => ({
        loc: `/igrejas/${slug}`,
        lastmod: new Date(),
        changefreq: 'weekly' as const,
        priority: 0.8 as const
      }))

      // Rotas de cidades e estados (dinâmicas do banco)
      const locationRoutes: any[] = []
      const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const { data: churches } = await supabase.from('churches').select('city, state')
          
          if (churches) {
            const states = new Set<string>()
            const cities = new Set<string>()

            churches.forEach(c => {
              if (c.state) {
                const state = c.state.toLowerCase()
                states.add(state)
                locationRoutes.push({
                  loc: `/igrejas/localidade/${state}`,
                  lastmod: new Date(),
                  changefreq: 'weekly',
                  priority: 0.7
                })

                if (c.city) {
                  cities.add(`${state}/${slugify(c.city)}`)
                }
              }
            })

            Array.from(cities).forEach(cityPath => {
              locationRoutes.push({
                loc: `/igrejas/localidade/${cityPath}`,
                lastmod: new Date(),
                changefreq: 'weekly',
                priority: 0.6
              })
            })
          }
        } catch (e) {
          console.error('Erro ao gerar rotas de localização para sitemap:', e)
        }
      }

      // Rotas principais com maior prioridade
      const mainRoutes = [
        { loc: '/', lastmod: new Date(), changefreq: 'weekly' as const, priority: 1 as const },
        { loc: '/glossario', lastmod: new Date(), changefreq: 'weekly' as const, priority: 0.9 as const },
        { loc: '/localizador', lastmod: new Date(), changefreq: 'daily' as const, priority: 0.9 as const }
      ]

      return [...mainRoutes, ...jurisdictionRoutes, ...glossaryRoutes, ...locationRoutes]
    }
  },


  app: {
    head: {
      htmlAttrs: {
        lang: 'pt-BR'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
        // PWA meta tags
        { name: 'theme-color', content: '#8B4513' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Caminho Anglicano' }
      ],
      link: [
        // Favicon - Google Search requer mínimo 48x48
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // Web App Manifest
        { rel: 'manifest', href: '/site.webmanifest' },
        // Preconnect para Google Fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },

  // Otimizações de build para CSS
  vite: {
    css: {
      devSourcemap: false
    }
  },

  // Configuração do Nitro para deploy na Vercel
  nitro: {
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: ['/glossario']
    },
    routeRules: {
      '/locs/**': {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    }
  },

  // Hooks para gerar rotas do glossário estaticamente
  hooks: {
    async 'nitro:config'(nitroConfig) {
      // Importar dinamicamente os termos do glossário
      const { glossaryTerms } = await import('./layers/glossario/data/terms')

      // Adicionar todas as rotas dos termos ao prerender
      const glossaryRoutes = glossaryTerms.map(term => `/glossario/${term.id}`)

      if (!nitroConfig.prerender) {
        nitroConfig.prerender = { routes: [] }
      }
      if (!nitroConfig.prerender.routes) {
        nitroConfig.prerender.routes = []
      }

      nitroConfig.prerender.routes.push(...glossaryRoutes)

      // Adicionar rotas de cidades e estados ao prerender
      const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const { data: churches } = await supabase.from('churches').select('city, state')
          
          if (churches) {
            const stateRoutes = new Set<string>()
            const cityRoutes = new Set<string>()

            churches.forEach(c => {
              if (c.state) {
                stateRoutes.add(`/igrejas/localidade/${c.state.toLowerCase()}`)
                if (c.city) {
                  cityRoutes.add(`/igrejas/localidade/${c.state.toLowerCase()}/${slugify(c.city)}`)
                }
              }
            })

            nitroConfig.prerender.routes.push(...Array.from(stateRoutes))
            nitroConfig.prerender.routes.push(...Array.from(cityRoutes))
          }
        } catch (e) {
          console.error('Erro ao gerar rotas de localização para prerender:', e)
        }
      }
    }
  },

  runtimeConfig: {
    // Chaves privadas do servidor
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    adminEmail: process.env.ADMIN_EMAIL,
    geoapifyApiKey: process.env.GEOAPIFY_API_KEY,
    googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    abacatepayApiKey: process.env.ABACATEPAY_API_KEY,

    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
    }
  }
})
