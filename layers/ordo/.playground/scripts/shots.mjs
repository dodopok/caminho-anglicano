#!/usr/bin/env node
// pnpm portal:shots [filtro…] [--out dir] [--widths 1440,390] [--url http://localhost:3100]
//                   [--routes lista.mjs] [--build]
//
// Headless screenshots of the Portal do Ordo in mock mode, at each width.
// Uses the running `pnpm portal:dev` (or --url / PORTAL_URL) when it answers;
// otherwise starts the cached playground build, rebuilding it first when
// layers/ordo changed since (or with --build). Never touches the site build.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const PLAYGROUND = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LAYER = resolve(PLAYGROUND, '..')
const ROOT = resolve(LAYER, '../..')
const SERVER_ENTRY = join(PLAYGROUND, '.output/server/index.mjs')
const DEV_URL = 'http://localhost:3100'

const { values: args, positionals: filters } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: join(PLAYGROUND, '.shots') },
    widths: { type: 'string', default: '1440,390' },
    url: { type: 'string', default: process.env.PORTAL_URL || '' },
    routes: { type: 'string', default: join(PLAYGROUND, 'shots.config.mjs') },
    build: { type: 'boolean', default: false },
    port: { type: 'string', default: '3199' }
  }
})

const widths = args.widths.split(',').map(Number).filter(Boolean)
const routes = (await import(pathToFileURL(resolve(args.routes)).href)).default
  .filter(route => !filters.length || filters.some(filter => route.name.includes(filter)))
if (!routes.length) {
  console.error(`Nenhuma rota de ${relative(ROOT, args.routes)} casa com: ${filters.join(', ')}`)
  process.exit(1)
}

const answers = async (url) => {
  try {
    const response = await fetch(`${url}/__mock/scenario`, { signal: AbortSignal.timeout(1500) })
    return response.ok
  } catch {
    return false
  }
}

const run = (command, commandArgs, options = {}) => new Promise((resolvePromise, reject) => {
  const child = spawn(command, commandArgs, { cwd: ROOT, stdio: 'inherit', ...options })
  child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} ${commandArgs.join(' ')} saiu com ${code}`)))
})

// The newest file the playground build depends on: the layer's sources, not
// its outputs, tests, docs or this script and its list.
const IGNORED = new Set(['.output', '.nuxt', '.shots', 'node_modules', 'scripts', 'shots.config.mjs', 'README.md'])
const newestSource = (dir) => {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name) || /\.test\.ts$/.test(entry.name)) continue
    const path = join(dir, entry.name)
    newest = Math.max(newest, entry.isDirectory() ? newestSource(path) : statSync(path).mtimeMs)
  }
  return newest
}

let server = null
let baseUrl = args.url.replace(/\/$/, '')

if (baseUrl) {
  if (!await answers(baseUrl)) throw new Error(`${baseUrl} não responde como o playground em modo mock (/__mock/scenario)`)
} else if (await answers(DEV_URL)) {
  baseUrl = DEV_URL
  console.log(`Usando o portal:dev em ${DEV_URL}`)
} else {
  const stale = !existsSync(SERVER_ENTRY) || newestSource(LAYER) > statSync(SERVER_ENTRY).mtimeMs
  if (args.build || stale) {
    console.log(args.build ? 'Recompilando o playground (--build)…' : 'Compilando o playground (sem build em cache ou layers/ordo mudou)…')
    const started = Date.now()
    await run(process.execPath, [join(ROOT, 'node_modules/nuxt/bin/nuxt.mjs'), 'build', relative(ROOT, PLAYGROUND)])
    console.log(`Build do playground em ${((Date.now() - started) / 1000).toFixed(1)} s`)
  } else {
    console.log('Usando o build do playground em cache (.output)')
  }
  baseUrl = `http://localhost:${args.port}`
  server = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: PLAYGROUND,
    env: { ...process.env, PORT: args.port, HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1' },
    stdio: ['ignore', 'ignore', 'inherit']
  })
  for (let attempt = 0; attempt < 50 && !await answers(baseUrl); attempt++) await new Promise(r => setTimeout(r, 200))
  if (!await answers(baseUrl)) throw new Error('O build do playground não subiu')
}

const { chromium } = await import('@playwright/test')
mkdirSync(args.out, { recursive: true })
const browser = await chromium.launch()
let failures = 0

try {
  for (const route of routes) {
    const scenario = new URLSearchParams({ dashboard: 'normal', audio: 'normal', usage: 'normal', ...route.scenario })
    const switched = await fetch(`${baseUrl}/__mock/scenario?${scenario}`)
    if (!switched.ok) throw new Error(`Cenário inválido em ${route.name}: ${await switched.text()}`)

    for (const width of widths.filter(value => !route.widths || route.widths.includes(value))) {
      const mobile = width < 768
      const context = await browser.newContext({
        viewport: { width, height: mobile ? 844 : 900 },
        deviceScaleFactor: mobile ? 2 : 1,
        isMobile: mobile,
        hasTouch: mobile,
        timezoneId: 'America/Sao_Paulo',
        locale: 'pt-BR'
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(String(error)))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })

      const file = join(args.out, `${route.name}-${width}.png`)
      try {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 })
        await page.evaluate(() => document.fonts.ready)
        if (route.click) {
          await page.getByRole('button', { name: route.click }).first().click({ timeout: 5_000 })
          await page.waitForLoadState('networkidle')
        }
        await page.waitForTimeout(600)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        await page.screenshot({ path: file, fullPage: true })
        const height = await page.evaluate(() => document.documentElement.scrollHeight)
        if (errors.length) failures++
        console.log(`${relative(ROOT, file)} ${width}x${height}${overflow ? ' OVERFLOW-X' : ''}${errors.length ? `  ERROS: ${errors.slice(0, 3).join(' | ')}` : ''}`)
      } catch (error) {
        failures++
        console.log(`${relative(ROOT, file)} FALHOU: ${error.message.split('\n')[0]}`)
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  // Back to the defaults, so the dev server isn't left on a story.
  await fetch(`${baseUrl}/__mock/scenario?dashboard=normal&audio=normal&usage=normal`).catch(() => {})
  server?.kill()
}

process.exitCode = failures ? 1 : 0
