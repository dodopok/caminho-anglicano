import { spawn, type ChildProcess } from 'node:child_process'
import { CHILD_SRC, type SqlRequest, type SqlResponse } from './child'
import { guardSql } from './guard'

/**
 * Executor de consultas num processo filho descartável (um por pergunta). Consulta que passa do
 * prazo mata o filho com SIGKILL; a próxima chamada sobe outro. Usado pelo servidor e pelos testes.
 */

export interface SqlResult {
  columns: string[]
  rows: unknown[][]
  /** Linhas produzidas pela consulta, até o LIMIT da guarda (501 = "mais de 500"). */
  total: number
  truncated: boolean
  ms: number
}

export interface SqlRunnerOptions {
  timeoutMs?: number
  maxRows?: number
  maxCell?: number
  maxChars?: number
}

export class SqlError extends Error {}

export interface SqlRunner {
  run(sql: string, options?: SqlRunnerOptions): Promise<SqlResult>
  kill(): void
}

export function createSqlRunner(file: string): SqlRunner {
  let child: ChildProcess | null = null
  let ready: Promise<void> | null = null
  let nextId = 1
  const pending = new Map<number, { resolve: (r: SqlResponse) => void; reject: (e: Error) => void }>()

  const failAll = (error: Error) => {
    for (const p of pending.values()) p.reject(error)
    pending.clear()
  }

  const start = () => {
    const proc = spawn(process.execPath, ['--no-warnings', '-e', CHILD_SRC], {
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: { EPISCOPADO_DB: file }
    })
    let stderr = ''
    proc.stderr?.on('data', (d) => (stderr = (stderr + d).slice(-2000)))
    child = proc
    ready = new Promise<void>((resolve, reject) => {
      proc.once('message', (m: { ready?: boolean }) => (m?.ready ? resolve() : reject(new SqlError('filho SQL não iniciou'))))
      proc.once('exit', (code) => reject(new SqlError(`filho SQL saiu (${code}): ${stderr.trim()}`)))
    })
    // Quem espera é `run`; sem isto, um filho morto antes de alguém aguardar vira rejeição solta.
    ready.catch(() => {})
    proc.on('message', (m: SqlResponse & { ready?: boolean }) => {
      if (m.ready) return
      const p = pending.get(m.id)
      if (!p) return
      pending.delete(m.id)
      p.resolve(m)
    })
    proc.on('exit', () => {
      if (child === proc) {
        child = null
        ready = null
      }
      failAll(new SqlError('o processo da consulta foi encerrado'))
    })
  }

  const kill = () => {
    const proc = child
    child = null
    ready = null
    if (proc && proc.exitCode === null) proc.kill('SIGKILL')
  }

  return {
    async run(sql, options = {}) {
      const guarded = guardSql(sql)
      if ('error' in guarded) throw new SqlError(guarded.error)
      if (!child) start()
      await ready
      const proc = child!
      const req: SqlRequest = {
        id: nextId++,
        sql: guarded.sql,
        maxRows: options.maxRows ?? 500,
        maxCell: options.maxCell ?? 300,
        maxChars: options.maxChars ?? 64_000
      }
      const timeoutMs = options.timeoutMs ?? 2000
      const response = await new Promise<SqlResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(req.id)
          kill()
          reject(new SqlError(`a consulta passou de ${timeoutMs / 1000} s e foi cancelada; simplifique (sem CTE recursivo, sem produto cartesiano)`))
        }, timeoutMs)
        pending.set(req.id, {
          resolve: (r) => (clearTimeout(timer), resolve(r)),
          reject: (e) => (clearTimeout(timer), reject(e))
        })
        proc.send(req)
      })
      if ('error' in response) throw new SqlError(response.error)
      const { id: _id, ...result } = response
      return result
    },
    kill
  }
}
