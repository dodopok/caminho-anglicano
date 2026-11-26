<script setup lang="ts">
import OrdoFlagChanges from './FlagChanges.vue'
import OrdoFlagPersonSearch from './FlagPersonSearch.vue'
import OrdoFlagText from './FlagText.vue'
import OrdoIcon from './Icon.vue'
import { flagErrorText, useFlagActions, type FlagTextLine } from '../../composables/useFlagActions'
import type { FlagsApi } from '../../composables/useFlagsApi'
import { usePortalHead } from '../../composables/usePortalHead'
import { isNotDeployed } from '../../composables/useReport'
import type { AdminUserMatch, FeatureFlag, FlagCheckResponse, FlagDetail, FlagRule, FlagUserRule } from '../../types/flags'
import {
  audienceBase,
  everyoneLabel,
  flagSchedules,
  flagState,
  formatBrasilia,
  formatCount,
  fromBrasiliaInput,
  isFutureBrasilia,
  isPrerelease,
  KIND_LABEL,
  PERCENT_CHIPS,
  peopleCount,
  percentageExplanation,
  projectedReach,
  relativeTime,
  ruleLabel,
  scheduleSentence,
  STOP_LABEL,
  toBrasiliaInput,
  validPercentage
} from '../../utils/flags'

// Feature flags › one flag: who really sees it, the general rule (off, a
// percentage or on for everyone) explained in plain words, the schedule in
// Brasília time, the people chosen, "Testar uma pessoa" and its last changes.
const props = defineProps<{
  detail: FlagDetail
  /** Every flag of the list, to tell how many people the rule reaches. */
  flags: FeatureFlag[]
  now: Date
  api: FlagsApi
  /** `agendamento`: open with the schedule in view (from "Agendar em vez disso"). */
  focus?: string | null
}>()

const emit = defineEmits<{
  more: []
  focused: []
}>()

const actions = useFlagActions()
const flag = computed(() => props.detail)
const state = computed(() => flagState(flag.value))
const base = computed(() => audienceBase(flag.value, props.flags))
const testCard = ref<HTMLElement | null>(null)
const testSearch = ref<InstanceType<typeof OrdoFlagPersonSearch> | null>(null)
const scheduleCard = ref<HTMLElement | null>(null)

usePortalHead(() => ({
  title: flag.value.name,
  crumb: flag.value.key,
  description: flag.value.description || (flag.value.kind === 'prayer_book' ? 'Livro em pré-lançamento.' : ''),
  actions: [
    { key: 'delete', label: 'Apagar', icon: 'trash', variant: 'ghost', disabled: actions.busy.value, onClick: () => actions.askDelete(flag.value) },
    { key: 'test', label: 'Testar uma pessoa', icon: 'eye', variant: 'secondary', onClick: openTest }
  ]
}))

function openTest () {
  testCard.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  testSearch.value?.focus()
}

// ---------- Summary ----------
const statement = computed(() => {
  const f = flag.value
  if (state.value === 'on') return `Ligada para ${everyoneLabel(f).toLowerCase()}.`
  if (state.value === 'off') return 'Desligada: ninguém vê.'
  const percentage = f.rule === 'percentage' ? f.percentage : null
  if (percentage && f.users_count) return `Ligada para ${percentage}% das pessoas e para ${formatCount(f.users_count)} ${f.users_count === 1 ? 'escolhida' : 'escolhidas'}.`
  if (percentage) return `Ligada para ${percentage}% das pessoas.`
  return `Ligada só para ${peopleCount(f.users_count)} ${f.users_count === 1 ? 'escolhida' : 'escolhidas'}.`
})
const requirements = computed(() => {
  const f = flag.value
  if (f.requires_premium && f.targeted) return 'Exige Ordo+ e login.'
  if (f.requires_premium) return 'Exige Ordo+.'
  if (f.targeted) return 'Exige login.'
  return 'Não exige login nem Ordo+.'
})
const schedules = computed(() => flagSchedules(flag.value))
const summaryLine = computed<FlagTextLine>(() => {
  const f = flag.value
  const line: FlagTextLine = [requirements.value]
  if (f.reach_estimate !== null && state.value !== 'off') line.push(' Hoje alcança ', { strong: `≈ ${peopleCount(f.reach_estimate)}` }, '.')
  if (f.users_off_count) line.push(` ${peopleCount(f.users_off_count)} com regra própria desligada não ${f.users_off_count === 1 ? 'vê' : 'veem'}.`)
  schedules.value.forEach(item => line.push(' ', { strong: f.schedule_overdue ? 'Não aplicado:' : 'Agendado:' }, ` ${scheduleSentence(item.action, item.at, { now: props.now, weekday: true })}.`))
  if (f.kind === 'prayer_book' && !isPrerelease(f)) line.push(' O livro já saiu do pré-lançamento no catálogo: esta flag não esconde mais nada.')
  return line
})

