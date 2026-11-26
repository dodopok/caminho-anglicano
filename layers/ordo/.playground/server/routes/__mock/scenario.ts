import { SCENARIOS } from '../../../mocks/index.mjs'
import { mockScenario, setMockScenario } from '../../utils/mockScenario'

// GET /__mock/scenario                      → the scenario of each tab and the options
// GET /__mock/scenario?audio=provedor-fora  → switches Áudio (reload the page after)
export default defineEventHandler((event) => {
  const patch = getQuery(event) as Record<string, string>
  try {
    if (Object.keys(patch).length) setMockScenario(patch)
  } catch (error) {
    setResponseStatus(event, 422)
    return { error: (error as Error).message, options: SCENARIOS }
  }
  return { scenario: mockScenario(), options: SCENARIOS }
})
