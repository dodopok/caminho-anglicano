import { z } from 'zod'

/**
 * Sugestão de correção enviada pelo app ou pelo site. Vira uma issue no GitHub (com
 * o formato que a skill `episcopado-ingerir` consome) e, se configurado, um aviso no Telegram.
 */

export const SuggestionSchema = z.object({
  /** "p:miguel-uchoa", "j:iab" ou "s:cant-novas-igrejas-2024". */
  entity: z.string().regex(/^[pjs]:[a-z0-9]+(-[a-z0-9]+)*$/, 'entity deve ser "p:id", "j:id" ou "s:id"'),
  entityName: z.string().trim().min(1).max(200).optional(),
  /** Seção da ficha (ordenacoes, trajetoria, eventos, origem, resumo) ou texto livre. */
  section: z.string().trim().max(60).optional(),
  /** A afirmação como aparece na ficha ("Episcopado, 8 dez. 2012"). */
  claim: z.string().trim().max(300).optional(),
  problem: z.string().trim().min(10, 'descreva o problema (10 caracteres ou mais)').max(2000),
  correction: z.string().trim().max(2000).optional(),
  /** URL ou descrição da fonte que sustenta a correção. */
  source: z.string().trim().max(1000).optional(),
  quote: z.string().trim().max(2000).optional(),
  contact: z.string().trim().max(200).optional(),
  app: z.string().trim().max(80).optional()
})

export type Suggestion = z.infer<typeof SuggestionSchema>

const KIND_LABEL: Record<string, string> = { p: 'Pessoa', j: 'Jurisdição', s: 'Fonte' }
const KIND_PATH: Record<string, string> = { p: 'pessoa', j: 'jurisdicao', s: 'fonte' }

export function entityLink(entity: string, siteUrl: string): string {
  const [kind, id] = [entity.slice(0, 1), entity.slice(2)]
  return `${siteUrl}/episcopado/${KIND_PATH[kind] ?? 'pessoa'}/${id}`
}

export function issueTitle(s: Suggestion): string {
  const name = s.entityName ?? s.entity.slice(2)
  return `Sugestão: ${name}${s.claim ? ` · ${s.claim}` : ''}`
}

export function issueBody(s: Suggestion, siteUrl: string): string {
  const kind = KIND_LABEL[s.entity.slice(0, 1)] ?? 'Entidade'
  const rows: [string, string | undefined][] = [
    ['Entidade', `${kind} \`${s.entity.slice(2)}\` (${entityLink(s.entity, siteUrl)})`],
    ['Seção', s.section],
    ['Afirmação', s.claim],
    ['Problema', s.problem],
    ['Correção proposta', s.correction],
    ['Fonte', s.source],
    ['Trecho', s.quote ? `> ${s.quote.replace(/\n/g, '\n> ')}` : undefined],
    ['Contato', s.contact],
    ['Origem', s.app ?? 'site']
  ]
  const table = rows.filter(([, v]) => v).map(([k, v]) => `**${k}:** ${v}`).join('\n\n')
  return `${table}\n\n---\n_Sugestão enviada pelo formulário da Rede do Episcopado. Para incorporar: \`episcopado-ingerir\` com a fonte acima._`
}

/** Abre a issue no GitHub. Devolve a URL, ou `null` se o token não estiver configurado. */
export async function createGitHubIssue(s: Suggestion, siteUrl: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const token = config.episcopadoGithubToken as string | undefined
  const repo = (config.episcopadoGithubRepo as string | undefined) || 'dodopok/caminho-anglicano'
  if (!token) return null
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'caminho-anglicano' },
    body: JSON.stringify({ title: issueTitle(s), body: issueBody(s, siteUrl), labels: ['episcopado', 'sugestão'] })
  })
  if (!response.ok) throw new Error(`GitHub respondeu ${response.status}: ${await response.text()}`)
  const data = (await response.json()) as { html_url: string }
  return data.html_url
}

/** Aviso curto no Telegram (mesmo bot das submissões do Localizador). Nunca falha o pedido. */
export async function notifyTelegram(s: Suggestion, siteUrl: string, issueUrl: string | null): Promise<boolean> {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken as string | undefined
  const chatId = config.telegramChatId as string | undefined
  if (!token || !chatId) return false
  const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const text = [
    `📜 <b>Sugestão na Rede do Episcopado</b>`,
    `<b>${escape(s.entityName ?? s.entity)}</b>${s.claim ? ` · ${escape(s.claim)}` : ''}`,
    escape(s.problem.slice(0, 500)),
    s.source ? `Fonte: ${escape(s.source.slice(0, 300))}` : '',
    issueUrl ? `Issue: ${issueUrl}` : entityLink(s.entity, siteUrl)
  ].filter(Boolean).join('\n\n')
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
    })
    return r.ok
  } catch {
    return false
  }
}
