export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { user, waitForAuth } = useFirebaseAuth()
  await waitForAuth()

  if (!user.value && to.path !== '/portal-do-ordo/login') {
    return navigateTo('/portal-do-ordo/login', { replace: true })
  }

  if (user.value && to.path === '/portal-do-ordo/login') {
    return navigateTo('/portal-do-ordo', { replace: true })
  }
})
