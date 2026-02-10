import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth
} from 'firebase/auth'

export const useFirebaseAuth = () => {
  const nuxtApp = useNuxtApp()
  const user = useState<User | null>('firebase-user', () => null)
  const loading = useState('firebase-loading', () => true)
  const error = useState<string | null>('firebase-error', () => null)

  // Get auth instance safely
  const getAuth = (): Auth | null => {
    if (process.server) return null
    if (!nuxtApp.$firebase?.auth) {
      console.error('Firebase not initialized')
      return null
    }
    return nuxtApp.$firebase.auth
  }

  // Monitor auth state (only on client)
  if (process.client) {
    const auth = getAuth()
    if (auth) {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
      })
    } else {
      loading.value = false
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
      const googleProvider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, googleProvider)
      user.value = result.user
      return result.user
    } catch (err: any) {
      error.value = err.message || 'Erro ao fazer login com Google'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      const auth = getAuth()
      if (!auth) {
        throw new Error('Firebase não inicializado')
      }

      await signOut(auth)
      user.value = null
      await navigateTo('/portal-do-ordo/login')
    } catch (err: any) {
      error.value = err.message || 'Erro ao fazer logout'
      throw err
    }
  }

  const getToken = async (): Promise<string | null> => {
    if (!user.value) return null
    try {
      return await user.value.getIdToken()
    } catch (err) {
      console.error('Error getting token:', err)
      return null
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    loginWithGoogle,
    logout,
    getToken
  }
}
