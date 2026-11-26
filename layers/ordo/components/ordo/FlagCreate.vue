<script setup lang="ts">
import { useFlagActions } from '../../composables/useFlagActions'
import { usePortalHead } from '../../composables/usePortalHead'
import type { FlagCreateInput, FlagKind, FlagRule } from '../../types/flags'
import {
  bookFlagKey,
  formatBrasilia,
  fromBrasiliaInput,
  isFutureBrasilia,
  KIND_LABEL,
  PERCENT_CHIPS,
  suggestKey,
  validBookCode,
  validKey,
  validPercentage
} from '../../utils/flags'

// Feature flags › Nova flag: only the technical creation. Type, name, key,
// description, who may see it (login, Ordo+), how it starts and an optional
// schedule. People are added later, in the flag itself.
const props = defineProps<{
  /** Keys already taken, to say so before the API does. */
  takenKeys: string[]
  now: Date
}>()

const emit = defineEmits<{ cancel: [] }>()

const actions = useFlagActions()

usePortalHead(() => ({
  title: 'Nova flag',
  crumb: 'Nova flag',
  description: 'A chave, o nome, para que serve, quem pode ver e como ela começa.',
  actions: []
}))

const kind = ref<FlagKind>('feature')
const name = ref('')
const key = ref('')
const keyEdited = ref(false)
const bookCode = ref('')
const description = ref('')
const targeted = ref(true)
const premium = ref(false)
const rule = ref<FlagRule>('off')
const percentage = ref<number | null>(10)
const enableAt = ref('')
const disableAt = ref('')
const tried = ref(false)

// The key follows the name until it is typed by hand.
watch(name, (value) => { if (!keyEdited.value) key.value = suggestKey(value) })
const onKeyInput = (event: Event) => {
  keyEdited.value = true
  key.value = (event.target as HTMLInputElement).value.trim().toLowerCase()
}
// A book is seen in the catalogue with or without login.
watch(kind, (value) => { targeted.value = value === 'feature' })

const finalKey = computed(() => kind.value === 'prayer_book' ? (bookCode.value ? bookFlagKey(bookCode.value.trim()) : '') : key.value)

const errors = computed(() => {
  const out: Record<string, string> = {}
  if (!name.value.trim()) out.name = 'Dê um nome à flag.'
  else if (name.value.trim().length > 120) out.name = 'Até 120 caracteres.'
  if (kind.value === 'feature') {
    if (!validKey(key.value)) out.key = key.value.startsWith('prayer_book_') ? 'Chaves de livro nascem do tipo Livro.' : 'Minúsculas, números e _, começando por letra (2 a 63 caracteres).'
  } else if (!validBookCode(bookCode.value.trim())) {
    out.key = 'O código do livro, como loc_2027.'
  }
  if (!out.key && props.takenKeys.includes(finalKey.value)) out.key = 'Já existe uma flag com esta chave.'
  if (description.value.length > 500) out.description = 'Até 500 caracteres.'
  if (rule.value === 'percentage' && !validPercentage(percentage.value)) out.percentage = 'Um número inteiro de 1 a 99.'
  if (enableAt.value && !isFutureBrasilia(enableAt.value, props.now)) out.enableAt = 'O horário tem que ser no futuro.'
  if (disableAt.value && !isFutureBrasilia(disableAt.value, props.now)) out.disableAt = 'O horário tem que ser no futuro.'
  return out
})
const valid = computed(() => Object.keys(errors.value).length === 0)
const shown = (field: string) => (tried.value || field === 'key' ? errors.value[field] : null) || null

const submit = async () => {
  tried.value = true
  if (!valid.value || actions.busy.value) return
  const input: FlagCreateInput = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    kind: kind.value,
    requires_premium: premium.value,
    targeted: targeted.value,
    rule: rule.value,
    percentage: rule.value === 'percentage' ? percentage.value : null,
    enable_at: fromBrasiliaInput(enableAt.value),
    disable_at: fromBrasiliaInput(disableAt.value)
  }
  if (kind.value === 'prayer_book') input.prayer_book_code = bookCode.value.trim()
  else input.key = key.value
  await actions.create(input)
}

