import { PORTAL_LOGIN as LOGIN, portalReturnPath } from '../utils/portalRoute'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { user, waitForAuth } = useFirebaseAuth()
  await waitForAuth()

  // The place the operator was going to (tab, period, rosary) survives the
  // login, so an expired session does not drop them back on the overview.
  if (!user.value && to.path !== LOGIN) {
    return navigateTo({ path: LOGIN, query: to.fullPath === '/portal-do-ordo' ? {} : { voltar: to.fullPath } }, { replace: true })
  }

  if (user.value && to.path === LOGIN) {
    return navigateTo(portalReturnPath(to.query.voltar), { replace: true })
  }
})
