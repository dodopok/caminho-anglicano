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

/** Um arquivo YAML da base, com caminho relativo à pasta `data/` (ex.: "people/miguel-uchoa.yaml"). */
export interface DataFile {
  path: string
  content: string
}

export const COLLECTIONS = { people: Person, jurisdictions: Jurisdiction, sources: Source } as const

function parseCollection<S extends z.ZodType>(files: DataFile[], schema: S, errors: LoadError[]): z.infer<S>[] {
  const items: z.infer<S>[] = []
  for (const { path: file, content } of files) {
    let raw: unknown
    try {
      raw = parse(content)
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
    const expected = file.split('/').pop()!.replace(/\.ya?ml$/, '')
    if (id !== expected) {
      errors.push({ file, message: `id "${id}" difere do nome do arquivo "${expected}"` })
    }
    items.push(result.data)
  }
  return items
}

/** Valida (schema) arquivos já lidos, vindos do disco ou do storage do Nitro. */
export function parseBase(files: DataFile[]): LoadResult {
  const errors: LoadError[] = []
  const sorted = [...files].filter((f) => /\.ya?ml$/.test(f.path)).sort((a, b) => a.path.localeCompare(b.path))
  const inFolder = (folder: string) => sorted.filter((f) => f.path.startsWith(`${folder}/`))
  const base: Base = {
    people: parseCollection(inFolder('people'), COLLECTIONS.people, errors),
    jurisdictions: parseCollection(inFolder('jurisdictions'), COLLECTIONS.jurisdictions, errors),
    sources: parseCollection(inFolder('sources'), COLLECTIONS.sources, errors)
  }
  return { base, errors }
}
