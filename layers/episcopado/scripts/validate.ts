/**
 * Valida a base da Rede do Episcopado Histórico.
 *
 *   pnpm episcopado:validate              # erros + resumo de avisos e lacunas
 *   pnpm episcopado:validate --warnings   # lista todos os avisos
 *   pnpm episcopado:validate --gaps       # lista todas as lacunas (pauta de pesquisa)
 *
 * Sai com código 1 se houver erros.
 */
import { fileURLToPath } from 'node:url'
import { buildGraph } from '../lib/graph'
import { loadBase } from '../lib/load'
import { validateBase, type Finding } from '../lib/validate'

const root = fileURLToPath(new URL('../data', import.meta.url))
const args = new Set(process.argv.slice(2))

const { base, errors: loadErrors } = loadBase(root)
const { errors, warnings, gaps } = validateBase(base)
const graph = buildGraph(base)

const format = (f: Finding) => `  ${f.entity}${f.path ? ` (${f.path})` : ''}: ${f.message}`

console.log(
  `Base: ${base.people.length} pessoas, ${base.jurisdictions.length} jurisdições, ${base.sources.length} fontes` +
    ` → ${graph.nodes.length} nós, ${graph.edges.length} arestas`
)

for (const e of loadErrors) console.log(`  ✗ ${e.file}${e.path ? ` (${e.path})` : ''}: ${e.message}`)
if (errors.length) {
  console.log(`\nErros (${errors.length}):`)
  errors.forEach((e) => console.log(format(e)))
}

console.log(`\nAvisos: ${warnings.length}${args.has('--warnings') ? '' : ' (use --warnings para listar)'}`)
if (args.has('--warnings')) warnings.forEach((w) => console.log(format(w)))

console.log(`Lacunas: ${gaps.length}${args.has('--gaps') ? '' : ' (use --gaps para listar)'}`)
if (args.has('--gaps')) gaps.forEach((g) => console.log(format(g)))

const total = loadErrors.length + errors.length
console.log(total ? `\n✗ ${total} erro(s)` : '\n✓ Base válida')
process.exit(total ? 1 : 0)
