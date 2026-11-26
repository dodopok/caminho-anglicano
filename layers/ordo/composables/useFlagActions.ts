import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { FlagsApi } from './useFlagsApi'
import { isSessionError, OrdoApiError } from '../types/dashboard'
import type { FeatureFlag, FlagChange, FlagCreateInput, FlagDetail, FlagRule, FlagUserRule, ScheduleAction } from '../types/flags'
import {
  audienceBase,
  audienceLabel,
  canUndo,
  describeChange,
  everyoneLabel,
  FLAG_ERRORS,
  flagSchedules,
  flagState,
  formatBrasilia,
  isPrerelease,
  peopleCount,
  ruleChangeImpact,
  ruleLabel,
  UNDO_DAYS
} from '../utils/flags'

/**
 * Every write of the Feature flags tab goes through here, so each one gets
 * the same three guarantees:
 *
 * - **No double submit.** One write at a time: while one is on its way every
 *   other call returns at once, and the buttons that start them are disabled.
 * - **Confirmation by text.** A change of the general rule says what happens
 *   and to how many people; above 100 people it asks for the key typed.
 *   Deleting a flag and launching a pre-release book always do.
 * - **Desfazer.** The changes a write recorded come back in a notice with
 *   Desfazer, and stay in Últimas mudanças for 30 days.
 */

/** A piece of a sentence: plain, bold, or a key in monospace. */
export type FlagTextPart = string | { strong: string } | { mono: string }
export type FlagTextLine = FlagTextPart[]

export interface FlagConfirmChoice {
  label: string
  tone?: 'primary' | 'danger'
  onSelect: () => void
}

export interface FlagConfirmRequest {
  /** What kind of confirmation it is, for tests and analytics: `rule-off`, `delete`, `launch`… */
  kind: string
  eyebrow?: string
  title: FlagTextLine
  lead?: FlagTextLine
  /** A text-only warning above the effects. */
  note?: FlagTextLine
  /** "O que acontece". */
  effects?: FlagTextLine[]
  /** The text to type before confirming; none: a plain confirmation. */
  typed?: string | null
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  cancelLabel?: string
  scheduleLabel?: string
  onSchedule?: () => void
  /** A choice between actions instead of one (the switch of a partial flag). */
  choices?: FlagConfirmChoice[]
  run?: () => Promise<FlagDone>
}

export interface FlagDone {
  text: string
  /** The changes the write recorded, offered back as Desfazer. */
  changes: FlagChange[]
  after?: () => void
}

export interface FlagNotice {
  text: string
  changes: FlagChange[]
  undone?: boolean
}

export interface FlagActions {
  busy: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  notice: Readonly<ShallowRef<FlagNotice | null>>
  pending: Readonly<ShallowRef<FlagConfirmRequest | null>>
  retry: () => Promise<boolean>
  dismiss: () => void
  confirm: () => Promise<boolean>
  cancel: () => void
  askRule: (flag: FeatureFlag, rule: FlagRule, percentage?: number | null, options?: { clearSchedule?: ScheduleAction }) => Promise<boolean>
  askToggle: (flag: FeatureFlag) => void
  askDelete: (flag: FeatureFlag) => void
  askLaunch: (flag: FeatureFlag) => void
  /** Resolve to whether a write went out now (false when a confirmation was asked for instead). */
  undo: (change: FlagChange) => Promise<boolean>
  undoNotice: () => Promise<boolean>
  saveSchedule: (flag: FeatureFlag, schedule: { enable_at: string | null; disable_at: string | null }) => Promise<boolean>
  saveDetails: (flag: FeatureFlag, details: { name?: string; description?: string | null; requires_premium?: boolean; targeted?: boolean }) => Promise<boolean>
  addPeople: (flag: FeatureFlag, people: Array<{ id: number; name: string | null }>, enabled?: boolean) => Promise<boolean>
  removePerson: (flag: FeatureFlag, person: FlagUserRule) => Promise<boolean>
  create: (input: FlagCreateInput) => Promise<boolean>
}

