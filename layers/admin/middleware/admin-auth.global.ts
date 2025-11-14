/**
 * Global middleware to protect admin pages
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) {
    return
  }

  // Block /admin routes - they should 404
  if (to.path.startsWith('/admin')) {
    return
  }

  // Protect all /portal-do-douglas routes except login
  if (to.path.startsWith('/portal-do-douglas') && to.path !== '/portal-do-douglas/login') {
    const { user, initialize } = useAdminAuth()

    // Initialize auth state if not already done
    if (user.value === null) {
      await initialize()
    }

    // Redirect to login if not authenticated
    if (!user.value) {
      return navigateTo('/portal-do-douglas/login')
    }
  }

  // Redirect away from login if already authenticated
  if (to.path === '/portal-do-douglas/login') {
    const { user, initialize } = useAdminAuth()

    if (user.value === null) {
      await initialize()
    }

    if (user.value) {
      return navigateTo('/portal-do-douglas')
    }
  }
})