// ---------- Preview and summary ----------
const RULES: Array<{ id: FlagRule; label: string }> = [
  { id: 'off', label: 'Desligada' },
  { id: 'percentage', label: 'Porcentagem' },
  { id: 'on', label: 'Ligada para todos' }
]
const everyone = computed(() => premium.value ? 'todos com Ordo+' : targeted.value ? 'todos com login' : 'todos')
const startLine = computed(() => {
  if (rule.value === 'on') return `Nasce ligada para ${everyone.value}.`
  if (rule.value === 'percentage') return validPercentage(percentage.value) ? `Nasce ligada para ${percentage.value}% de ${everyone.value}.` : 'Nasce numa porcentagem.'
  return 'Nasce desligada: ninguém vê.'
})
const scheduleLines = computed(() => [
  enableAt.value && !errors.value.enableAt ? `Em ${formatBrasilia(fromBrasiliaInput(enableAt.value), { now: props.now })} liga para ${everyone.value}.` : null,
  disableAt.value && !errors.value.disableAt ? `Em ${formatBrasilia(fromBrasiliaInput(disableAt.value), { now: props.now })} desliga.` : null
].filter((line): line is string => Boolean(line)))
const previewSchedule = computed(() => {
  if (enableAt.value && !errors.value.enableAt) return `liga em ${formatBrasilia(fromBrasiliaInput(enableAt.value), { now: props.now })}`
  if (disableAt.value && !errors.value.disableAt) return `desliga em ${formatBrasilia(fromBrasiliaInput(disableAt.value), { now: props.now })}`
  return ''
})
const previewState = computed(() => rule.value === 'on' ? 'Ligada' : rule.value === 'percentage' ? 'Parcial' : 'Desligada')
</script>

