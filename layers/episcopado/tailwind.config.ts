import { fileURLToPath } from 'node:url'
import type { Config } from 'tailwindcss'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * Tokens visuais da Rede do Episcopado: papel e tinta, acento granada, cantos retos.
 * Namespaced em `ep-*` para não interferir no resto do site.
 */
export default <Partial<Config>>{
  // lib/style.ts guarda classes dos selos; o módulo só varre components/pages por conta própria.
  content: [here('./components/**/*.vue'), here('./pages/**/*.vue'), here('./lib/**/*.ts')],
  theme: {
    extend: {
      fontFamily: {
        'ep-serif': ['Newsreader', 'Georgia', 'serif'],
        'ep-sans': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        'ep-mono': ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        ep: {
          ink: '#15130f',
          'ink-2': '#221e18',
          'ink-3': '#3b352c',
          body: '#4f483d',
          muted: '#6b6354',
          faint: '#948b7a',
          rule: '#c9c1af',
          line: '#d8d1c2',
          'line-2': '#ece8de',
          paper: '#f3f0e8',
          'paper-2': '#f8f6f0',
          card: '#fdfcf9',
          garnet: '#8b2e1f',
          'garnet-ink': '#6f2418',
          'garnet-deep': '#3d130c',
          'garnet-mid': '#c98f80',
          'garnet-line': '#d8b3a8',
          'garnet-soft': '#f6eeeb',
          teal: '#1f4e5f',
          'teal-soft': '#e4ebee',
          green: '#2f5d3a',
          'green-soft': '#e6eee6',
          red: '#8a1c12'
        }
      },
      borderRadius: {
        ep: '2px'
      }
    }
  }
}
