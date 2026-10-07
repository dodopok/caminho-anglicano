import { fileURLToPath } from 'node:url'

const dataDir = fileURLToPath(new URL('./data', import.meta.url))

// Rede do Episcopado Histórico (beta). Ver docs/EPISCOPADO.md.
export default defineNuxtConfig({
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
    }
  },
  routeRules: {
    // Beta escondido: fora dos buscadores até a base ter massa crítica.
    '/episcopado': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/episcopado/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
  }
})
