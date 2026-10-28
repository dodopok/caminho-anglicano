import { describe, expect, it } from 'vitest'
import { parseSse } from './useEpiscopadoPergunta'

describe('parseSse', () => {
  it('separa eventos completos e guarda o pedaço incompleto', () => {
    const { messages, rest } = parseSse('event: status\ndata: {"a":1}\n\nevent: texto\ndata: {"delta":"Ol')
    expect(messages).toEqual([{ event: 'status', data: '{"a":1}' }])
    expect(rest).toBe('event: texto\ndata: {"delta":"Ol')
    const next = parseSse(`${rest}á"}\n\n`)
    expect(next.messages).toEqual([{ event: 'texto', data: '{"delta":"Olá"}' }])
    expect(next.rest).toBe('')
  })

  it('aceita CRLF e várias linhas de data', () => {
    expect(parseSse('event: x\r\ndata: a\r\ndata: b\r\n\r\n').messages).toEqual([{ event: 'x', data: 'a\nb' }])
  })
})
