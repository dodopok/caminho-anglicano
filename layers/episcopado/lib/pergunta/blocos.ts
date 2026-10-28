import type { SuccessionView } from '../app'
import type { PathStep } from '../paths'
import type { SqlResult } from '../sql/runner'

/**
 * Blocos estruturados de uma resposta. Todos são montados pelo servidor a partir do que as ferramentas
 * calcularam: o modelo só escolhe a forma e as colunas; nunca digita os dados.
 */

export type Forma = 'tabela' | 'barras' | 'linha' | 'linha_do_tempo'

export interface Mostrar {
  forma: Forma
  titulo?: string | null
  /** Barras/linha: coluna dos rótulos. Linha do tempo: coluna da data (ou do ano). */
  x?: string | null
  /** Barras/linha: coluna numérica. Linha do tempo: coluna do texto de cada item. */
  y?: string | null
}

export interface PathStepView extends PathStep {
  label: string
  kind: 'person' | 'jurisdiction'
  year?: number
  claim?: string | null
}

export type Bloco =
  | { tipo: 'tabela'; titulo: string | null; colunas: string[]; linhas: unknown[][]; total: number; truncado: boolean; consulta: string }
  | { tipo: 'grafico'; forma: 'barras' | 'linha'; titulo: string | null; x: string; y: string; labels: string[]; data: number[]; consulta: string }
  | { tipo: 'linha_do_tempo'; titulo: string | null; itens: { data: string; texto: string; claim: string | null }[]; consulta: string }
  | { tipo: 'sucessao'; titulo: string | null; view: SuccessionView }
  | { tipo: 'caminho'; titulo: string | null; de: string; para: string; modo: 'sagracoes' | 'tudo'; steps: PathStepView[] }

export class BlocoError extends Error {}

const isNumeric = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))

/** Tabela que o leitor consegue ler: as recusas voltam ao modelo como erro, para ele corrigir a consulta. */
export const TABELA_MAX_LINHAS = 200
const TEXTO_LONGO = 140

function checkTabela({ columns, rows, total }: SqlResult): void {
  if (total > TABELA_MAX_LINHAS) {
    throw new BlocoError(
      `${total > 500 ? 'mais de 500' : total} linhas é demais para o leitor: filtre, agregue (uma linha por pessoa?) ou confira se a consulta responde mesmo à pergunta. ` +
        `Se o leitor pediu a lista completa, use LIMIT ${TABELA_MAX_LINHAS} e diga o total no texto.`
    )
  }
  columns.forEach((name, i) => {
    if (name === 'claim_id') return
    const cells = rows.map((r) => r[i]).filter((v): v is string => typeof v === 'string' && v !== '')
    const longas = cells.filter((v) => v.length > TEXTO_LONGO).length
    if (cells.length && longas * 4 > cells.length) {
      throw new BlocoError(`a coluna "${name}" tem texto longo demais para uma tabela: tire-a ou use substr(${name}, 1, 80)`)
    }
  })
}

export function blocoFromSql(mostrar: Mostrar, result: SqlResult, consulta: string): Bloco {
  const { columns, rows } = result
  const col = (name: string | null | undefined, role: string) => {
    if (!name) throw new BlocoError(`informe a coluna ${role} em mostrar`)
    const i = columns.indexOf(name)
    if (i < 0) throw new BlocoError(`a coluna "${name}" não existe no resultado (colunas: ${columns.join(', ')})`)
    return i
  }
  if (!rows.length && mostrar.forma !== 'tabela') throw new BlocoError('a consulta não devolveu linhas: não há o que mostrar')
  switch (mostrar.forma) {
    case 'tabela':
      checkTabela(result)
      return { tipo: 'tabela', titulo: mostrar.titulo ?? null, colunas: columns, linhas: rows, total: result.total, truncado: result.truncated, consulta }
    case 'barras':
    case 'linha': {
      const xi = col(mostrar.x, 'x (rótulos)')
      const yi = col(mostrar.y, 'y (números)')
      if (!rows.every((r) => isNumeric(r[yi]))) throw new BlocoError(`a coluna "${mostrar.y}" precisa ser numérica em todas as linhas`)
      if (rows.length > 120) throw new BlocoError(`gráfico com ${rows.length} pontos: agrupe mais (máx. 120)`)
      return {
        tipo: 'grafico',
        forma: mostrar.forma,
        titulo: mostrar.titulo ?? null,
        x: mostrar.x!,
        y: mostrar.y!,
        labels: rows.map((r) => (r[xi] === null ? '—' : String(r[xi]))),
        data: rows.map((r) => (r[yi] === null ? 0 : Number(r[yi]))),
        consulta
      }
    }
    case 'linha_do_tempo': {
      const xi = col(mostrar.x, 'x (data ou ano)')
      const yi = col(mostrar.y, 'y (texto do item)')
      const ci = columns.indexOf('claim_id')
      const itens = rows
        .filter((r) => r[xi] !== null && r[xi] !== '')
        .map((r) => ({ data: String(r[xi]), texto: r[yi] === null ? '' : String(r[yi]), claim: ci >= 0 && r[ci] ? String(r[ci]) : null }))
      if (!itens.length) throw new BlocoError(`nenhuma linha tem "${mostrar.x}" preenchida`)
      return { tipo: 'linha_do_tempo', titulo: mostrar.titulo ?? null, itens, consulta }
    }
  }
}
