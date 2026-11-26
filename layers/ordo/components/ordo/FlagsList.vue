<script setup lang="ts">
import OrdoFlagChanges from './FlagChanges.vue'
import OrdoIcon from './Icon.vue'
import { useFlagActions } from '../../composables/useFlagActions'
import type { FlagsApi } from '../../composables/useFlagsApi'
import { usePortalHead } from '../../composables/usePortalHead'
import { usePortalQuery } from '../../composables/usePortalQuery'
import { createReport } from '../../composables/useReport'
import type { FeatureFlag, FlagChange, FlagsListResponse, ScheduledChange } from '../../types/flags'
import {
  audienceDetail,
  audienceLabel,
  flagSchedules,
  flagState,
  formatBrasilia,
  formatCount,
  isPrerelease,
  isScheduled,
  KIND_LABEL,
  KIND_SLUGS,
  kindFromSlug,
  matchesFilters,
  peopleCount,
  relativeTime,
  scheduleSentence,
  STATE_DOT,
  STATE_LABEL,
  STATE_SLUGS,
  stateFromSlug,
  type FlagKindFilter,
  type FlagStateFilter
} from '../../utils/flags'

// Feature flags › the list: a summary made only of data (counts, the next
// scheduled changes with the flag's own description, books in pre-release),
// four numbers, the flags with search and filters, and the last changes with
// Desfazer. A table on a computer; one line per flag on a phone.
const props = defineProps<{
  data: FlagsListResponse
  now: Date
  api: FlagsApi
}>()

const emit = defineEmits<{
  open: [key: string]
  create: []
}>()

const actions = useFlagActions()
const query = usePortalQuery()

usePortalHead(() => ({
  actions: [{ key: 'new', label: 'Nova flag', icon: 'plus', variant: 'primary', onClick: () => emit('create') }]
}))

// ?aba=flags&estado=agendadas&tipo=livros&busca=grupo
const stateFilter = computed<FlagStateFilter>(() => stateFromSlug(query.values.value.estado))
const kindFilter = computed<FlagKindFilter>(() => kindFromSlug(query.values.value.tipo))
const search = computed({
  get: () => query.values.value.busca || '',
  set: (value: string) => query.set({ busca: value || null })
})
const setState = (value: FlagStateFilter) => query.set({ estado: value === 'all' ? null : STATE_SLUGS[value] })
const setKind = (value: FlagKindFilter) => query.set({ tipo: value === 'all' ? null : KIND_SLUGS[value] })

const flags = computed(() => props.data.flags || [])
const counts = computed(() => props.data.summary?.counts)
const visible = computed(() => flags.value.filter(flag => matchesFilters(flag, { state: stateFilter.value, kind: kindFilter.value, search: search.value })))

const STATE_OPTIONS = computed(() => [
  { id: 'all' as const, label: 'Todas', count: counts.value?.total ?? flags.value.length },
  { id: 'on' as const, label: 'Ligadas', count: counts.value?.on ?? 0 },
  { id: 'partial' as const, label: 'Parciais', count: counts.value?.partial ?? 0 },
  { id: 'off' as const, label: 'Desligadas', count: counts.value?.off ?? 0 },
  { id: 'scheduled' as const, label: 'Agendadas', count: counts.value?.scheduled ?? 0 }
])
const KIND_OPTIONS = [
  { id: 'all' as const, label: 'Tudo' },
  { id: 'feature' as const, label: 'Recursos' },
  { id: 'prayer_book' as const, label: 'Livros' }
]

