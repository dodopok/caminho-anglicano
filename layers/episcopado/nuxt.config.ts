import { fileURLToPath } from 'node:url'

const dataDir = fileURLToPath(new URL('./data', import.meta.url))

// Rede do Episcopado Histórico (beta). Ver docs/EPISCOPADO.md.
export default defineNuxtConfig({
  css: [fileURLToPath(new URL('./assets/css/episcopado.css', import.meta.url))],
  hooks: {
    // Os YAML da base viajam com o servidor como server assets (funciona na Vercel).
    // Registrado via hook, e só uma vez: declarado direto em `nitro.serverAssets`
    // da layer, o array chegava duplicado e o prerender falhava com
    // "already mounted at episcopado:".
    'nitro:config'(config) {
      config.serverAssets ??= []
      if (!config.serverAssets.some((asset) => asset.baseName === 'episcopado')) {
        config.serverAssets.push({ baseName: 'episcopado', dir: dataDir })
      }
      // Fora do prerender: o crawler seguia os links entre fichas e gerava milhares de
      // páginas a cada deploy (de ~1 para ~8 minutos). As páginas são renderizadas sob
      // demanda; a base fica em memória em cada instância do servidor.
      config.prerender ??= {}
      config.prerender.ignore ??= []
      if (!config.prerender.ignore.includes('/episcopado')) config.prerender.ignore.push('/episcopado')
    }
  },
  routeRules: {
    // Beta escondido: fora dos buscadores até a base ter massa crítica.
    '/episcopado': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/episcopado/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    // A base só muda com um deploy: fichas e API ficam em cache na Vercel até o próximo
    // (o explorador e a lista de fontes leem a query string e seguem renderizados a cada pedido).
    '/episcopado/pessoa/**': { isr: true },
    '/episcopado/jurisdicao/**': { isr: true },
    '/episcopado/fonte/**': { isr: true },
    '/api/episcopado/**': { isr: true },
    // Sugestões são POST e nunca entram em cache.
    '/api/episcopado/sugestao': { isr: false, cache: false }
  }
})
