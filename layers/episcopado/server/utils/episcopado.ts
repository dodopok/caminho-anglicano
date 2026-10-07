import { buildGraph, type Graph } from '../../lib/graph'
import { parseBase, type DataFile } from '../../lib/parse'
import { indexBase, type BaseIndex } from '../../lib/views'

interface EpiscopadoData {
  index: BaseIndex
  graph: Graph
}

let cache: Promise<EpiscopadoData> | null = null

async function load(): Promise<EpiscopadoData> {
  const storage = useStorage('assets:episcopado')
  const keys = (await storage.getKeys()).filter((k) => /\.ya?ml$/.test(k))
  const decoder = new TextDecoder()
  const files: DataFile[] = await Promise.all(
    keys.map(async (key) => {
      const raw = await storage.getItemRaw(key)
      const content = typeof raw === 'string' ? raw : decoder.decode(raw as Uint8Array)
      // Chaves do storage usam ":" como separador ("people:miguel-uchoa.yaml").
      return { path: key.replace(/:/g, '/'), content }
    })
  )
  const { base, errors } = parseBase(files)
  if (errors.length) {
    // O CI já barra bases inválidas; aqui só registramos e seguimos com o que carregou.
    console.warn(`[episcopado] ${errors.length} arquivo(s) inválido(s):`, errors.slice(0, 5))
  }
  return { index: indexBase(base), graph: buildGraph(base) }
}

/** Base carregada uma vez por instância do servidor (em dev, recarrega a cada requisição). */
export function useEpiscopado(): Promise<EpiscopadoData> {
  if (import.meta.dev || !cache) cache = load()
  return cache
}
