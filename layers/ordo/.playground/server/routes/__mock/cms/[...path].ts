import { respondCms } from '../../../../mocks/index.mjs'

// The CMS's public routes (no token, as in production): the portal reads them
// from `ordoCmsBaseUrl`, which the playground points here.
export default defineEventHandler((event) => {
  const { status, json } = respondCms(getRequestURL(event).pathname)
  setResponseStatus(event, status)
  return json
})
