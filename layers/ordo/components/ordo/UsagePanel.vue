<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoUsageAudience from './UsageAudience.vue'
import OrdoUsageContent from './UsageContent.vue'
import OrdoUsageFeatureDetail from './UsageFeatureDetail.vue'
import OrdoUsageFeatures from './UsageFeatures.vue'
import OrdoUsageFunnels from './UsageFunnels.vue'
import OrdoUsagePartialState from './UsagePartialState.vue'
import OrdoUsageSummary from './UsageSummary.vue'
import { usePortalHead } from '../../composables/usePortalHead'
import { usePortalQuery, useQueryParam } from '../../composables/usePortalQuery'
import { createReport, errorText } from '../../composables/useReport'
import { provideUsageContext } from '../../composables/useUsageContext'
import { useUsageApi } from '../../composables/useUsageApi'
import { previousLabel as previousLabelFor } from '../../utils/compare'
import { queryForLocation, type PortalTab } from '../../utils/portalRoute'
import { toDateInput } from '../../utils/period'
import {
  appSendsEvents,
  beforeFirstRollup,
  daysBetween,
  comparedWindow,
  featureLabel,
  FEATURES,
  USAGE_SECTIONS,
  usageLiveText,
  usageWindow,
  type UsageSection
} from '../../utils/usage'
import { isSessionError } from '../../types/dashboard'
import type { PeriodValue } from '../../utils/period'
import type { AudioPrayerBooksResponse } from '../../types/dashboard'
import type { UsageQuery } from '../../types/usage'

// The "Uso" tab: the first-party usage telemetry (estevao-api
// docs/USAGE_TELEMETRY.md), read from GET /api/v1/admin/usage/*. It does not
// use /dashboard: each report is read on its own, so one failing report
// costs one card, and a report the API does not have yet shows "em breve".
const props = withDefaults(defineProps<{
  period: PeriodValue
  monthly: boolean
  /** Bumped by the page's refresh button. */
  reloadKey: number
  /** Today, for tests and screenshots; the real clock otherwise. */
  now?: Date | null
}>(), { now: null })

const api = useUsageApi()
const portalQuery = usePortalQuery()

// Where the operator is, in the URL: ?aba=uso&secao=recursos&recurso=office
const section = useQueryParam<UsageSection>('secao', 'resumo', USAGE_SECTIONS.map(item => item.id), { push: true, query: portalQuery })
const resource = useQueryParam<string>('recurso', '', undefined, { query: portalQuery })

const today = () => props.now ? new Date(props.now) : new Date()
const window = computed(() => usageWindow(props.period, today()))
const previous = computed(() => comparedWindow(props.period, window.value))
const previousLabel = computed(() => previousLabelFor(props.period) || 'período anterior')
// The status covers both windows up to today, so it can say which days of
// each have data, which are still closing and which are open.
const statusRange = computed<UsageQuery>(() => {
  const end = toDateInput(today())
  const start = previous.value && daysBetween(previous.value.start_date, end) <= 366 ? previous.value.start_date : window.value.start_date
  return { start_date: daysBetween(start, end) <= 366 ? start : window.value.start_date, end_date: end }
})
const windowKey = computed(() => `${window.value.start_date}|${window.value.end_date}|${props.reloadKey}`)

function withPrevious<T> (read: (window: UsageQuery) => Promise<T>) {
  return () => previous.value ? read(previous.value) : Promise.resolve(null as T)
}

// The reports more than one section reads.
const reports = {
  active: createReport(() => api.activeUsers(window.value), { lazy: false }),
  activePrevious: createReport(withPrevious(api.activeUsers), { lazy: false }),
  top: createReport(() => api.top(window.value, 50), { lazy: false }),
  topPrevious: createReport(withPrevious(range => api.top(range, 50)), { lazy: false }),
  status: createReport(() => api.status(statusRange.value), { lazy: false }),
  offices: createReport(() => api.series(window.value, { event: 'office_completed' }), { lazy: false }),
  officesPrevious: createReport(withPrevious(range => api.series(range, { event: 'office_completed' })), { lazy: false })
}
const core = Object.fromEntries(Object.entries(reports).map(([key, report]) => [key, report.state])) as unknown as Parameters<typeof provideUsageContext>[0]['core']

const bookNames = ref<Record<string, string>>({})
const loadBookNames = async () => {
  if (Object.keys(bookNames.value).length) return
  try {
    const response = await api.request<AudioPrayerBooksResponse>('/api/v1/prayer_books')
    bookNames.value = Object.fromEntries((response.data || []).map(book => [book.code, book.name]))
  } catch {
    // Without the names the codes still identify the books.
  }
}

const load = () => {
  loadBookNames()
  return Promise.all(Object.values(reports).map(report => report.load()))
}
watch(windowKey, () => load(), { immediate: true })

const open = (next: UsageSection, params: { recurso?: string | null } = {}) => {
  portalQuery.set({ secao: next === 'resumo' ? null : next, recurso: params.recurso || null }, { push: true })
}
const openTab = (tab: PortalTab) => {
  portalQuery.set(queryForLocation(portalQuery.values.value, { tab }), { push: true })
}

const appEvents = computed(() => appSendsEvents(core.status.data))

provideUsageContext({
  period: computed(() => props.period),
  window,
  previous,
  previousLabel,
  monthly: computed(() => props.monthly),
  reloadKey: computed(() => props.reloadKey),
  today,
  core,
  bookNames,
  appEvents,
  open,
  openTab
})

