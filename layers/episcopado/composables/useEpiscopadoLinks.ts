import type { InjectionKey } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { nodeRoute } from '../lib/style'

/**
 * Para onde leva o nome de uma pessoa ou jurisdição dentro de uma ficha.
 * Na página da ficha, para a rota dela; na folha sobre o grafo, para a mesma folha
 * com outra ficha (o explorador publica a sua versão com `provideEpiscopadoNodeLink`).
 */
type NodeLink = (nodeId: string) => RouteLocationRaw

const KEY: InjectionKey<NodeLink> = Symbol('episcopado-node-link')

export function provideEpiscopadoNodeLink(fn: NodeLink) {
  provide(KEY, fn)
}

export function useEpiscopadoNodeLink() {
  const link = inject(KEY, nodeRoute)
  return {
    node: link,
    person: (id: string) => link(`p:${id}`),
    jurisdiction: (id: string) => link(`j:${id}`)
  }
}

/** Fontes da layer (Newsreader, IBM Plex Sans e Mono); só nas páginas da rede. */
export function useEpiscopadoFonts() {
  useHead({
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap'
      }
    ]
  })
}