// ---------- General rule ----------
const RULES: Array<{ id: FlagRule; label: string }> = [
  { id: 'off', label: 'Desligada' },
  { id: 'percentage', label: 'Porcentagem' },
  { id: 'on', label: 'Ligada para todos' }
]
const draftRule = ref<FlagRule>('off')
const draftPercentage = ref<number | null>(10)
const resetRule = () => {
  draftRule.value = flag.value.rule === 'percentage' && (flag.value.percentage ?? 0) >= 100 ? 'on' : (flag.value.rule ?? 'off')
  draftPercentage.value = flag.value.rule === 'percentage' && validPercentage(flag.value.percentage) ? flag.value.percentage : 10
}
watch(() => [flag.value.key, flag.value.rule, flag.value.percentage], resetRule, { immediate: true })

const percentageValid = computed(() => validPercentage(draftPercentage.value))
const ruleChanged = computed(() => draftRule.value !== (flag.value.rule ?? 'off')
  || (draftRule.value === 'percentage' && draftPercentage.value !== flag.value.percentage))
const canApply = computed(() => ruleChanged.value && (draftRule.value !== 'percentage' || percentageValid.value) && !actions.busy.value)
const applyLabel = computed(() => {
  if (draftRule.value === 'off') return 'Desligar para todos'
  if (draftRule.value === 'on') return isPrerelease(flag.value) ? 'Lançar…' : 'Ligar para todos'
  return percentageValid.value ? `Aplicar ${draftPercentage.value}%` : 'Aplicar'
})
const draftReach = computed(() => projectedReach(flag.value, draftRule.value, draftPercentage.value, base.value))
const baseLabel = computed(() => flag.value.requires_premium ? 'com Ordo+' : 'com conta')
const setPercentage = (value: number) => {
  draftRule.value = 'percentage'
  draftPercentage.value = value
}
const onPercentInput = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  draftPercentage.value = raw === '' ? null : Number(raw)
}
const apply = () => {
  if (!canApply.value) return
  actions.askRule(flag.value, draftRule.value, draftRule.value === 'percentage' ? draftPercentage.value : null)
}

// ---------- Schedule ----------
const enableAt = ref('')
const disableAt = ref('')
const resetSchedule = () => {
  enableAt.value = toBrasiliaInput(flag.value.enable_at)
  disableAt.value = toBrasiliaInput(flag.value.disable_at)
}
watch(() => [flag.value.key, flag.value.enable_at, flag.value.disable_at], resetSchedule, { immediate: true })
const scheduleChanged = computed(() => enableAt.value !== toBrasiliaInput(flag.value.enable_at) || disableAt.value !== toBrasiliaInput(flag.value.disable_at))
const scheduleError = computed(() => {
  const late = [
    enableAt.value && enableAt.value !== toBrasiliaInput(flag.value.enable_at) && !isFutureBrasilia(enableAt.value, props.now) ? 'Ligar' : null,
    disableAt.value && disableAt.value !== toBrasiliaInput(flag.value.disable_at) && !isFutureBrasilia(disableAt.value, props.now) ? 'Desligar' : null
  ].filter(Boolean)
  return late.length ? `${late.join(' e ')}: o horário tem que ser no futuro.` : null
})
const saveSchedule = () => {
  if (!scheduleChanged.value || scheduleError.value || actions.busy.value) return
  actions.saveSchedule(flag.value, { enable_at: fromBrasiliaInput(enableAt.value), disable_at: fromBrasiliaInput(disableAt.value) })
}
const cancelSchedule = () => actions.saveSchedule(flag.value, { enable_at: null, disable_at: null })

const focusSchedule = () => nextTick(() => {
  scheduleCard.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  scheduleCard.value?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  emit('focused')
})
watch(() => props.focus, value => { if (value === 'agendamento') focusSchedule() }, { immediate: true })