// ---------- Summary ----------
const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`
const headline = computed(() => {
  const c = counts.value
  if (!c) return `${plural(flags.value.length, 'flag', 'flags')}`
  return [
    plural(c.total, 'flag', 'flags'),
    c.partial ? plural(c.partial, 'parcial', 'parciais') : null,
    // `scheduled` counts flags (one may have both times): "com agendamento".
    c.scheduled ? `${formatCount(c.scheduled)} com agendamento` : null,
    c.overdue ? plural(c.overdue, 'agendamento não aplicado', 'agendamentos não aplicados') : null
  ].filter(Boolean).join(' · ')
})
const scheduled = computed(() => (props.data.summary?.next_scheduled || []).slice(0, 2))
const overdue = computed(() => (props.data.summary?.next_scheduled || []).find(item => item.overdue) || null)
const books = computed(() => props.data.summary?.prerelease_books || [])
const flagOf = (key: string) => flags.value.find(flag => flag.key === key)

const applyNow = (item: ScheduledChange) => {
  const flag = flagOf(item.key)
  if (flag) actions.askRule(flag, item.action === 'enable' ? 'on' : 'off', null, { clearSchedule: item.action })
}

// The flag's next scheduled change: "liga em 7 dez., 09:00" in the table,
// "liga para todos em 7 dez., 09:00" on a phone. Brasília time.
const scheduleLabel = (flag: FeatureFlag) => {
  const next = flagSchedules(flag)[0]
  return next ? `${next.action === 'enable' ? 'liga' : 'desliga'} em ${formatBrasilia(next.at, { now: props.now })}` : ''
}
const scheduleLine = (flag: FeatureFlag) => {
  const next = flagSchedules(flag)[0]
  return next ? scheduleSentence(next.action, next.at, { now: props.now }) : ''
}

const changedLabel = (flag: FeatureFlag) => relativeTime(flag.updated_at, props.now)

// ---------- History ----------
const allChanges = createReport(() => props.api.changes({ perPage: 100 }))
const showAll = ref(false)
const history = computed<FlagChange[]>(() => showAll.value && allChanges.state.data ? allChanges.state.data.changes : props.data.recent_changes || [])
const toggleAll = () => {
  showAll.value = !showAll.value
  if (showAll.value) allChanges.load()
}
// After a write the list is read again; the full history too, when open.
watch(() => props.data, () => { if (showAll.value) allChanges.load() })
</script>

<template>
  <section class="op-summary" :class="{ 'op-summary--warn': overdue }" aria-label="Resumo das flags">
    <span class="op-summary__mark"><OrdoIcon name="flag" :size="26" /></span>
    <div class="op-summary__copy">
      <strong>{{ headline }}</strong>
      <span>
        <template v-if="overdue">
          <b>{{ overdue.name }}</b> devia {{ overdue.action === 'enable' ? 'ligar para todos' : 'desligar' }} em <b>{{ formatBrasilia(overdue.scheduled_at, { now }) }}</b> e o agendamento não foi aplicado.
        </template>
        <template v-for="(item, index) in scheduled.filter(entry => !entry.overdue)" :key="`${item.key}-${item.action}`">
          {{ index === 0 ? 'Próxima:' : 'Depois:' }} <b>{{ item.name }}</b> {{ item.action === 'enable' ? 'liga para todos' : 'desliga' }} em <b>{{ formatBrasilia(item.scheduled_at, { now }) }}</b><template v-if="index === 0 && item.description">{{ ' ' }}<span class="op-faint">— "{{ item.description }}"</span>{{ ' ' }}</template><template v-else>. </template>
        </template>
        <template v-if="books.length">
          {{ books.length === 1 ? '1 livro' : `${books.length} livros` }} em pré-lançamento:
          <template v-for="(book, index) in books" :key="book.key"><template v-if="index">, </template><b>{{ book.name }}</b>, para {{ peopleCount(book.reach_estimate ?? book.users_count) }}</template>.
        </template>
      </span>
    </div>
    <div class="op-summary__actions">
      <button v-if="overdue" type="button" class="op-btn op-btn--small op-btn--primary" :disabled="actions.busy.value" @click="applyNow(overdue)">Aplicar agora</button>
      <button v-if="counts?.scheduled" type="button" class="op-btn op-btn--small" @click="setState('scheduled')">Ver agendadas</button>
      <button v-for="book in books.slice(0, 1)" :key="book.key" type="button" class="op-btn op-btn--small" @click="emit('open', book.key)">Ver {{ book.name }}</button>
    </div>
  </section>

  <section class="op-tiles op-tiles--4" aria-label="Estado das flags">
    <article class="op-card op-metric">
      <div class="op-metric__top"><span class="op-metric__label">Ligadas para todos</span><span class="op-dot" /></div>
      <span class="op-metric__value">{{ formatCount(counts?.on ?? 0) }}</span>
      <span class="op-metric__sub">regra geral ligada</span>
    </article>
    <article class="op-card op-metric">
      <div class="op-metric__top"><span class="op-metric__label">Parciais</span><span class="op-dot op-dot--info" /></div>
      <span class="op-metric__value">{{ formatCount(counts?.partial ?? 0) }}</span>
      <span class="op-metric__sub">porcentagem ou pessoas escolhidas<template v-if="counts?.user_rules"> · {{ plural(counts.user_rules, 'regra', 'regras') }} por pessoa</template></span>
    </article>
    <article class="op-card op-metric">
      <div class="op-metric__top"><span class="op-metric__label">Desligadas</span><span class="op-dot op-dot--quiet" /></div>
      <span class="op-metric__value">{{ formatCount(counts?.off ?? 0) }}</span>
      <span class="op-metric__sub">ninguém vê</span>
    </article>
    <article class="op-card op-metric">
      <div class="op-metric__top"><span class="op-metric__label">Livros em pré-lançamento</span><span class="op-dot op-dot--warn" /></div>
      <span class="op-metric__value">{{ formatCount(books.length) }}</span>
      <span class="op-metric__sub">
        <template v-if="books.length"><template v-for="(book, index) in books" :key="book.key"><template v-if="index">, </template><span class="op-loc">{{ book.prayer_book_code }}</span> · {{ peopleCount(book.reach_estimate ?? book.users_count) }}</template></template>
        <template v-else>nenhum escondido no catálogo</template>
      </span>
    </article>
  </section>

  <section class="op-card op-panel" aria-labelledby="flags-list-title">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Flags</p>
        <h2 id="flags-list-title">O que está ligado, e para quem</h2>
        <p>Recursos e livros em pré-lançamento. Abra uma flag para mudar a regra geral, as pessoas e o agendamento.</p>
      </div>
    </div>
    <div class="op-filters">
      <label class="op-search" style="flex: 1 1 240px; max-width: 320px">
        <span class="op-sr-only">Buscar flag</span>
        <OrdoIcon name="search" :size="18" />
        <input v-model="search" class="op-field" type="search" placeholder="Buscar por nome ou chave" style="width: 100%">
      </label>
      <div class="op-seg op-seg--small" role="group" aria-label="Estado">
        <button
          v-for="option in STATE_OPTIONS"
          :key="option.id"
          type="button"
          :class="{ 'is-on': stateFilter === option.id }"
          :aria-pressed="stateFilter === option.id"
          @click="setState(option.id)"
        >
          {{ option.label }} {{ formatCount(option.count) }}
        </button>
      </div>
      <div class="op-seg op-seg--small" role="group" aria-label="Tipo">
        <button
          v-for="option in KIND_OPTIONS"
          :key="option.id"
          type="button"
          :class="{ 'is-on': kindFilter === option.id }"
          :aria-pressed="kindFilter === option.id"
          @click="setKind(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="!flags.length" class="op-empty">Nenhuma flag ainda. Crie a primeira em Nova flag.</p>
    <p v-else-if="!visible.length" class="op-empty">
      <template v-if="search.trim()">Nenhuma flag com "{{ search.trim() }}".</template>
      <template v-else>Nenhuma flag neste filtro.</template>
    </p>

    <template v-else>
      <div class="op-table-wrap op-only-wide">
        <table class="op-rank">
          <thead>
            <tr>
              <th scope="col">Flag</th>
              <th scope="col">Tipo</th>
              <th scope="col">Quem vê</th>
              <th scope="col">Exige</th>
              <th scope="col">Agendado</th>
              <th scope="col">Mudou</th>
              <th scope="col">Estado</th>
              <th><span class="op-sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="flag in visible" :key="flag.key" class="is-link" :data-flag="flag.key" @click="emit('open', flag.key)">
              <td style="max-width: 300px">
                <strong style="font-size: 14px">{{ flag.name }}</strong>
                <small class="op-mono" style="display: block; color: var(--op-ink-faint)">{{ flag.key }}</small>
                <small v-if="flag.description" style="display: block; color: var(--op-ink-soft); font-size: 12px; line-height: 1.4">{{ flag.description }}</small>
              </td>
              <td>
                <span class="op-pill" :class="flag.kind === 'prayer_book' ? 'op-pill--warn' : 'op-pill--quiet'">{{ KIND_LABEL[flag.kind] }}</span>
                <small v-if="flag.kind === 'prayer_book' && !isPrerelease(flag)" style="display: block; margin-top: 4px; color: var(--op-ink-faint); font-size: 12px">lançado no catálogo</small>
              </td>
              <td>
                <strong style="font-size: 14px">{{ audienceLabel(flag) }}</strong>
                <small style="display: block; color: var(--op-ink-faint); font-size: 12px">{{ audienceDetail(flag) }}</small>
              </td>
              <td>
                <span class="op-flex" style="gap: 4px">
                  <span v-if="flag.requires_premium" class="op-pill op-pill--gold">Ordo+</span>
                  <span v-if="flag.targeted" class="op-pill op-pill--quiet">Login</span>
                  <span v-if="!flag.requires_premium && !flag.targeted" class="op-faint">—</span>
                </span>
              </td>
              <td>
                <span v-if="flag.schedule_overdue" class="op-pill op-pill--warn">não aplicado</span>
                <span v-else-if="isScheduled(flag)" class="op-pill op-pill--info">{{ scheduleLabel(flag) }}</span>
                <span v-else class="op-faint">—</span>
              </td>
              <td><span style="font-size: 13px; white-space: nowrap">{{ changedLabel(flag) || '—' }}</span></td>
              <td @click.stop>
                <span class="op-switch-label">
                  <button
                    type="button"
                    class="op-switch"
                    :class="{ 'is-on': flagState(flag) === 'on', 'is-partial': flagState(flag) === 'partial' }"
                    role="switch"
                    :aria-checked="flagState(flag) !== 'off'"
                    :aria-label="`${flag.name}: ${STATE_LABEL[flagState(flag)].toLowerCase()}. Mudar a regra geral`"
                    :disabled="actions.busy.value"
                    @click="actions.askToggle(flag)"
                  />
                  {{ STATE_LABEL[flagState(flag)] }}
                </span>
              </td>
              <td><OrdoIcon name="chevron-right" :size="18" style="color: var(--op-ink-faint)" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="op-mlist op-only-narrow">
        <li v-for="flag in visible" :key="flag.key" :data-flag="flag.key">
          <button type="button" class="op-mlist__copy" @click="emit('open', flag.key)">
            <strong>{{ flag.name }}</strong>
            <span class="op-mono">{{ flag.key }}</span>
            <small><span class="op-dot op-dot--small" :class="STATE_DOT[flagState(flag)]" /> {{ audienceLabel(flag) }}<template v-if="flag.requires_premium"> · Ordo+</template><template v-if="flag.kind === 'prayer_book'"> · livro</template></small>
            <small v-if="flag.schedule_overdue" class="op-mlist__when">Agendamento não aplicado</small>
            <small v-else-if="isScheduled(flag)" class="op-mlist__when">Agendado: {{ scheduleLine(flag) }}</small>
          </button>
          <button
            type="button"
            class="op-switch"
            :class="{ 'is-on': flagState(flag) === 'on', 'is-partial': flagState(flag) === 'partial' }"
            role="switch"
            :aria-checked="flagState(flag) !== 'off'"
            :aria-label="`${flag.name}: ${STATE_LABEL[flagState(flag)].toLowerCase()}. Mudar a regra geral`"
            :disabled="actions.busy.value"
            @click="actions.askToggle(flag)"
          />
        </li>
      </ul>
    </template>

    <div class="op-panel__foot">
      <span>Sem regra, uma flag conta como <b>desligada</b>. Mudanças chegam ao app em até 1 minuto; o catálogo de livros, em até 1 hora. Horários de Brasília.</span>
    </div>
  </section>

  <div class="op-row">
    <section class="op-card op-panel op-grow-1 op-only-wide" aria-labelledby="flags-rules-title">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Regra do jogo</p>
        <h3 id="flags-rules-title">Como o Ordo decide</h3>
        <p>A mesma ordem para toda flag. A primeira que responde vale.</p>
      </div>
      <ol class="op-funnel">
        <li class="op-funnel__step"><span class="op-funnel__n">1</span><span class="op-funnel__label">Exige Ordo+ e a pessoa não tem? <b>Não vê.</b></span><span /></li>
        <li class="op-funnel__step"><span class="op-funnel__n">2</span><span class="op-funnel__label">Exige login e não entrou? <b>Não vê.</b></span><span /></li>
        <li class="op-funnel__step"><span class="op-funnel__n">3</span><span class="op-funnel__label">Tem regra própria? <b>Vale a dela.</b></span><span /></li>
        <li class="op-funnel__step"><span class="op-funnel__n">4</span><span class="op-funnel__label">Regra geral: ligada, desligada ou <b>porcentagem</b>.</span><span /></li>
        <li class="op-funnel__step"><span class="op-funnel__n">5</span><span class="op-funnel__label">Nenhuma regra? <b>Desligada.</b></span><span /></li>
      </ol>
    </section>
    <section class="op-card op-panel op-grow-2" aria-labelledby="flags-history-title">
      <div class="op-panel__head">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Histórico</p>
          <h3 id="flags-history-title">Últimas mudanças</h3>
          <p>O que mudou nos últimos 30 dias, para desfazer.</p>
        </div>
        <button v-if="(data.recent_changes || []).length" type="button" class="op-link" @click="toggleAll">
          {{ showAll ? 'Só as últimas' : 'Ver tudo' }} <OrdoIcon :name="showAll ? 'chevron-up' : 'arrow'" :size="14" />
        </button>
      </div>
      <p v-if="showAll && allChanges.state.loading && !allChanges.state.data" class="op-note">Lendo o histórico…</p>
      <OrdoFlagChanges :changes="history" :now="now" show-flag :busy="actions.busy.value" @undo="actions.undo" />
    </section>
  </div>
</template>
