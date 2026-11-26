import { fileURLToPath } from 'node:url'

// Playground of the Portal do Ordo: a minimal Nuxt app over the ordo layer
// alone, with the API and the login mocked. `pnpm portal:dev` serves it with
// HMR in seconds; `pnpm portal:shots` photographs it. See layers/ordo/README.md.
//
// Mock mode lives only here. The site (the root nuxt.config.ts) extends
// `./layers/ordo`, never this folder, and Nuxt does not scan it from the
// layer. This config also refuses to load on a deploy platform, so the fake
// session and the fixtures can never reach a production build.
if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_BUILDER) {
  throw new Error('layers/ordo/.playground é só para desenvolvimento local (modo mock): não rode na Vercel.')
}

// The portal reads the Ordo API from `ordoApiBaseUrl`; an empty base sends its
// requests to this server, where server/routes/api/v1 answers from mocks/.
// An exported real URL would only meet the fake token with a 401.
delete process.env.NUXT_PUBLIC_ORDO_API_BASE_URL

const ordoLayer = fileURLToPath(new URL('..', import.meta.url))
const firebasePlugin = fileURLToPath(new URL('../plugins/firebase.client.ts', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  extends: [ordoLayer],

  // Only what the portal needs: no devtools, telemetry, typecheck or site
  // modules (Tailwind, sitemap, ESLint), so dev boots and builds fast.
  devtools: { enabled: false },
  telemetry: false,
  typescript: { typeCheck: false },
  sourcemap: { server: false, client: false },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Portal do Ordo · playground'
    }
  },

  // The site's Tailwind preflight is the only global CSS the portal sits on
  // (portal.css is scoped to .ordo-shell). Generating only `@tailwind base`
  // keeps the screens identical without scanning the site for utilities.
  css: ['~/assets/site-base.css'],
  postcss: {
    plugins: {
      tailwindcss: {
        content: [fileURLToPath(new URL('./app.vue', import.meta.url))],
        theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Cormorant Garamond', 'serif'] } } }
      }
    }
  },

  runtimeConfig: {
    public: {
      ordoApiBaseUrl: '',
      // Read by plugins/mock-auth.client.ts; nothing outside this folder knows it.
      ordoPortalMock: true
    }
  },

  // The playground opens on the portal; the site's other pages aren't here.
  routeRules: {
    '/': { redirect: '/portal-do-ordo' }
  },

  nitro: {
    // A plain Node server for the cached build `portal:shots` starts, never
    // a deploy target.
    preset: 'node-server',
    // Bundle the fixtures with the handlers: left external, Nitro dev
    // resolves their import from the wrong folder.
    externals: { inline: [fileURLToPath(new URL('./mocks', import.meta.url))] }
  },

  hooks: {
    // The real Firebase plugin initialises Google sign-in with keys the
    // playground doesn't have; plugins/mock-auth.client.ts takes its place.
    'app:resolve'(app) {
      app.plugins = app.plugins.filter(plugin => plugin.src !== firebasePlugin)
    }
  }
})