// ---------- People ----------
const users = computed(() => flag.value.users || [])
const usersTotal = computed(() => flag.value.users_meta?.total ?? users.value.length)
const withPremium = computed(() => users.value.length === usersTotal.value ? users.value.filter(user => user.premium_active).length : null)
const personStatus = (person: FlagUserRule) => {
  if (!person.enabled) return { label: 'Regra desligada · não vê', tone: 'op-pill--quiet' }
  if (person.visible) return { label: 'Vê', tone: 'op-pill--ok' }
  if (flag.value.requires_premium && !person.premium_active) return { label: 'Sem Ordo+ · não vê', tone: 'op-pill--quiet' }
  return { label: 'Não vê', tone: 'op-pill--quiet' }
}
const addPerson = (person: AdminUserMatch) => actions.addPeople(flag.value, [person])

// ---------- Test a person ----------
const check = ref<FlagCheckResponse | null>(null)
const checking = ref(false)
const checkError = ref<string | null>(null)
const testPerson = async (person: AdminUserMatch) => {
  if (checking.value) return
  checking.value = true
  checkError.value = null
  try {
    check.value = await props.api.check(flag.value.key, person.id)
  } catch (failure) {
    check.value = null
    checkError.value = isNotDeployed(failure) ? 'Testar uma pessoa ainda não chegou à API.' : flagErrorText(failure)
  } finally {
    checking.value = false
  }
}
watch(() => flag.value.key, () => { check.value = null; checkError.value = null })
</script>

