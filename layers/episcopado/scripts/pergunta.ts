/**
 * Faz uma pergunta ao "Pergunte à Rede" pela linha de comando, sobre a base local.
 * Precisa de ANTHROPIC_API_KEY.
 *
 *   pnpm episcopado:pergunta "Quantas sagrações a IEAB registra por década?"
 *   pnpm episcopado:pergunta --modelo claude-opus-5-5 --effort low "Quem sagrou Miguel Uchôa?"
 *   pnpm episcopado:pergunta --prompt     # imprime o system prompt e o tamanho
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { buildGraph } from '../lib/graph'
import { loadBase } from '../lib/load'
import { perguntar, type Effort } from '../lib/pergunta/agent'
import { createAgentDeps } from '../lib/pergunta/deps'
import { buildSystemPrompt } from '../lib/pergunta/prompt'
import { indexBase } from '../lib/views'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(name)
  if (i < 0) return undefined
  const [, value] = args.splice(i, 2)
  return value
}
const model = flag('--modelo') ?? process.env.EPISCOPADO_PERGUNTA_MODEL ?? 'claude-sonnet-5-5'
const effort = (flag('--effort') ?? 'medium') as Effort
const thinking = flag('--thinking') === 'between_tools' ? 'between_tools' : null

const root = fileURLToPath(new URL('../data', import.meta.url))
const { base } = loadBase(root)
const graph = buildGraph(base)

if (args[0] === '--prompt') {
  const prompt = buildSystemPrompt(base, graph)
  console.log(prompt)
  console.error(`\n${prompt.length} caracteres`)
  process.exit(0)
}

const pergunta = args.join(' ').trim()
if (!pergunta) {
  console.error('Uso: pnpm episcopado:pergunta [--modelo id] [--effort low|medium|high] "<pergunta>"')
  process.exit(1)
}

const version = createHash('sha1').update(readFileSync(new URL('../lib/sql/build.ts', import.meta.url))).update(String(base.people.length)).digest('hex').slice(0, 10)
const deps = createAgentDeps({ client: new Anthropic(), base, index: indexBase(base), graph, version: `cli-${version}`, dir: tmpdir() })
let rodada = 0
const resposta = await perguntar(
  deps,
  { model, effort, thinking },
  { pergunta, hoje: new Date().toISOString().slice(0, 10) },
  {
    onEvent: (e) => {
      if (e.type === 'status') console.error(`· ${e.texto}`)
      if (e.type === 'bloco') console.error(`· [bloco ${e.n}: ${e.bloco.tipo}]`)
      if (e.type === 'texto' && e.rodada !== rodada) rodada = e.rodada
    }
  }
)
console.log(`\n${resposta.markdown}\n`)
for (const [i, b] of resposta.blocos.entries()) {
  console.log(`[bloco ${i + 1}] ${b.tipo}${'titulo' in b && b.titulo ? ` — ${b.titulo}` : ''}`)
  if (b.tipo === 'tabela') console.log(`  ${b.colunas.join(' | ')}\n${b.linhas.slice(0, 8).map((r) => `  ${r.join(' | ')}`).join('\n')}${b.linhas.length > 8 ? `\n  … (${b.linhas.length} linhas)` : ''}`)
  if (b.tipo === 'grafico') console.log(`  ${b.labels.map((l, j) => `${l}: ${b.data[j]}`).join(' · ')}`)
}
for (const n of resposta.notas) console.log(`[${n.n}] ${n.source.title}${n.quote ? ` — "${n.quote.slice(0, 120)}"` : ''}`)
console.error(`\n${JSON.stringify(resposta.meta)}`)
