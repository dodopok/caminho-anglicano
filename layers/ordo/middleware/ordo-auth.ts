export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server
  if (process.server) {
    return
  }

  const { user, loading } = useFirebaseAuth()

  // Wait for auth state to be determined
  if (loading.value) {
    return
  }

  // Redirect to login if not authenticated
  if (!user.value && to.path !== '/portal-do-ordo/login') {
    return navigateTo('/portal-do-ordo/login')
  }

  // Redirect to dashboard if already authenticated and trying to access login
  if (user.value && to.path === '/portal-do-ordo/login') {
    return navigateTo('/portal-do-ordo')
  }
})
