/**
 * Consulta SQL sobre a base local, com o mesmo esquema e a mesma guarda do "Pergunte à Rede".
 *
 *   pnpm episcopado:sql "SELECT count(*) FROM people"
 *   pnpm episcopado:sql --esquema           # imprime o DDL comentado
 *   pnpm episcopado:sql --arquivo saida.sqlite   # grava o banco para abrir em outra ferramenta
 */
import { fileURLToPath } from 'node:url'
import { buildGraph } from '../lib/graph'
import { loadBase } from '../lib/load'
import { toTsv } from '../lib/sql/child'
import { memorySqlite, writeSqliteFile } from '../lib/sql/file'
import { guardSql, ROW_LIMIT } from '../lib/sql/guard'
import { SCHEMA_DDL } from '../lib/sql/schema'

const args = process.argv.slice(2)
if (args[0] === '--esquema') {
  console.log(SCHEMA_DDL)
  process.exit(0)
}

const root = fileURLToPath(new URL('../data', import.meta.url))
const { base } = loadBase(root)
const graph = buildGraph(base)

if (args[0] === '--arquivo') {
  if (!args[1]) {
    console.error('Uso: pnpm episcopado:sql --arquivo <caminho.sqlite>')
    process.exit(1)
  }
  console.log(writeSqliteFile(base, graph, args[1]))
  process.exit(0)
}

const query = args.join(' ')
const guarded = guardSql(query)
if ('error' in guarded) {
  console.error(query ? guarded.error : 'Uso: pnpm episcopado:sql "SELECT …" | --esquema | --arquivo <caminho>')
  process.exit(1)
}
const db = memorySqlite(base, graph)
const stmt = db.prepare(guarded.sql)
stmt.setReturnArrays(true)
const columns = stmt.columns().map((c) => c.name)
const rows = stmt.all() as unknown as unknown[][]
console.log(toTsv(columns, rows.slice(0, ROW_LIMIT)))
if (rows.length > ROW_LIMIT) console.error(`(mais de ${ROW_LIMIT} linhas; mostrando ${ROW_LIMIT})`)
