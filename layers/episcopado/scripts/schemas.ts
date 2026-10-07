/**
 * Gera JSON Schemas a partir dos schemas zod, para autocomplete e validação
 * ao editar os YAML no VS Code (extensão "YAML" da Red Hat).
 *
 *   pnpm episcopado:schemas
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { Jurisdiction, Person, Source } from '../lib/schemas'

const target = fileURLToPath(new URL('../schemas', import.meta.url))
mkdirSync(target, { recursive: true })

for (const [name, schema] of Object.entries({ person: Person, jurisdiction: Jurisdiction, source: Source })) {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  writeFileSync(`${target}/${name}.json`, `${JSON.stringify(json, null, 2)}\n`)
  console.log(`schemas/${name}.json`)
}
