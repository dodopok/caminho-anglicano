import type { User } from 'firebase/auth'

// Mock mode only (layers/ordo/.playground): stands in for the ordo layer's
// Firebase plugin, which nuxt.config.ts removes here, with a signed-in fake
// operator whose token the mocked API accepts. Open a page with
// `?mock=sem-sessao` to see the login screen.
//
// Guarded twice: it only exists in the playground, and it refuses to sign
// anyone in outside the developer's own machine.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export default defineNuxtPlugin({
  name: 'ordo-portal-mock-auth',
  enforce: 'pre',
  setup () {
    const config = useRuntimeConfig()
    const firebase = { app: null, auth: null }

    if (!config.public.ordoPortalMock || !LOCAL_HOSTS.has(window.location.hostname)) {
      console.error('[portal mock] sessão falsa recusada fora de localhost')
      return { provide: { firebase } }
    }

    const signedOut = new URLSearchParams(window.location.search).get('mock') === 'sem-sessao'
    const fake = {
      uid: 'mock-admin',
      displayName: 'Operador (mock)',
      email: 'operador@example.com',
      photoURL: null,
      getIdToken: async () => 'mock-token'
    } as unknown as User

    useState<User | null>('firebase-user').value = signedOut ? null : fake
    useState('firebase-loading').value = false
    useState('firebase-auth-ready').value = true
    // useFirebaseAuth only listens to Firebase when nobody has yet.
    useState('firebase-auth-listener-started').value = true

    return { provide: { firebase } }
  }
})
