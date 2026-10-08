/**
 * Busca pessoas, jurisdições e fontes já cadastradas, para evitar duplicatas.
 *
 *   pnpm episcopado:search "Miguel Uchôa"
 *   pnpm episcopado:search IAB
 *   pnpm episcopado:search --url https://anglican.ink/...
 */
import { fileURLToPath } from 'node:url'
import { loadBase } from '../lib/load'
import { normalizeName } from '../lib/validate'

const root = fileURLToPath(new URL('../data', import.meta.url))
const args = process.argv.slice(2)
const { base } = loadBase(root)

if (args[0] === '--url') {
  const target = args[1]?.replace(/\/$/, '')
  const found = base.sources.filter((s) => s.url?.replace(/\/$/, '') === target || s.archive_url === target)
  if (!found.length) console.log('Nenhuma fonte com essa URL.')
  found.forEach((s) => console.log(`source:${s.id}  ${s.title}`))
  process.exit(0)
}

const query = normalizeName(args.join(' '))
if (!query) {
  console.error('Uso: pnpm episcopado:search <nome | sigla> | --url <url>')
  process.exit(1)
}
const queryTokens = query.split(' ')

/** Fração dos tokens da consulta presentes no nome (aceita prefixos). */
function score(name: string): number {
  const tokens = normalizeName(name).split(' ')
  const hits = queryTokens.filter((q) => tokens.some((t) => t === q || (q.length >= 3 && t.startsWith(q))))
  return hits.length / queryTokens.length
}

const candidates = [
  ...base.people.map((p) => ({
    key: `person:${p.id}`,
    description: p.name,
    names: [p.name, p.full_name, ...(p.aliases ?? []), p.id.replace(/-/g, ' ')]
  })),
  ...base.jurisdictions.map((j) => ({
    key: `jurisdiction:${j.id}`,
    description: `${j.acronym ? `${j.acronym} — ` : ''}${j.name}`,
    names: [j.name, j.acronym, ...(j.aliases ?? []), j.id]
  })),
  ...base.sources.map((s) => ({ key: `source:${s.id}`, description: s.title, names: [s.title, s.id.replace(/-/g, ' ')] }))
]

const results = candidates
  .map((c) => ({ ...c, score: Math.max(...c.names.filter((n): n is string => !!n).map(score)) }))
  .filter((c) => c.score >= 0.5)
  .sort((a, b) => b.score - a.score)
  .slice(0, 15)

if (!results.length) console.log('Nada encontrado.')
for (const r of results) console.log(`${Math.round(r.score * 100)}%  ${r.key}  ${r.description}`)
