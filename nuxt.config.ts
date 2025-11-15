// https://nuxt.com/docs/api/configuration/nuxt-config
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
    './layers/admin'
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
      '/portal-do-douglas/**'
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

      // Rotas principais com maior prioridade
      const mainRoutes = [
        { loc: '/', lastmod: new Date(), changefreq: 'weekly' as const, priority: 1 as const },
        { loc: '/glossario', lastmod: new Date(), changefreq: 'weekly' as const, priority: 0.9 as const },
        { loc: '/localizador', lastmod: new Date(), changefreq: 'daily' as const, priority: 0.9 as const }
      ]

      return [...mainRoutes, ...jurisdictionRoutes, ...glossaryRoutes]
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
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        // Favicon
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
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

  // Configuração do Nitro para deploy na Vercel
  nitro: {
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: ['/glossario']
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
    }
  },

  runtimeConfig: {
    // Chaves privadas do servidor
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    adminEmail: process.env.ADMIN_EMAIL,
    googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,

    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
    }
  }
})