<template>
  <form class="op-row" novalidate @submit.prevent="submit">
    <section class="op-card op-panel op-grow-2" aria-labelledby="flag-new-title">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Flag</p>
        <h2 id="flag-new-title">Tipo e nome</h2>
      </div>
      <div class="op-grid" style="--op-min: 220px" role="radiogroup" aria-label="Tipo">
        <button type="button" class="op-choice" :class="{ 'is-on': kind === 'feature' }" role="radio" :aria-checked="kind === 'feature'" @click="kind = 'feature'">
          <span class="op-choice__radio" />
          <span class="op-choice__copy"><strong>Recurso</strong><span>Uma tela ou função do app.</span></span>
        </button>
        <button type="button" class="op-choice" :class="{ 'is-on': kind === 'prayer_book' }" role="radio" :aria-checked="kind === 'prayer_book'" @click="kind = 'prayer_book'">
          <span class="op-choice__radio" />
          <span class="op-choice__copy"><strong>Livro em pré-lançamento</strong><span>Esconde um livro do catálogo. A chave vira <span class="op-mono">prayer_book_&lt;código&gt;</span>.</span></span>
        </button>
      </div>
      <div class="op-grid" style="--op-min: 240px">
        <label class="op-label">Nome
          <input v-model="name" class="op-field" type="text" maxlength="120" autocomplete="off" :aria-invalid="Boolean(shown('name'))">
          <small :style="shown('name') ? 'color: var(--op-danger-ink)' : ''">{{ shown('name') || 'Como aparece no painel.' }}</small>
        </label>
        <label v-if="kind === 'feature'" class="op-label">Chave
          <input :value="key" class="op-field op-field--mono" type="text" maxlength="63" autocomplete="off" autocapitalize="off" spellcheck="false" :aria-invalid="Boolean(key && shown('key'))" @input="onKeyInput">
          <small :style="key && shown('key') ? 'color: var(--op-danger-ink)' : ''">{{ (key && shown('key')) || 'Minúsculas e _, sugerida pelo nome. Não muda depois de criada.' }}</small>
        </label>
        <label v-else class="op-label">Código do livro
          <input v-model="bookCode" class="op-field op-field--mono" type="text" placeholder="loc_2027" autocomplete="off" autocapitalize="off" spellcheck="false" :aria-invalid="Boolean(bookCode && shown('key'))">
          <small :style="bookCode && shown('key') ? 'color: var(--op-danger-ink)' : ''">{{ (bookCode && shown('key')) || (finalKey ? `A chave será ${finalKey}. O livro tem que estar em pré-lançamento no catálogo.` : 'O livro tem que estar em pré-lançamento no catálogo.') }}</small>
        </label>
      </div>
      <label class="op-label">Descrição
        <textarea v-model="description" class="op-field" maxlength="500" />
        <small :style="shown('description') ? 'color: var(--op-danger-ink)' : ''">{{ shown('description') || 'Aparece na lista e no resumo da aba quando houver mudança agendada.' }}</small>
      </label>

      <hr class="op-hr">
      <div class="op-panel__heading"><h3>Quem pode ver</h3></div>
      <div class="op-flex">
        <button type="button" class="op-chip" :class="{ 'is-on': targeted }" :aria-pressed="targeted" @click="targeted = !targeted">Exige login</button>
        <button type="button" class="op-chip" :class="{ 'is-on': premium }" :aria-pressed="premium" @click="premium = !premium">Exige Ordo+</button>
      </div>
      <p class="op-note" style="margin-top: -6px">Regras por pessoa só valem para quem entrou na conta.</p>

      <div class="op-panel__heading"><h3>Começa</h3></div>
      <div class="op-seg op-seg--fill" role="radiogroup" aria-label="Como começa" style="align-self: flex-start">
        <button v-for="option in RULES" :key="option.id" type="button" role="radio" :aria-checked="rule === option.id" :class="{ 'is-on': rule === option.id }" @click="rule = option.id">{{ option.label }}</button>
      </div>
      <div v-if="rule === 'percentage'" class="op-pct">
        <div class="op-pct__value">
          <input class="op-field" type="number" inputmode="numeric" min="1" max="99" step="1" aria-label="Porcentagem" :value="percentage ?? ''" @input="percentage = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)"><span>%</span>
        </div>
        <div class="op-pct__bar" aria-hidden="true">
          <div class="op-track"><span :style="{ width: `${validPercentage(percentage) ? percentage : 0}%` }" /></div>
          <div class="op-pct__marks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        </div>
        <div class="op-pct__chips">
          <button v-for="chip in PERCENT_CHIPS" :key="chip" type="button" class="op-chip" :class="{ 'is-on': percentage === chip }" @click="percentage = chip">{{ chip }}%</button>
        </div>
      </div>
      <p v-if="rule === 'percentage' && shown('percentage')" class="op-note" role="alert" style="color: var(--op-danger-ink)">{{ shown('percentage') }}</p>
      <p class="op-note" style="margin-top: -6px">
        <template v-if="rule === 'percentage'">Cada pessoa tem um número fixo de 0 a 99 nesta flag; vê quem tem número menor que a porcentagem. Subir depois mantém quem já via. </template>
        Pessoas escolhidas se adicionam depois, no detalhe da flag.
      </p>

      <hr class="op-hr">
      <div class="op-panel__heading">
        <h3>Agendamento <span class="op-faint" style="font-family: var(--op-font-ui); font-size: 13px; font-weight: 500">opcional</span></h3>
        <p>No horário marcado, a regra geral muda sozinha. Horário de Brasília.</p>
      </div>
      <div class="op-grid" style="--op-min: 220px">
        <label class="op-label">Ligar para todos em
          <input v-model="enableAt" class="op-field" type="datetime-local">
          <small :style="shown('enableAt') ? 'color: var(--op-danger-ink)' : ''">{{ shown('enableAt') || 'horário de Brasília' }}</small>
        </label>
        <label class="op-label">Desligar em
          <input v-model="disableAt" class="op-field" type="datetime-local">
          <small :style="shown('disableAt') ? 'color: var(--op-danger-ink)' : ''">{{ shown('disableAt') || 'horário de Brasília' }}</small>
        </label>
      </div>
      <p v-if="actions.error.value" class="op-inline-error" role="alert">{{ actions.error.value }}</p>
      <div class="op-panel__foot" style="justify-content: flex-end">
        <button type="button" class="op-btn op-btn--ghost" :disabled="actions.busy.value" @click="emit('cancel')">Cancelar</button>
        <button type="submit" class="op-btn op-btn--primary" :disabled="actions.busy.value" :aria-busy="actions.busy.value || undefined">{{ actions.busy.value ? 'Criando…' : 'Criar flag' }}</button>
      </div>
    </section>

    <div class="op-grow-1 op-col">
      <section class="op-card op-panel" aria-labelledby="flag-preview-title">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Prévia</p>
          <h3 id="flag-preview-title">Como fica na lista</h3>
        </div>
        <div class="op-paperbox">
          <div class="op-between">
            <span style="min-width: 0"><strong style="font-size: 14px">{{ name.trim() || 'Sem nome' }}</strong><small class="op-mono" style="display: block; color: var(--op-ink-faint); overflow-wrap: anywhere">{{ finalKey || 'chave' }}</small></span>
            <span class="op-switch-label"><span class="op-switch" :class="{ 'is-on': rule === 'on', 'is-partial': rule === 'percentage' }" aria-hidden="true" />{{ previewState }}</span>
          </div>
          <span v-if="description.trim()" style="color: var(--op-ink-soft); font-size: 12.5px; overflow-wrap: anywhere">{{ description.trim() }}</span>
          <span class="op-flex" style="gap: 4px">
            <span class="op-pill" :class="kind === 'prayer_book' ? 'op-pill--warn' : 'op-pill--quiet'">{{ KIND_LABEL[kind] }}</span>
            <span v-if="premium" class="op-pill op-pill--gold">Ordo+</span>
            <span v-if="targeted" class="op-pill op-pill--quiet">Login</span>
            <span v-if="previewSchedule" class="op-pill op-pill--info">{{ previewSchedule }}</span>
          </span>
        </div>
      </section>
      <section class="op-card op-panel" aria-labelledby="flag-new-summary">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Resumo</p>
          <h3 id="flag-new-summary">Ao criar</h3>
        </div>
        <ul class="op-plain">
          <li>{{ startLine }}</li>
          <li v-for="line in scheduleLines" :key="line">{{ line }}</li>
          <li v-if="kind === 'prayer_book'">O livro continua fora do catálogo de quem não está na regra.</li>
          <li>Entra em Últimas mudanças por 30 dias, para desfazer.</li>
        </ul>
      </section>
    </div>
  </form>
</template>
