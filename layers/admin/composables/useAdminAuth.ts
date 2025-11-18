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
      const { data, error } = await supabase.auth.getSession()

      // If there's an error getting the session, the token is invalid
      if (error) {
        console.warn('Invalid session detected, clearing auth:', error)
        await supabase.auth.signOut()
        user.value = null
        return
      }

      if (data.session) {
        // Verify the session is actually valid by checking the user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          console.warn('Session token is invalid, clearing auth')
          await supabase.auth.signOut()
          user.value = null
          return
        }

        user.value = data.session.user
      }
      else {
        user.value = null
      }
    }
    catch (error) {
      console.error('Error initializing auth:', error)
      // Clear any invalid session
      await supabase.auth.signOut()
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
    catch (error: unknown) {
      console.error('Sign in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in'
      return { success: false, error: errorMessage }
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
      await navigateTo('/portal-do-douglas/login')
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
