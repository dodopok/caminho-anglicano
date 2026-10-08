import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseBase, type LoadResult } from './parse'

export type { DataFile, LoadError, LoadResult } from './parse'

const FOLDERS = ['people', 'jurisdictions', 'sources']

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

/** Lê do disco e valida (schema) todos os YAML de `root/{people,jurisdictions,sources}`. */
export function loadBase(root: string): LoadResult {
  const files = FOLDERS.flatMap((folder) =>
    listYaml(join(root, folder)).map((fullPath) => ({
      path: relative(root, fullPath).split('\\').join('/'),
      content: readFileSync(fullPath, 'utf8')
    }))
  )
  return parseBase(files)
}
