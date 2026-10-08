/**
 * Pauta de pesquisa da Rede do Episcopado Histórico: onde a sucessão dos bispos brasileiros se interrompe
 * e o que falta em cada um.
 *
 *   pnpm episcopado:pauta                 # quebras das cadeias de sucessão (sagrante principal → sagrante principal…)
 *   pnpm episcopado:pauta --bispos        # bispos ligados ao Brasil e o que falta em cada um
 *   pnpm episcopado:pauta --contestadas   # afirmações contestadas e as versões em conflito
 *   pnpm episcopado:pauta --todos         # cadeias de todos os bispos, não só os ligados ao Brasil
 */
import { fileURLToPath } from 'node:url'
import { buildGraph } from '../lib/graph'
import { loadBase } from '../lib/load'

const root = fileURLToPath(new URL('../data', import.meta.url))
const args = new Set(process.argv.slice(2))
const { base } = loadBase(root)
const graph = buildGraph(base)
const nodes = new Map(graph.nodes.map((n) => [n.id, n]))
const people = new Map(base.people.map((p) => [p.id, p]))
type Person = (typeof base.people)[number]

/** Sagração que sustenta a linha: a que tem sagrante; entre elas, a mais antiga. */
const consecration = (p: Person) =>
  (p.ordinations ?? [])
    .filter((o) => o.order === 'episcopate')
    .sort((a, b) => Number(!a.principal_consecrator) - Number(!b.principal_consecrator) || String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')))[0]

const bishops = base.people.filter((p) => consecration(p) && (args.has('--todos') || nodes.get(`p:${p.id}`)?.brazil))
const name = (id: string) => people.get(id)?.name ?? id

if (args.has('--contestadas')) {
  for (const p of base.people) {
    for (const key of ['ordinations', 'affiliations', 'events'] as const) {
      for (const c of (p[key] ?? []) as Array<{ status: string; discrepancies?: Array<{ field: string; value: unknown; sources: Array<{ source: string }> }>; sources: Array<{ source: string }> }>) {
        if (c.status !== 'contested') continue
        const { status, sources, discrepancies, notes, ...rest } = c as Record<string, unknown> & typeof c
        console.log(`## ${p.id} [${key}] ${JSON.stringify(rest)}`)
        console.log(`   fontes: ${[...new Set(sources.map((s) => s.source))].join(', ')}`)
        for (const d of discrepancies ?? []) console.log(`   ≠ ${d.field} = ${JSON.stringify(d.value)} ← ${d.sources.map((s) => s.source).join(', ')}`)
        if (!discrepancies?.length) console.log('   (sem divergência registrada: o status veio da própria fonte)')
      }
    }
  }
  for (const j of base.jurisdictions) {
    for (const r of j.relations ?? []) {
      if (r.status !== 'contested') continue
      console.log(`## ${j.id} [relations] ${r.type} → ${r.target}${r.date ? ` (${r.date})` : ''}`)
      for (const d of r.discrepancies ?? []) console.log(`   ≠ ${d.field} = ${JSON.stringify(d.value)} ← ${d.sources.map((s) => s.source).join(', ')}`)
    }
  }
} else if (args.has('--bispos')) {
  for (const p of bishops) {
    const ep = consecration(p)!
    const pr = (p.ordinations ?? []).find((o) => o.order === 'presbyterate')
    const missing = [
      !ep.date && 'sagração sem data',
      !ep.principal_consecrator && 'sem sagrante',
      !pr && 'sem presbiterato',
      pr && !pr.ordained_by && 'presbiterato sem ordenante',
      !p.birth && 'sem nascimento'
    ].filter(Boolean)
    if (missing.length) console.log(`${p.id} | ${p.name} | ${missing.join(', ')}`)
  }
} else {
  // Sobe pelo sagrante principal até achar quem não tem sagração ou sagrante cadastrado.
  const breaks = new Map<string, { why: string; from: string[] }>()
  for (const b of bishops) {
    const seen: string[] = []
    let cur: string | undefined = b.id
    let why = 'ok'
    while (cur && !seen.includes(cur)) {
      seen.push(cur)
      const p = people.get(cur)
      const ep = p && consecration(p)
      if (!p) why = 'sem ficha'
      else if (!ep) why = 'sem sagração'
      else if (!ep.principal_consecrator) why = 'sem sagrante'
      cur = why === 'ok' ? ep!.principal_consecrator ?? undefined : undefined
    }
    if (cur) why = 'ciclo'
    const top = seen[seen.length - 1]!
    // Até 1600 a linha chegou às raízes históricas (Rebiba, Barlow…): daí para trás não é pauta desta base.
    const topDate = people.get(top) && consecration(people.get(top)!)?.date
    if (why === 'sem sagrante' && topDate && Number(String(topDate).slice(0, 4)) < 1600) why = 'raiz histórica'
    const entry = breaks.get(top) ?? { why, from: [] }
    entry.from.push(b.id)
    breaks.set(top, entry)
  }
  const rows = [...breaks.entries()].sort((a, b) => b[1].from.length - a[1].from.length)
  console.log(`${bishops.length} bispos; a cadeia de cada um para em:`)
  for (const [top, { why, from }] of rows) {
    const ep = people.get(top) && consecration(people.get(top)!)
    console.log(
      `${String(from.length).padStart(4)} | ${name(top)} (${top}) | ${why}${ep?.date ? ` | sagrado em ${ep.date}` : ''}` +
        ` | ex.: ${from.slice(0, 5).map(name).join(', ')}`
    )
  }
}
