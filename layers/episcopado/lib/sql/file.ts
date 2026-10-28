import { existsSync, renameSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type { Graph } from '../graph'
import type { Base } from '../schemas'
import { buildSqlite } from './build'

/**
 * Grava a base achatada num arquivo SQLite (uma vez por versão). Escreve num nome temporário e
 * renomeia: duas requisições frias simultâneas não leem um arquivo pela metade.
 */
export function writeSqliteFile(base: Base, graph: Graph, file: string): string {
  if (existsSync(file)) return file
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  const db = new DatabaseSync(tmp)
  try {
    db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF')
    buildSqlite(base, graph, db)
  } finally {
    db.close()
  }
  try {
    renameSync(tmp, file)
  } catch (error) {
    rmSync(tmp, { force: true })
    if (!existsSync(file)) throw error
  }
  return file
}

/** Banco em memória, para o script de linha de comando e os testes. */
export function memorySqlite(base: Base, graph: Graph): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  buildSqlite(base, graph, db)
  db.exec('PRAGMA query_only = ON')
  return db
}
