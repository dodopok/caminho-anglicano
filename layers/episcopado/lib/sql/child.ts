/**
 * Processo filho que executa as consultas SQL: abre o banco só-leitura e responde pelo canal IPC.
 * Roda como `node -e CHILD_SRC` (fonte em string, fora do bundle do Nitro) para que uma consulta
 * travada possa ser encerrada com SIGKILL: `worker_threads` não interrompe uma chamada nativa do SQLite.
 * A truncagem acontece aqui, antes do IPC (uma única célula pode ter centenas de MB).
 */

export interface SqlRequest {
  id: number
  sql: string
  /** Máximo de linhas devolvidas (o resto só é contado, até o LIMIT da guarda). */
  maxRows: number
  /** Máximo de caracteres por célula de texto. */
  maxCell: number
  /** Máximo aproximado de caracteres na resposta inteira. */
  maxChars: number
}

export type SqlResponse =
  | { id: number; columns: string[]; rows: unknown[][]; total: number; truncated: boolean; ms: number }
  | { id: number; error: string }

export const CHILD_SRC = String.raw`
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.env.EPISCOPADO_DB, { readOnly: true });
db.exec('PRAGMA query_only = ON');
const cell = (v, max) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.length > max ? v.slice(0, max) + '…' : v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return v;
  return '<' + (v && v.byteLength !== undefined ? v.byteLength + ' bytes' : typeof v) + '>';
};
process.on('message', (req) => {
  const t0 = performance.now();
  try {
    const stmt = db.prepare(req.sql);
    stmt.setReturnArrays(true);
    const columns = stmt.columns().map((c) => c.name);
    const rows = [];
    let total = 0;
    let chars = 0;
    let full = false;
    for (const row of stmt.iterate()) {
      total++;
      if (full || rows.length >= req.maxRows) { full = true; continue; }
      const r = row.map((v) => cell(v, req.maxCell));
      chars += JSON.stringify(r).length;
      if (chars > req.maxChars && rows.length > 0) { full = true; continue; }
      rows.push(r);
    }
    process.send({ id: req.id, columns, rows, total, truncated: total > rows.length, ms: performance.now() - t0 });
  } catch (e) {
    process.send({ id: req.id, error: String((e && e.message) || e) });
  }
});
process.send({ ready: true });
`

/** Linhas em TSV (cabeçalho + linhas): ~30% menos tokens que JSON para o modelo ler. */
export function toTsv(columns: string[], rows: unknown[][]): string {
  const fmt = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/[\t\n\r]+/g, ' '))
  return [columns.join('\t'), ...rows.map((r) => r.map(fmt).join('\t'))].join('\n')
}
