import type { z } from 'zod'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { SuggestionSchema, createGitHubIssue, notifyTelegram } from '../../utils/suggestion'

/**
 * Sugerir correção: valida, abre uma issue no GitHub (`EPISCOPADO_GITHUB_TOKEN`) e avisa no
 * Telegram. Sem nenhum dos dois configurados, responde 503 para o app mostrar o aviso certo.
 */
export default defineEventHandler(async (event) => {
  await rateLimit(event, RateLimits.PUBLIC_SUBMIT)
  const body = await readBody(event)
  const parsed = SuggestionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) })
  }
  const siteUrl = (useRuntimeConfig().public.siteUrl as string | undefined) || 'https://caminhoanglicano.com.br'
  let issueUrl: string | null = null
  try {
    issueUrl = await createGitHubIssue(parsed.data, siteUrl)
  } catch (error) {
    console.error('[episcopado] falha ao abrir issue:', error)
  }
  const telegram = await notifyTelegram(parsed.data, siteUrl, issueUrl)
  if (!issueUrl && !telegram) {
    throw createError({ statusCode: 503, statusMessage: 'Sugestões desativadas neste ambiente: configure EPISCOPADO_GITHUB_TOKEN ou o bot do Telegram.' })
  }
  setResponseStatus(event, 201)
  return { ok: true, issueUrl, delivered: issueUrl ? 'github' : 'telegram' } satisfies { ok: true; issueUrl: string | null; delivered: 'github' | 'telegram' }
})

export type SuggestionInput = z.infer<typeof SuggestionSchema>
