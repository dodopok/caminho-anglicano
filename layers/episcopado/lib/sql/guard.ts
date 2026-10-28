/**
 * Guarda das consultas SQL escritas pelo modelo (ou pela linha de comando): aceita um único
 * SELECT/WITH e o embrulha numa subconsulta com LIMIT. Não protege contra consultas lentas
 * (o SQLite aceita CTE recursivo sem a palavra RECURSIVE): isso é papel do processo filho com
 * timeout. Aqui se impede escrita, PRAGMA/ATTACH e mais de um statement; o banco também é aberto
 * só-leitura, com `query_only`.
 */

export const ROW_LIMIT = 500

export type GuardResult = { ok: true; sql: string } | { ok: false; error: string }

/** Tira comentários e espaços do início, para achar a primeira palavra. */
function leading(q: string): string {
  let s = q
  for (;;) {
    const t = s.trimStart()
    if (t.startsWith('--')) s = t.slice(t.indexOf('\n') === -1 ? t.length : t.indexOf('\n') + 1)
    else if (t.startsWith('/*')) {
      const end = t.indexOf('*/')
      if (end === -1) return ''
      s = t.slice(end + 2)
    } else return t
  }
}

export function guardSql(input: string, limit = ROW_LIMIT): GuardResult {
  const q = input.trim().replace(/;\s*$/, '')
  if (!q) return { ok: false, error: 'consulta vazia' }
  if (q.length > 8000) return { ok: false, error: 'consulta longa demais (máx. 8000 caracteres)' }
  if (q.includes(';')) return { ok: false, error: 'só um statement por vez (sem ";" no meio; troque ";" em textos por outro caractere)' }
  if (!/^(select|with)\b/i.test(leading(q))) return { ok: false, error: 'só consultas SELECT ou WITH' }
  // Quebras de linha: um "-- comentário" na última linha engoliria o fechamento.
  return { ok: true, sql: `SELECT * FROM (\n${q}\n) LIMIT ${limit + 1}` }
}
