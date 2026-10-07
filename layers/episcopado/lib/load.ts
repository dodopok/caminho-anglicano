import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { parse } from 'yaml'
import type { z } from 'zod'
import { Jurisdiction, Person, Source, type Base } from './schemas'

export interface LoadError {
  file: string
  /** Caminho dentro do arquivo, ex.: "ordinations.1.principal_consecrator". */
  path?: string
  message: string
}

export interface LoadResult {
  base: Base
  errors: LoadError[]
}

function listYaml(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap((name) => {
    const fullPath = join(dir, name)
    if (statSync(fullPath).isDirectory()) return listYaml(fullPath)
    return /\.ya?ml$/.test(name) ? [fullPath] : []
  })
}

function loadCollection<S extends z.ZodType>(root: string, folder: string, schema: S, errors: LoadError[]): z.infer<S>[] {
  const items: z.infer<S>[] = []
  for (const fullPath of listYaml(join(root, folder)).sort()) {
    const file = relative(root, fullPath)
    let raw: unknown
    try {
      raw = parse(readFileSync(fullPath, 'utf8'))
    } catch (e) {
      errors.push({ file, message: `YAML inválido: ${(e as Error).message}` })
      continue
    }
    const result = schema.safeParse(raw)
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ file, path: issue.path.join('.'), message: issue.message })
      }
      continue
    }
    const { id } = result.data as { id: string }
    const expected = basename(fullPath).replace(/\.ya?ml$/, '')
    if (id !== expected) {
      errors.push({ file, message: `id "${id}" difere do nome do arquivo "${expected}"` })
    }
    items.push(result.data)
  }
  return items
}

/** Lê e valida (schema) todos os YAML de `root/{people,jurisdictions,sources}`. */
export function loadBase(root: string): LoadResult {
  const errors: LoadError[] = []
  const base: Base = {
    people: loadCollection(root, 'people', Person, errors),
    jurisdictions: loadCollection(root, 'jurisdictions', Jurisdiction, errors),
    sources: loadCollection(root, 'sources', Source, errors)
  }
  return { base, errors }
}
