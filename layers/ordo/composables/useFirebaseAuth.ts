import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from 'firebase/auth'

const LOGIN_PATH = '/portal-do-ordo/login'

export const useFirebaseAuth = () => {
  const nuxtApp = useNuxtApp()
  const route = useRoute()
  const user = useState<User | null>('firebase-user', () => null)
  const loading = useState('firebase-loading', () => true)
  const ready = useState('firebase-auth-ready', () => false)
  const error = useState<string | null>('firebase-error', () => null)
  const listenerStarted = useState('firebase-auth-listener-started', () => false)
  const invalidating = useState('firebase-auth-invalidating', () => false)

  const getAuth = (): Auth | null => {
    if (import.meta.server) return null

    if (!nuxtApp.$firebase?.auth) {
      console.error('Firebase not initialized')
      return null
    }

    return nuxtApp.$firebase.auth
  }

  if (import.meta.client && !listenerStarted.value) {
    listenerStarted.value = true
    const auth = getAuth()

    if (auth) {
      onIdTokenChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
        ready.value = true
      })
    } else {
      loading.value = false
      ready.value = true
    }
  }

  const waitForAuth = async () => {
    if (import.meta.server || ready.value) return

    await new Promise<void>((resolve) => {
      const stop = watch(ready, (isReady) => {
        if (isReady) {
          stop()
          resolve()
        }
      })
    })
  }

  const clearSession = async () => {
    const auth = getAuth()

    try {
      if (auth?.currentUser) {
        await signOut(auth)
      }
    } catch (err) {
      // A revoked/expired Firebase session should still be cleared locally.
      console.warn('Firebase signOut failed while clearing the session:', err)
    } finally {
      user.value = null
      loading.value = false
      error.value = null
    }
  }

  const redirectToLogin = async () => {
    if (import.meta.client && route.path !== LOGIN_PATH) {
      await navigateTo(LOGIN_PATH, { replace: true })
    }
  }

  const invalidateSession = async () => {
    if (invalidating.value) return

    invalidating.value = true
    try {
      await clearSession()
      await redirectToLogin()
    } finally {
      invalidating.value = false
    }
  }

  const loginWithGoogle = async () => {
    try {
      const auth = getAuth()
      if (!auth) {
        throw new Error('Firebase não inicializado')
      }

      error.value = null
      loading.value = true
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      user.value = result.user
      ready.value = true
      return result.user
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Erro ao fazer login com Google'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await clearSession()
      await redirectToLogin()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Erro ao fazer logout'
      throw err
    }
  }

  const getToken = async (forceRefresh = false): Promise<string | null> => {
    if (!user.value) return null

    try {
      return await user.value.getIdToken(forceRefresh)
    } catch (err) {
      console.warn('Unable to refresh the Firebase ID token:', err)
      await invalidateSession()
      return null
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    ready: readonly(ready),
    error: readonly(error),
    loginWithGoogle,
    logout,
    invalidateSession,
    getToken,
    waitForAuth
  }
}
