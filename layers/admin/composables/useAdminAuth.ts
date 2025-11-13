import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export function useAdminAuth() {
  const config = useRuntimeConfig()
  const user = useState<User | null>('admin-user', () => null)
  const loading = useState<boolean>('admin-auth-loading', () => true)

  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
  )

  /**
   * Initialize auth state on mount
   */
  async function initialize() {
    loading.value = true

    try {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        user.value = data.session.user
      }
    }
    catch (error) {
      console.error('Error initializing auth:', error)
      user.value = null
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string) {
    loading.value = true

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      user.value = data.user
      return { success: true, error: null }
    }
    catch (error: any) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message || 'Failed to sign in' }
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Sign out
   */
  async function signOut() {
    try {
      await supabase.auth.signOut()
      user.value = null
      await navigateTo('/admin/login')
    }
    catch (error) {
      console.error('Sign out error:', error)
    }
  }

  /**
   * Get the current session token for API requests
   */
  async function getToken(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    }
    catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    initialize,
    signIn,
    signOut,
    getToken,
  }
}
