import { describe, expect, it } from 'vitest'
import { columnLabel, displayValue } from './tabela'

describe('rótulos das tabelas do Pergunte à Rede', () => {
  it('traduz valores do banco e listas agregadas (group_concat)', () => {
    expect(displayValue('role', 'diocesan_bishop')).toBe('Bispo diocesano')
    expect(displayValue('papeis', 'primate,diocesan_bishop')).toBe('Primaz, bispo diocesano')
    expect(displayValue('papeis', 'bishop, auxiliary_bishop')).toBe('Bispo auxiliar')
    expect(displayValue('papeis', 'auxiliary_bishop,bishop,auxiliary_bishop')).toBe('Bispo auxiliar')
    expect(displayValue('papeis', 'bishop')).toBe('Bispo')
  })

  it('deixa como veio o que não é valor conhecido', () => {
    expect(displayValue('papeis', 'bishop,fundador local')).toBe('bishop,fundador local')
    expect(displayValue('onde', 'Diocese do Recife (IAB), Igreja Anglicana no Brasil')).toBe('Diocese do Recife (IAB), Igreja Anglicana no Brasil')
    expect(displayValue('desde', 2018)).toBe(2018)
  })

  it('cabeçalhos em pt-BR', () => {
    expect(['name', 'papeis', 'onde', 'desde', 'ate', 'end_year'].map(columnLabel)).toEqual(['Nome', 'Papéis', 'Onde', 'Desde', 'Até', 'Fim'])
    expect(columnLabel('total_sagracoes')).toBe('total sagracoes')
  })
})