<template>
  <section class="op-summary" :class="{ 'op-summary--warn': flag.schedule_overdue }" aria-label="Quem vê esta flag">
    <span class="op-summary__mark"><OrdoIcon name="flag" :size="26" /></span>
    <div class="op-summary__copy">
      <strong>{{ statement }}</strong>
      <span><OrdoFlagText :line="summaryLine" /></span>
    </div>
    <div class="op-summary__actions">
      <span v-if="flag.requires_premium" class="op-pill op-pill--gold">Exige Ordo+</span>
      <span v-if="flag.targeted" class="op-pill op-pill--quiet">Exige login</span>
      <span class="op-pill" :class="flag.kind === 'prayer_book' ? 'op-pill--warn' : 'op-pill--quiet'">{{ KIND_LABEL[flag.kind] }}</span>
      <button v-if="isPrerelease(flag) && state !== 'on'" type="button" class="op-btn op-btn--small op-btn--primary" :disabled="actions.busy.value" @click="actions.askLaunch(flag)">Lançar…</button>
    </div>
  </section>

  <div class="op-row">
    <div class="op-grow-2 op-col">
      <section class="op-card op-panel" aria-labelledby="flag-rule-title">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Para todos</p>
          <h2 id="flag-rule-title">Regra geral</h2>
          <p>Vale para quem não tem regra própria. Ligar para todos ou desligar pede confirmação.</p>
        </div>
        <div class="op-seg op-seg--fill" role="radiogroup" aria-label="Regra geral" style="align-self: flex-start">
          <button
            v-for="option in RULES"
            :key="option.id"
            type="button"
            role="radio"
            :aria-checked="draftRule === option.id"
            :class="{ 'is-on': draftRule === option.id }"
            @click="draftRule = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <template v-if="draftRule === 'percentage'">
          <div class="op-pct">
            <div class="op-pct__value">
              <input
                class="op-field"
                type="number"
                inputmode="numeric"
                min="1"
                max="99"
                step="1"
                aria-label="Porcentagem"
                :value="draftPercentage ?? ''"
                @input="onPercentInput"
                @keydown.enter.prevent="apply"
              ><span>%</span>
            </div>
            <div class="op-pct__bar" aria-hidden="true">
              <div class="op-track"><span :style="{ width: `${percentageValid ? draftPercentage : 0}%` }" /></div>
              <div class="op-pct__marks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
            </div>
            <div class="op-pct__chips">
              <button v-for="chip in PERCENT_CHIPS" :key="chip" type="button" class="op-chip" :class="{ 'is-on': draftPercentage === chip }" @click="setPercentage(chip)">{{ chip }}%</button>
            </div>
          </div>
          <p v-if="!percentageValid" class="op-note" role="alert" style="color: var(--op-danger-ink)">Use um número inteiro de 1 a 99. Para 0 ou 100, escolha Desligada ou Ligada para todos.</p>
          <p v-else class="op-note">
            Ligada para <b>{{ draftPercentage }}% das pessoas</b><template v-if="draftReach !== null && base !== null">: ≈ {{ formatCount(draftReach) }} das {{ formatCount(base) }} {{ baseLabel }}<template v-if="flag.users_count">, contando as {{ formatCount(flag.users_count) }} escolhidas</template></template>.
          </p>
          <div class="op-inline-note" data-explain="percentage">
            <OrdoIcon name="info" :size="18" />
            <div>
              <b>Como a porcentagem escolhe</b>
              <ul class="op-plain">
                <li v-for="line in percentageExplanation(percentageValid ? draftPercentage! : 10)" :key="line">{{ line }}</li>
              </ul>
            </div>
          </div>
        </template>
        <p v-else-if="draftRule === 'on'" class="op-note">
          Ligada para <b>{{ everyoneLabel(flag).toLowerCase() }}</b><template v-if="draftReach !== null">: ≈ {{ peopleCount(draftReach) }}</template>. Quem tem regra própria desligada continua sem ver.
        </p>
        <p v-else class="op-note">Ninguém vê, fora quem tem regra própria ligada<template v-if="flag.users_count"> ({{ peopleCount(flag.users_count) }})</template>.</p>

        <div class="op-panel__foot">
          <span>Hoje: {{ ruleLabel(flag.rule, flag.percentage) }}. Chega ao app em até 1 minuto.</span>
          <span class="op-flex" style="gap: 6px">
            <button v-if="ruleChanged" type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="actions.busy.value" @click="resetRule">Voltar</button>
            <button type="button" class="op-btn op-btn--small" :class="draftRule === 'off' ? 'op-btn--danger' : 'op-btn--primary'" :disabled="!canApply" @click="apply">{{ applyLabel }}</button>
          </span>
        </div>
      </section>

      <section id="agendamento" ref="scheduleCard" class="op-card op-panel" aria-labelledby="flag-schedule-title">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Opcional</p>
          <h3 id="flag-schedule-title">Agendamento</h3>
          <p>No horário marcado, a regra geral muda sozinha. As regras por pessoa não mudam. Horário de Brasília.</p>
        </div>
        <div class="op-grid" style="--op-min: 220px">
          <label class="op-label">Ligar para todos em
            <input v-model="enableAt" class="op-field" type="datetime-local" :disabled="actions.busy.value">
            <small>horário de Brasília</small>
          </label>
          <label class="op-label">Desligar em
            <input v-model="disableAt" class="op-field" type="datetime-local" :disabled="actions.busy.value">
            <small>horário de Brasília</small>
          </label>
        </div>
        <p v-if="scheduleError" class="op-note" role="alert" style="color: var(--op-danger-ink)">{{ scheduleError }}</p>
        <div v-if="schedules.length" class="op-paperbox" data-schedule>
          <span v-for="item in schedules" :key="item.action">
            <b>{{ flag.schedule_overdue ? 'Não aplicado:' : 'Agendado:' }}</b> {{ item.action === 'enable' ? 'liga para todos' : 'desliga' }} em <b>{{ formatBrasilia(item.at, { now, weekday: true }) }}</b> (horário de Brasília)
          </span>
        </div>
        <div class="op-panel__foot">
          <span v-if="!schedules.length">Nada agendado.</span>
          <button v-else type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="actions.busy.value" @click="cancelSchedule">Cancelar agendamento</button>
          <button type="button" class="op-btn op-btn--small op-btn--primary" :disabled="!scheduleChanged || !!scheduleError || actions.busy.value" @click="saveSchedule">Salvar agendamento</button>
        </div>
      </section>

      <section class="op-card op-panel" aria-labelledby="flag-people-title">
        <div class="op-between" style="align-items: flex-start">
          <div class="op-panel__heading">
            <p class="op-eyebrow">Regras por pessoa</p>
            <h3 id="flag-people-title">
              {{ usersTotal === 1 ? '1 pessoa com regra própria' : `${formatCount(usersTotal)} pessoas com regra própria` }}
              <span v-if="withPremium !== null && flag.requires_premium" class="op-faint" style="font-family: var(--op-font-ui); font-size: 14px; font-weight: 500">· {{ formatCount(withPremium) }} com Ordo+</span>
            </h3>
            <p>Adicionar ou tirar vale na hora, com Desfazer.</p>
          </div>
          <div style="flex: 0 1 340px; min-width: 0">
            <OrdoFlagPersonSearch :api="api" label="Adicionar por nome ou e-mail" placeholder="Adicionar por nome ou e-mail" action-label="Adicionar" :taken="users.map(user => user.id)" :disabled="actions.busy.value" @pick="addPerson" />
          </div>
        </div>
        <p v-if="!users.length" class="op-empty">Ninguém com regra própria. A regra geral vale para todos.</p>
        <template v-else>
          <ul class="op-mlist op-only-narrow">
            <li v-for="person in users" :key="person.id">
              <div class="op-mlist__copy" style="cursor: default">
                <strong>{{ person.name || 'Sem nome' }}</strong>
                <small>{{ person.email }}<template v-if="person.since"> · {{ relativeTime(person.since, now) }}</template></small>
                <span><span class="op-pill" :class="personStatus(person).tone">{{ personStatus(person).label }}</span></span>
              </div>
              <button type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="actions.busy.value" @click="actions.removePerson(flag, person)">Tirar</button>
            </li>
          </ul>
          <div class="op-table-wrap op-only-wide">
            <table class="op-rank">
              <thead><tr><th scope="col">Pessoa</th><th scope="col">Vê?</th><th scope="col">Desde</th><th><span class="op-sr-only">Tirar</span></th></tr></thead>
              <tbody>
                <tr v-for="person in users" :key="person.id" :data-person="person.id">
                  <td><span class="op-rank__name"><span>{{ person.name || 'Sem nome' }}<small>{{ person.email }}</small></span></span></td>
                  <td><span class="op-pill" :class="personStatus(person).tone">{{ personStatus(person).label }}</span></td>
                  <td><span style="font-size: 13px">{{ relativeTime(person.since, now) || '—' }}</span></td>
                  <td style="text-align: right"><button type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="actions.busy.value" @click="actions.removePerson(flag, person)">Tirar</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-if="usersTotal > users.length" class="op-panel__foot">
          <span>Mostrando {{ formatCount(users.length) }} de {{ formatCount(usersTotal) }}</span>
          <button type="button" class="op-link" @click="emit('more')">Ver as {{ formatCount(usersTotal) }} <OrdoIcon name="arrow" :size="14" /></button>
        </div>
      </section>
    </div>

    <div class="op-grow-1 op-col">
      <section ref="testCard" class="op-card op-panel" aria-labelledby="flag-decide-title">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Para uma pessoa</p>
          <h3 id="flag-decide-title">Como o Ordo decide</h3>
          <p>O caminho desta flag, de cima para baixo.</p>
        </div>
        <ol class="op-funnel">
          <li class="op-funnel__step"><span class="op-funnel__n">1</span><span class="op-funnel__label">Tem Ordo+?</span><span class="op-pill" :class="flag.requires_premium ? 'op-pill--gold' : 'op-pill--quiet'">{{ flag.requires_premium ? 'exige' : 'não exige' }}</span></li>
          <li class="op-funnel__step"><span class="op-funnel__n">2</span><span class="op-funnel__label">Entrou na conta?</span><span class="op-pill op-pill--quiet">{{ flag.targeted ? 'exige' : 'não exige' }}</span></li>
          <li class="op-funnel__step"><span class="op-funnel__n">3</span><span class="op-funnel__label">Regra própria</span><span class="op-funnel__value">{{ formatCount(flag.users_count + flag.users_off_count) }}</span></li>
          <li class="op-funnel__step"><span class="op-funnel__n">4</span><span class="op-funnel__label">Regra geral</span><span class="op-funnel__value">{{ flag.rule === 'percentage' ? `${flag.percentage}%` : flag.rule === 'on' ? 'ligada' : 'desligada' }}</span></li>
        </ol>
        <hr class="op-hr">
        <div class="op-panel__heading"><h3 style="font-size: 17px">Testar uma pessoa</h3><p>Diz se ela vê, onde a decisão parou e o número dela na porcentagem.</p></div>
        <OrdoFlagPersonSearch ref="testSearch" :api="api" label="Testar uma pessoa" placeholder="Nome ou e-mail" action-label="Testar" :disabled="checking" @pick="testPerson" />
        <p v-if="checking" class="op-note">Testando…</p>
        <p v-else-if="checkError" class="op-note" role="alert">{{ checkError }}</p>
        <div v-else-if="check" class="op-paperbox" data-check>
          <span><b>{{ check.user?.name || 'A pessoa' }}</b> {{ check.visible ? 'vê' : 'não vê' }}: {{ STOP_LABEL[check.stopped_at] }}.</span>
          <span v-if="check.bucket !== null" class="op-note">Número nesta flag: <b>{{ check.bucket }}</b><template v-if="check.rule === 'percentage'"> (vê quem tem menos que {{ check.percentage }})</template>.</span>
        </div>
      </section>

      <section class="op-card op-panel" aria-labelledby="flag-history-title">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Histórico</p>
          <h3 id="flag-history-title">Últimas mudanças</h3>
        </div>
        <OrdoFlagChanges :changes="flag.changes || []" :now="now" :busy="actions.busy.value" @undo="actions.undo" />
      </section>
    </div>
  </div>
</template>