// --- States ---------------------------------------------------------------------

// Every existing report missing: the API in use has no usage panel at all.
const existing = computed(() => [core.active, core.top])
const settled = computed(() => existing.value.every(report => report.settled && !report.loading))
const notDeployed = computed(() => settled.value && existing.value.every(report => report.soon))
const allFailed = computed(() => settled.value && existing.value.every(report => report.error && !report.soon && !isSessionError(report.error)))
// The same rule for every period (7, 30, 90 days, 12 months or "Sempre"):
// decided once the people and the top have answered, and the data wins over
// the status (see `beforeFirstRollup`).
const firstRollupPending = computed(() => settled.value && beforeFirstRollup(core.status.data, core.active.data, core.top.data, [core.offices.data]))

// --- Head -------------------------------------------------------------------------

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  office: 'Quem abre os ofícios, de onde, em que livro e quanto termina em oração marcada como rezada.'
}

const featureOptions = computed(() => {
  const used = (core.top.data?.features || []).map(row => row.feature)
  return [...new Set([...used, ...FEATURES])]
})

usePortalHead(() => {
  const live = { text: usageLiveText(core.status.data, window.value, today(), firstRollupPending.value), tone: 'idle' as const }
  if (section.value === 'recursos' && resource.value) {
    const label = featureLabel(resource.value)
    return {
      title: label,
      description: FEATURE_DESCRIPTIONS[resource.value] || `Quem usa ${label.toLowerCase()}, de onde, em que livro e o que mudou desde o período anterior.`,
      crumb: `Recursos · ${label}`,
      live
    }
  }
  if (section.value === 'recursos') return { title: 'Recursos', description: 'Cada recurso do Ordo, com a tendência do período e a mudança contra o anterior. Clique num recurso para abrir o detalhe.', crumb: 'Recursos', live }
  if (section.value === 'publico') return { title: 'Quem usa e onde', description: 'App ou web, que aparelho, que idioma, que livro e que versão do app as pessoas têm nas mãos.', crumb: 'Público', live }
  if (section.value === 'funis') return { title: 'Onde as pessoas param', description: 'Cada caminho importante, passo a passo, dito em palavras: quantos começam, quantos chegam ao fim e onde se perde mais.', crumb: 'Funis', live }
  if (section.value === 'conteudo') return { title: 'O que se lê além do ofício', description: 'Santos e datas, documentos, artigos e rosários mais abertos no app e na web, com o que subiu desde o período anterior.', crumb: 'Conteúdo', live }
  return { crumb: firstRollupPending.value ? 'Sem dados ainda' : undefined, live }
})

const pickResource = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  open('recursos', { recurso: value || null })
}
</script>

<template>
  <div class="op-usage">
    <div class="op-tabbar">
      <div class="op-seg" role="tablist" aria-label="Seções do uso">
        <button
          v-for="item in USAGE_SECTIONS"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="section === item.id"
          :class="{ 'is-on': section === item.id }"
          @click="open(item.id)"
        >
          {{ item.label }}
        </button>
      </div>
      <div v-if="section === 'recursos' && resource" class="op-flex">
        <button type="button" class="op-link" @click="open('recursos')"><OrdoIcon name="chevron-left" :size="14" />Todos os recursos</button>
        <select class="op-field op-usage__resource" aria-label="Recurso" :value="resource" @change="pickResource">
          <option v-for="feature in featureOptions" :key="feature" :value="feature">Recurso: {{ featureLabel(feature) }}</option>
        </select>
      </div>
      <div v-else-if="section === 'resumo' && !firstRollupPending" class="op-flex op-only-wide">
        <span class="op-pill op-pill--quiet"><OrdoIcon name="globe" :size="14" />App e web</span>
        <span v-if="!appEvents" class="op-pill op-pill--warn"><OrdoIcon name="clock" :size="14" />App: só pedidos à API até a versão 1.46</span>
      </div>
    </div>

    <section v-if="notDeployed" class="op-state">
      <h2>O painel de uso ainda não está nesta API</h2>
      <p>As rotas <code>/api/v1/admin/usage/…</code> responderam 404. Elas chegam com a telemetria própria do Ordo (estevao-api #353 e #354); depois do deploy, os números aparecem aqui na madrugada seguinte.</p>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </section>

    <section v-else-if="allFailed" class="op-state op-state--error" role="alert">
      <h2>Não foi possível ler o uso</h2>
      <p>{{ errorText(core.top.error) }}</p>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </section>

    <template v-else>
      <p v-if="window.clamped" class="op-inline-note">
        <OrdoIcon name="info" :size="18" />
        <span>O uso cobre no máximo 366 dias: mostrando os 366 dias até ontem.</span>
      </p>
      <template v-if="section === 'resumo'">
        <OrdoUsagePartialState v-if="firstRollupPending" />
        <OrdoUsageSummary v-else />
      </template>
      <template v-else-if="section === 'recursos'">
        <OrdoUsageFeatureDetail v-if="resource" :key="resource" :feature="resource" />
        <OrdoUsageFeatures v-else />
      </template>
      <OrdoUsageAudience v-else-if="section === 'publico'" />
      <OrdoUsageFunnels v-else-if="section === 'funis'" />
      <OrdoUsageContent v-else-if="section === 'conteudo'" />
    </template>
  </div>
</template>
