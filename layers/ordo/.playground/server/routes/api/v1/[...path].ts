import { respond } from '../../../../mocks/index.mjs'
import { mockScenario } from '../../../utils/mockScenario'

// The mocked Ordo API: every /api/v1/* request of the portal lands here and
// is answered from mocks/. The fake session's token is the only one accepted,
// as the real API would refuse anything else.
export default defineEventHandler(async (event) => {
  if (getHeader(event, 'authorization') !== 'Bearer mock-token') {
    setResponseStatus(event, 401)
    return { error: 'Sessão ausente no modo mock', code: 'AUTHENTICATION_REQUIRED' }
  }

  const url = getRequestURL(event)
  const method = event.method
  const body = method === 'GET' || method === 'HEAD' ? null : await readBody(event).catch(() => null)
  const { status, json } = respond({ method, pathname: url.pathname, query: url.searchParams, body, scenario: mockScenario() })

  setResponseStatus(event, status)
  setHeader(event, 'x-request-id', `mock-${Date.now().toString(36)}`)
  return json
})
