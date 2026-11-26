// The mocked Ordo API of the playground: one entry point over the fixtures of
// each tab. Served by server/routes/api/v1/[...path].ts in `pnpm portal:dev`
// (and by the playground build used by `pnpm portal:shots`); the site never
// imports this folder.
//
//   respond({ method, pathname, query, body }) -> { status, json }
//
// Scenarios (switch with GET /__mock/scenario?audio=provedor-fora&usage=normal):
//   dashboard  normal | vazio                       main tabs and Operação (dashboard.mjs)
//   audio      normal | provedor-fora               Áudio (audio.mjs)
//   usage      normal | antes-do-resumo | dias-faltando | status-nulo   Uso (usage.mjs)
//   books      normal | sem-api                    Livros (books.mjs; sem-api: /admin/prayer_books 404)
//
// Each fixture is pinned to one instant (2026-11-26, afternoon, Brasília); the
// playground pins the browser clock to it too (server/plugins/mock-clock.ts),
// so "hoje", "há 5 min" and the charts read the same in dev and in the shots.

import { handle as audio, NOW as AUDIO_NOW } from './audio.mjs'
import { handle as books, cms as booksCms } from './books.mjs'
import { handle as dashboard } from './dashboard.mjs'
import { handle as usage } from './usage.mjs'

export const SCENARIOS = {
  dashboard: ['normal', 'vazio'],
  audio: ['normal', 'provedor-fora'],
  usage: ['normal', 'antes-do-resumo', 'dias-faltando', 'status-nulo'],
  books: ['normal', 'sem-api']
}

export const DEFAULT_SCENARIO = { dashboard: 'normal', audio: 'normal', usage: 'normal', books: 'normal' }

// The instant the browser clock is pinned to, by the tab the page opens on
// (`?aba=`): Áudio's stories happen at 15:10 (14:05 with the provider down),
// Uso's at 18:12, after the day's first events.
export const nowFor = (scenario, tab) => {
  if (tab === 'audio') return AUDIO_NOW[scenario.audio] || AUDIO_NOW.normal
  if (tab === 'uso') return '2026-11-26T18:12:00-03:00'
  return '2026-11-26T15:10:00-03:00'
}

const notFound = pathname => ({
  status: 404,
  json: { error: `Sem fixture para ${pathname} no modo mock do playground`, code: 'NOT_FOUND' }
})

/**
 * Order matters: the dashboard answers /api/v1/dashboard (all sections, the
 * Uso tab's completions included), Áudio answers /admin/audio/*, the
 * narration series and the public catalog, Livros /admin/prayer_books and the
 * PDF and document opens by book, Uso the rest of /admin/usage/* and the
 * calendar.
 */
export function respond ({ method = 'GET', pathname, query, body = null, scenario = DEFAULT_SCENARIO }) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query || '')
  const args = { method, pathname, query: params, body }
  return dashboard({ ...args, scenario: scenario.dashboard })
    || audio({ ...args, scenario: scenario.audio })
    || books({ ...args, scenario: scenario.books })
    || usage({ ...args, scenario: scenario.usage })
    || notFound(pathname)
}

/** The CMS's public routes the portal reads (Livros: a book's documents), served under /__mock/cms. */
export const respondCms = pathname => booksCms(pathname) || notFound(pathname)
