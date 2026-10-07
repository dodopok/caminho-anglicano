import { fileURLToPath } from 'node:url'

// Rede do Episcopado Histórico (beta). Ver docs/EPISCOPADO.md.
export default defineNuxtConfig({
  nitro: {
    // Os YAML da base viajam com o servidor (funciona também na Vercel).
    serverAssets: [{ baseName: 'episcopado', dir: fileURLToPath(new URL('./data', import.meta.url)) }]
  },
  routeRules: {
    // Beta escondido: fora dos buscadores até a base ter massa crítica.
    '/episcopado': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/episcopado/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
  }
})