export interface FlagActionsOptions {
  api: FlagsApi
  /** Every flag the tab knows (the list), to tell how many people a rule reaches. */
  flags: () => FeatureFlag[]
  /** Every change the tab has seen, so the ones a write adds can be told apart. */
  knownChanges: () => FlagChange[]
  /** Reads the list (and the open flag) again after a write. */
  reload: () => Promise<unknown>
  /** "Agendar em vez disso": opens the flag at its schedule. */
  openSchedule: (key: string) => void
  /** After a delete, the flag's page no longer exists. */
  onDeleted: (key: string) => void
  onCreated: (key: string) => void
  now?: () => Date
}

const KEY: InjectionKey<FlagActions> = Symbol('ordo-flag-actions')

export const flagErrorText = (error: unknown) => {
  if (error instanceof OrdoApiError) {
    const code = error.payload?.code || error.code
    if (code && FLAG_ERRORS[code]) return FLAG_ERRORS[code]
    if (error.status === 403) return 'Sua conta não tem acesso de administrador.'
    if (error.status === 422) return `A API recusou: ${error.message}`
  }
  return error instanceof Error && error.message ? error.message : 'Não foi possível salvar. Nada mudou.'
}

const maxId = (changes: FlagChange[]) => changes.reduce((max, change) => Math.max(max, change.id), 0)

