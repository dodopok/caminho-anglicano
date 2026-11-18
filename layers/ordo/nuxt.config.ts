import type { NitroRouteConfig } from 'nitropack'

// `ssr` is a Nuxt route rule. Nuxt adds it to Nitro's route config through a
// generated augmentation that only the server tsconfig loads, so the app
// typecheck of this file would reject the literal without the assertion.
const clientOnly = { ssr: false } as NitroRouteConfig

export default defineNuxtConfig({
  // Portal do Ordo - Admin Dashboard
  //
  // Client-only: the session lives in Firebase Auth in the browser, so the
  // server cannot know whether to render the dashboard or the login. With SSR
  // it rendered the dashboard (or the login in its "loading" state), and the
  // client-side `ordo-auth` redirect then hydrated a different page over that
  // HTML, leaving the login off-centre, without its colours and with the
  // button stuck on "Autenticando…" until a manual refresh.
  routeRules: {
    '/portal-do-ordo': clientOnly,
    '/portal-do-ordo/**': clientOnly
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      ordoApiBaseUrl: process.env.NUXT_PUBLIC_ORDO_API_BASE_URL || 'https://api.oficio.app'
    }
  }
})
