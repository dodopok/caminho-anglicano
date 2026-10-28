/**
 * Perguntas de exemplo do Pergunte à Rede, as mesmas no site e no app (`GET /api/episcopado/pergunta/exemplos`).
 * As gerais foram conferidas no eval (`scripts/perguntas-eval.ts`); repetidas, saem do cache exato no Supabase.
 * Nas fichas, `{nome}` vira o nome da pessoa; as de jurisdição usam "esta jurisdição" e vão com a ficha como contexto.
 */

export interface TemaExemplos {
  tema: string
  perguntas: string[]
}

export interface Exemplos {
  gerais: TemaExemplos[]
  pessoa: string[]
  jurisdicao: string[]
}

export const EXEMPLOS: Exemplos = {
  gerais: [
    {
      tema: 'Contagens',
      perguntas: [
        'Quantas sagrações a IEAB registra por década?',
        'Quantas sagrações episcopais aconteceram na década de 2010?',
        'Quantos presbíteros Robinson Cavalcanti ordenou?'
      ]
    },
    {
      tema: 'Pessoas',
      perguntas: ['Quem sagrou Robinson Cavalcanti?', 'Quem foi sagrado no mesmo dia que Márcio Meira?', 'Liste os bispos da IAB.']
    },
    {
      tema: 'Sucessão e ligações',
      perguntas: [
        'Como Márcio Meira se liga a Cantuária?',
        'Qual a linha de sucessão de Robinson Cavalcanti?',
        'Qual a ligação entre Robinson Cavalcanti e Miguel Uchôa?'
      ]
    },
    {
      tema: 'Igrejas e cismas',
      perguntas: [
        'Quais igrejas saíram da IEAB por cisma, e quem liderou cada uma?',
        'Quais igrejas saíram da IEAB depois de 2010?',
        'Em que ano a IEAB foi fundada, segundo a base?'
      ]
    }
  ],
  pessoa: ['Quem sagrou ou ordenou {nome}?', 'Por quais igrejas {nome} passou?', 'Qual a linha de sucessão de {nome}?', 'Quem {nome} ordenou ou sagrou?'],
  jurisdicao: [
    'De onde veio esta jurisdição?',
    'Quem foram os bispos desta jurisdição?',
    'Quais igrejas saíram desta jurisdição por cisma?',
    'Monte uma linha do tempo desta jurisdição.'
  ]
}

/** Exemplos de uma ficha, com o nome já no lugar. */
export function exemplosDaFicha(kind: 'person' | 'jurisdiction', nome: string): string[] {
  return (kind === 'person' ? EXEMPLOS.pessoa : EXEMPLOS.jurisdicao).map((q) => q.replace('{nome}', nome))
}

/** Link do Pergunte à Rede que já envia a pergunta (com a ficha como contexto, se houver). */
export function perguntaLink(pergunta: string, contexto?: string | null): string {
  const params = new URLSearchParams({ q: pergunta })
  if (contexto) params.set('p', contexto)
  return `/episcopado/pergunte?${params.toString()}`
}
