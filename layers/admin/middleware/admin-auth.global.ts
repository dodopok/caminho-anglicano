/**
 * Global middleware to protect admin pages
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client side
  if (import.meta.server) {
    return
  }

  // Protect all /admin routes except login
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    const { user, initialize } = useAdminAuth()

    // Initialize auth state if not already done
    if (user.value === null) {
      await initialize()
    }

    // Redirect to login if not authenticated
    if (!user.value) {
      return navigateTo('/admin/login')
    }
  }

  // Redirect away from login if already authenticated
  if (to.path === '/admin/login') {
    const { user, initialize } = useAdminAuth()

    if (user.value === null) {
      await initialize()
    }

    if (user.value) {
      return navigateTo('/admin')
    }
  }
})
