import { createHash } from 'node:crypto'
import { buildGraph, type Graph } from '../../lib/graph'
import { manifest as buildManifest, type Manifest } from '../../lib/app'
import { parseBase, type DataFile } from '../../lib/parse'
import { layoutPositions, type LayoutScope, type Positions } from '../../lib/positions'
import type { Base } from '../../lib/schemas'
import { indexBase, type BaseIndex } from '../../lib/views'

interface EpiscopadoData {
  base: Base
  index: BaseIndex
  graph: Graph
  /** Manifesto da base: versão (hash do conteúdo + commit), contagens, intervalo de anos. */
  manifest: Manifest
}

let cache: Promise<EpiscopadoData> | null = null
const positionsCache = new Map<LayoutScope, Promise<Positions>>()

async function load(): Promise<EpiscopadoData> {
  const storage = useStorage('assets:episcopado')
  const keys = (await storage.getKeys()).filter((k) => /\.ya?ml$/.test(k)).sort()
  const decoder = new TextDecoder()
  const hash = createHash('sha1')
  const files: DataFile[] = await Promise.all(
    keys.map(async (key) => {
      const raw = await storage.getItemRaw(key)
      const content = typeof raw === 'string' ? raw : decoder.decode(raw as Uint8Array)
      // Chaves do storage usam ":" como separador ("people:miguel-uchoa.yaml").
      return { path: key.replace(/:/g, '/'), content }
    })
  )
  for (const f of files) hash.update(f.path).update('\0').update(f.content).update('\0')
  const { base, errors } = parseBase(files)
  if (errors.length) {
    // O CI já barra bases inválidas; aqui só registramos e seguimos com o que carregou.
    console.warn(`[episcopado] ${errors.length} arquivo(s) inválido(s):`, errors.slice(0, 5))
  }
  const index = indexBase(base)
  const graph = buildGraph(base)
  // A versão muda sempre que algum YAML muda; o commit entra só como informação.
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7)
  const version = `${hash.digest('hex').slice(0, 12)}${commit ? `-${commit}` : ''}`
  return { base, index, graph, manifest: buildManifest(index, graph, version, new Date().toISOString()) }
}

/** Base carregada uma vez por instância do servidor (em dev, recarrega a cada requisição). */
export function useEpiscopado(): Promise<EpiscopadoData> {
  if (import.meta.dev || !cache) {
    cache = load()
    positionsCache.clear()
  }
  return cache
}

/** Posições globais do grafo para uma abrangência, calculadas uma vez por instância. */
export async function useEpiscopadoPositions(scope: LayoutScope): Promise<Positions> {
  const data = await useEpiscopado()
  let positions = positionsCache.get(scope)
  if (!positions) {
    // A rede inteira é maior: menos iterações para caber no tempo de uma função serverless.
    positions = Promise.resolve().then(() => layoutPositions(data.graph, scope, scope === 'all' ? 300 : 400))
    positionsCache.set(scope, positions)
  }
  return positions
}
