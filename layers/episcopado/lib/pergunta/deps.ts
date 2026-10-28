import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import type { Graph } from '../graph'
import type { Base } from '../schemas'
import { writeSqliteFile } from '../sql/file'
import type { BaseIndex } from '../views'
import type { AgentDeps } from './agent'
import { createBriefs } from './briefs'
import { buildSystemPrompt } from './prompt'

/**
 * Monta o que o agente precisa a partir da base carregada: fichas enxutas, system prompt e o arquivo
 * SQLite (um por versão da base, no diretório temporário). Chamado uma vez por instância/processo.
 */
export function createAgentDeps(options: { client: Anthropic; base: Base; index: BaseIndex; graph: Graph; version: string; dir: string }): AgentDeps {
  const { client, base, index, graph, version, dir } = options
  const sqlFile = writeSqliteFile(base, graph, join(dir, `episcopado-${version.replace(/[^a-z0-9-]/gi, '')}.sqlite`))
  return { client, base, index, graph, briefs: createBriefs(base), prompt: buildSystemPrompt(base, graph), sqlFile }
}
