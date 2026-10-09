import { describe, expect, it } from 'vitest'
import { SuggestionSchema, entityLink, issueBody, issueTitle } from './suggestion'

describe('sugestão de correção', () => {
  const input = {
    entity: 'p:marcio-meira',
    entityName: 'Márcio Meira',
    section: 'ordenacoes',
    claim: 'Episcopado, 10 jun. 2017',
    problem: 'A data da sagração está errada: o poster da IAB diz 11 de junho.',
    correction: '2017-06-11',
    source: 'https://exemplo.org/poster',
    quote: 'Em 11 de junho de 2017…\nsagraram',
    app: 'ios/0.1.0'
  }

  it('valida e monta a issue no formato que a skill consome', () => {
    const s = SuggestionSchema.parse(input)
    expect(issueTitle(s)).toBe('Sugestão: Márcio Meira · Episcopado, 10 jun. 2017')
    const body = issueBody(s, 'https://caminhoanglicano.com.br')
    expect(body).toContain('**Entidade:** Pessoa `marcio-meira` (https://caminhoanglicano.com.br/episcopado/pessoa/marcio-meira)')
    expect(body).toContain('**Trecho:** > Em 11 de junho de 2017…\n> sagraram')
    expect(body).toContain('episcopado-ingerir')
    expect(entityLink('j:iab', 'https://x')).toBe('https://x/episcopado/jurisdicao/iab')
    expect(entityLink('s:livro', 'https://x')).toBe('https://x/episcopado/fonte/livro')
  })

  it('rejeita entidade mal formada e problema curto', () => {
    expect(SuggestionSchema.safeParse({ ...input, entity: 'x:1' }).success).toBe(false)
    expect(SuggestionSchema.safeParse({ ...input, problem: 'curto' }).success).toBe(false)
  })
})
