import { DEFAULT_SCENARIO, SCENARIOS } from '../../mocks/index.mjs'

export type MockScenario = Record<keyof typeof SCENARIOS, string>

// One scenario per tab for the whole server: the playground has one operator.
// `pnpm portal:shots` switches it before each photo.
let current: MockScenario = { ...DEFAULT_SCENARIO }

export const mockScenario = () => current

export const setMockScenario = (patch: Partial<Record<string, string>>) => {
  const next = { ...current }
  for (const [tab, value] of Object.entries(patch)) {
    if (!(tab in SCENARIOS)) throw new Error(`Aba sem cenários: ${tab}`)
    const options: string[] = SCENARIOS[tab as keyof typeof SCENARIOS]
    if (!value || !options.includes(value)) throw new Error(`Cenário de ${tab} inválido: ${value} (use ${options.join(', ')})`)
    next[tab as keyof MockScenario] = value
  }
  current = next
  return current
}