export const createFlagActions = (options: FlagActionsOptions): FlagActions => {
  const { api } = options
  const now = () => options.now?.() ?? new Date()
  const busy = ref(false)
  const error = ref<string | null>(null)
  const notice = shallowRef<FlagNotice | null>(null)
  const pending = shallowRef<FlagConfirmRequest | null>(null)
  let lastJob: (() => Promise<FlagDone>) | null = null

  /** The changes a write recorded: newer than any change seen before it. */
  const recorded = (since: number, changes: FlagChange[] = []) => changes.filter(change => change.id > since && !change.undone_at)

  const perform = async (job: () => Promise<FlagDone>): Promise<boolean> => {
    if (busy.value) return false
    busy.value = true
    error.value = null
    try {
      const done = await job()
      lastJob = null
      notice.value = { text: done.text, changes: done.changes.filter(change => canUndo(change, now())) }
      done.after?.()
      await options.reload().catch(() => {})
      return true
    } catch (failure) {
      if (isSessionError(failure)) return false
      error.value = flagErrorText(failure)
      lastJob = job
      return false
    } finally {
      busy.value = false
    }
  }

  /** A PATCH whose answer is the flag's detail: its new changes are the ones to offer back. */
  const patch = (flag: FeatureFlag, body: Parameters<FlagsApi['update']>[1], text: string) => async (): Promise<FlagDone> => {
    const since = maxId(options.knownChanges())
    const detail = await api.update(flag.key, body)
    return { text, changes: recorded(since, detail.changes) }
  }

  const ask = (request: FlagConfirmRequest) => {
    if (busy.value) return
    error.value = null
    pending.value = request
  }

  const scheduleInstead = (flag: FeatureFlag, label = 'Agendar em vez disso') => ({
    scheduleLabel: label,
    onSchedule: () => {
      pending.value = null
      options.openSchedule(flag.key)
    }
  })

  const undoLine: FlagTextLine = [`Fica em Últimas mudanças por ${UNDO_DAYS} dias, para desfazer.`]

  const askLaunch = (flag: FeatureFlag) => {
    const code = flag.prayer_book_code || flag.key
    const seeing = flag.reach_estimate ?? flag.users_count
    ask({
      kind: 'launch',
      eyebrow: 'Livro em pré-lançamento',
      title: [`Lançar o ${flag.name} para todos?`],
      lead: [`Hoje ${seeing === 1 ? 'uma pessoa vê' : `${peopleCount(seeing)} veem`}. Depois de lançar, ele aparece no catálogo de qualquer pessoa${flag.targeted ? ' com login' : ', com ou sem login'}.`],
      note: [
        'Apps que já guardaram o catálogo podem levar ', { strong: 'até 1 hora' }, ' para mostrar o livro. ',
        'Desligar depois esconde de novo, mas quem já o escolheu passa a receber erro no ofício do dia até trocar de livro.'
      ],
      effects: [undoLine],
      typed: code,
      cancelLabel: 'Agora não',
      confirmLabel: 'Lançar agora',
      tone: 'primary',
      ...scheduleInstead(flag, 'Agendar…'),
      run: patch(flag, { rule: 'on' }, `${flag.name} lançado para todos.`)
    })
  }

  const askRule: FlagActions['askRule'] = (flag, rule, percentage = null, { clearSchedule } = {}) => {
    if (rule === 'on' && isPrerelease(flag) && flagState(flag) !== 'on') {
      askLaunch(flag)
      return Promise.resolve(false)
    }
    const base = audienceBase(flag, options.flags())
    const impact = ruleChangeImpact(flag, rule, percentage, base)
    const from = ruleLabel(flag.rule, flag.percentage)
    const to = ruleLabel(rule, percentage)
    const body: Parameters<FlagsApi['update']>[1] = rule === 'percentage' ? { rule, percentage } : { rule }
    if (clearSchedule === 'enable') body.enable_at = null
    if (clearSchedule === 'disable') body.disable_at = null
    const run = patch(flag, body, `${flag.name}: regra geral ${to}.`)

    const effects: FlagTextLine[] = []
    if (rule === 'off') {
      if (impact.lost !== null && impact.lost > 0) effects.push([{ strong: `≈ ${peopleCount(impact.lost)}` }, ` deixam de ver ${flag.name} em até 1 minuto.`])
      else effects.push([`Quem não tem regra própria deixa de ver ${flag.name} em até 1 minuto.`])
      if (flag.users_count > 0) effects.push([`As ${peopleCount(flag.users_count)} com regra própria ligada continuam vendo.`])
      if (flag.kind === 'prayer_book') effects.push(['Quem escolheu este livro passa a receber erro no ofício do dia até trocar de livro.'])
    } else if (rule === 'on') {
      if (impact.after !== null) effects.push([{ strong: `≈ ${peopleCount(impact.after)}` }, ` passam a ver ${flag.name} em até 1 minuto (hoje, ≈ ${peopleCount(impact.now)}).`])
      else effects.push(['Passa a valer para ', { strong: everyoneLabel(flag).toLowerCase() }, ' em até 1 minuto.'])
      if (flag.users_off_count > 0) effects.push([`As ${peopleCount(flag.users_off_count)} com regra própria desligada continuam sem ver.`])
    } else {
      if (impact.after !== null) effects.push([{ strong: `≈ ${peopleCount(impact.after)}` }, ` veem depois da mudança (hoje, ≈ ${peopleCount(impact.now)}).`])
      const lowering = flag.rule === 'percentage' && (percentage ?? 0) < (flag.percentage ?? 0)
      effects.push([lowering ? 'Saem primeiro os números mais altos, os últimos que entraram.' : 'Quem já via continua vendo.'])
    }
    if (flag.requires_premium && rule !== 'off') effects.push(['Quem não tem Ordo+ continua sem ver.'])
    effects.push(undoLine)

    // A percentage that touches few people is applied at once, with Desfazer.
    if (rule === 'percentage' && !impact.typed) return perform(run)

    const titles: Record<FlagRule, FlagTextLine> = {
      off: [`Desligar ${flag.name} para todos?`],
      on: [`Ligar ${flag.name} para todos?`],
      percentage: [`Mudar ${flag.name} para ${percentage}%?`]
    }
    const confirmLabels: Record<FlagRule, string> = { off: 'Desligar para todos', on: 'Ligar para todos', percentage: `Aplicar ${percentage}%` }
    ask({
      kind: `rule-${rule}`,
      title: titles[rule],
      lead: [`A regra geral passa de ${from} para ${to}.`],
      effects,
      typed: impact.typed ? flag.key : null,
      confirmLabel: confirmLabels[rule],
      tone: rule === 'off' ? 'danger' : 'primary',
      ...(clearSchedule ? {} : scheduleInstead(flag)),
      run
    })
    return Promise.resolve(false)
  }

  const askToggle = (flag: FeatureFlag) => {
    const state = flagState(flag)
    if (state === 'on') return void askRule(flag, 'off')
    if (state === 'off') return void askRule(flag, 'on')
    ask({
      kind: 'partial',
      title: [`${flag.name} está parcial`],
      lead: [`Hoje: ${audienceLabel(flag)}. O interruptor não troca direto: escolha o que fazer.`],
      cancelLabel: 'Manter como está',
      choices: [
        { label: 'Desligar…', tone: 'danger', onSelect: () => { pending.value = null; askRule(flag, 'off') } },
        { label: isPrerelease(flag) ? 'Lançar…' : 'Ligar para todos…', tone: 'primary', onSelect: () => { pending.value = null; askRule(flag, 'on') } }
      ]
    })
  }

  const askDelete = (flag: FeatureFlag) => {
    const what: string[] = [`a regra geral (${ruleLabel(flag.rule, flag.percentage)})`]
    const rules = flag.users_count + flag.users_off_count
    if (rules) what.push(rules === 1 ? 'a regra de 1 pessoa' : `as ${formatRules(rules)} regras por pessoa`)
    const schedules = flagSchedules(flag)
    if (schedules.length) what.push(`o agendamento de ${schedules.map(item => formatBrasilia(item.at, { now: now() })).join(' e ')}`)
    const effects: FlagTextLine[] = []
    if ((flag.reach_estimate ?? 0) > 0) effects.push([{ strong: `≈ ${peopleCount(flag.reach_estimate!)}` }, ` deixam de ver ${flag.name} em até 1 minuto.`])
    schedules.forEach(item => effects.push([`O agendamento de `, { strong: formatBrasilia(item.at, { now: now() }) }, ' é cancelado.']))
    effects.push([`A flag fica em Últimas mudanças por ${UNDO_DAYS} dias, para `, { strong: 'desfazer' }, ' com tudo de volta.'])
    ask({
      kind: 'delete',
      title: ['Apagar a flag ', { mono: flag.key }, '?'],
      lead: [`Apaga a flag ${flag.name} com tudo o que ela tem: ${joinList(what)}.`],
      note: [
        'Se o app ainda lê esta chave, ela passa a contar como ', { strong: 'desligada' },
        `, que é o padrão de toda flag sem regra. Ninguém vê ${flag.name} até a flag voltar.`
      ],
      effects,
      typed: flag.key,
      confirmLabel: 'Apagar a flag',
      tone: 'danger',
      run: async () => {
        const { change } = await api.remove(flag.key)
        return { text: `Flag ${flag.name} apagada.`, changes: change ? [change] : [], after: () => options.onDeleted(flag.key) }
      }
    })
  }

  /**
   * Undoing a change of the general rule is a change of the general rule:
   * on a flag that reaches more than 100 people it asks for the key too.
   * Undoing a creation deletes the flag, so it asks like a delete.
   */
  const undo: FlagActions['undo'] = (change) => {
    const run = async (): Promise<FlagDone> => {
      await api.undo(change.id)
      return { text: `Desfeito: ${change.flag_name || change.flag_key}, ${describeChange(change, now())}.`, changes: [] }
    }
    const flag = options.flags().find(item => item.key === change.flag_key)
    const before = change.before
    const touchesRule = ['rule', 'scheduled_enable', 'scheduled_disable'].includes(change.action)
    if (flag && touchesRule && before) {
      const rule = (before.rule ?? 'off') as FlagRule
      const impact = ruleChangeImpact(flag, rule, before.percentage ?? null, audienceBase(flag, options.flags()))
      if (impact.typed) {
        ask({
          kind: 'undo-rule',
          title: [`Desfazer a mudança em ${flag.name}?`],
          lead: [`A regra geral volta de ${ruleLabel(flag.rule, flag.percentage)} para ${ruleLabel(rule, before.percentage)}.`],
          effects: impact.after !== null ? [[{ strong: `≈ ${peopleCount(impact.after)}` }, ` veem depois (hoje, ≈ ${peopleCount(impact.now)}).`]] : undefined,
          typed: flag.key,
          confirmLabel: 'Desfazer',
          tone: 'primary',
          run
        })
        return Promise.resolve(false)
      }
    }
    if (change.action === 'create' && flag) {
      ask({
        kind: 'undo-create',
        title: ['Desfazer a criação de ', { mono: flag.key }, '?'],
        lead: [`Desfazer a criação apaga a flag ${flag.name}. Ela fica ${UNDO_DAYS} dias em Últimas mudanças, para voltar.`],
        typed: flag.key,
        confirmLabel: 'Apagar a flag',
        tone: 'danger',
        run: async () => ({ ...(await run()), after: () => options.onDeleted(flag.key) })
      })
      return Promise.resolve(false)
    }
    return perform(run)
  }

  /** The notice's Desfazer: every change the last write recorded, newest first. */
  const undoNotice = () => {
    const current = notice.value
    if (!current?.changes.length) return Promise.resolve(false)
    if (current.changes.length === 1) return undo(current.changes[0])
    return perform(async () => {
      for (const change of [...current.changes].sort((a, b) => b.id - a.id)) await api.undo(change.id)
      return { text: 'Desfeito.', changes: [] }
    })
  }

  return {
    busy,
    error,
    notice,
    pending,
    retry: () => lastJob ? perform(lastJob) : Promise.resolve(false),
    dismiss: () => { notice.value = null; error.value = null },
    confirm: async () => {
      const request = pending.value
      if (!request?.run) return false
      const ok = await perform(request.run)
      if (ok && pending.value === request) pending.value = null
      return ok
    },
    cancel: () => {
      if (busy.value) return
      pending.value = null
      error.value = null
    },
    askRule,
    askToggle,
    askDelete,
    askLaunch,
    undo,
    undoNotice,
    saveSchedule: (flag, schedule) => {
      const parts = [
        schedule.enable_at ? `liga para todos em ${formatBrasilia(schedule.enable_at, { now: now() })}` : null,
        schedule.disable_at ? `desliga em ${formatBrasilia(schedule.disable_at, { now: now() })}` : null
      ].filter(Boolean)
      return perform(patch(flag, schedule, parts.length ? `${flag.name}: ${parts.join(' e ')} (horário de Brasília).` : `${flag.name}: agendamento cancelado.`))
    },
    saveDetails: (flag, details) => perform(patch(flag, details, `${flag.name}: detalhes salvos.`)),
    addPeople: (flag, people, enabled = true) => perform(async () => {
      const since = maxId(options.knownChanges())
      const answer = await api.addUsers(flag.key, people.map(person => person.id), enabled)
      const who = people.length === 1 ? people[0].name || 'A pessoa' : peopleCount(people.length)
      return { text: `${who} ${people.length === 1 ? 'entrou' : 'entraram'} em ${flag.name}.`, changes: answer.change && answer.change.id > since ? [answer.change] : [] }
    }),
    removePerson: (flag, person) => perform(async () => {
      const { change } = await api.removeUser(flag.key, person.id)
      return { text: `${person.name || 'A pessoa'} saiu de ${flag.name}: volta a seguir a regra geral.`, changes: change ? [change] : [] }
    }),
    create: input => perform(async () => {
      const detail: FlagDetail = await api.create(input)
      return { text: `Flag ${detail.name} criada.`, changes: detail.changes.filter(change => change.action === 'create'), after: () => options.onCreated(detail.key) }
    })
  }
}

function formatRules (count: number) {
  return count.toLocaleString('pt-BR')
}

function joinList (items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

export const provideFlagActions = (actions: FlagActions) => {
  provide(KEY, actions)
  return actions
}

export const useFlagActions = () => {
  const actions = inject(KEY, null)
  if (!actions) throw new Error('useFlagActions precisa de provideFlagActions (FlagsPanel).')
  return actions
}
