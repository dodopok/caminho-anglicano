// @vitest-environment node
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadBase } from '../lib/load'
import { validateBase } from '../lib/validate'

/**
 * Garante no CI que a base versionada é válida. Para detalhes:
 *   pnpm episcopado:validate --warnings --gaps
 */
describe('base da Rede do Episcopado Histórico', () => {
  const { base, errors: loadErrors } = loadBase(fileURLToPath(new URL('.', import.meta.url)))

  it('todos os YAML seguem o schema', () => {
    expect(loadErrors).toEqual([])
  })

  it('não tem erros de integridade', () => {
    expect(validateBase(base).errors).toEqual([])
  })
})
