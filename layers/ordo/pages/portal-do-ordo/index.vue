<script setup lang="ts">
import '../../assets/portal.css'
import OrdoAudioOperationsPanel from '../../components/ordo/AudioOperationsPanel.vue'
import OrdoGrowthPanel from '../../components/ordo/GrowthPanel.vue'
import OrdoIcon, { type OrdoIconName } from '../../components/ordo/Icon.vue'
import OrdoOperationsPanel from '../../components/ordo/OperationsPanel.vue'
import OrdoOverviewPanel from '../../components/ordo/OverviewPanel.vue'
import OrdoPeriodPicker from '../../components/ordo/PeriodPicker.vue'
import OrdoPlatformPanel from '../../components/ordo/PlatformPanel.vue'
import OrdoPracticePanel from '../../components/ordo/PracticePanel.vue'
import OrdoRail, { type RailTab } from '../../components/ordo/Rail.vue'
import OrdoUsagePanel from '../../components/ordo/UsagePanel.vue'
import { provideDashboardContext } from '../../composables/useDashboardContext'
import { createPortalQuery, providePortalQuery } from '../../composables/usePortalQuery'
import { previousLabel as previousLabelFor, previousPeriod } from '../../utils/compare'
import { liturgicalTheme } from '../../utils/liturgical'
import { groupsByMonth, periodShortLabel, type PeriodValue } from '../../utils/period'
import {
  periodFromQuery,
  periodToQuery,
  queryForLocation,
  tabFromSlug,
  type PortalLocation,
  type PortalTab
} from '../../utils/portalRoute'
import {
  isSessionError,
  type DashboardAudio,
  type DashboardData,
  type DashboardPeriod,
  type DashboardSectionName
} from '../../types/dashboard'

definePageMeta({
  middleware: 'ordo-auth'
})

useHead({
  title: 'Portal do Ordo',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Playfair+Display:wght@500;600&family=Raleway:wght@400;500;600;700&display=swap' }
  ]
})

type DashboardTab = PortalTab

interface TabDefinition {
  id: DashboardTab
  label: string
  shortLabel: string
  icon: OrdoIconName
  group: 'reading' | 'care'
  title: string
  description: string
  usesPeriod: boolean
}

const TABS: TabDefinition[] = [
  { id: 'overview', label: 'Visão geral', shortLabel: 'Resumo', icon: 'overview', group: 'reading', title: 'Ritmo do ofício', description: 'Como o Ordo está andando: quem reza, o que pede uma decisão e o que mudou no período.', usesPeriod: true },
  { id: 'growth', label: 'Pessoas & hábito', shortLabel: 'Pessoas', icon: 'people', group: 'reading', title: 'Pessoas que permanecem', description: 'Onde uma pessoa começa e o que a faz voltar no dia seguinte.', usesPeriod: true },
  { id: 'practice', label: 'Prática & conteúdo', shortLabel: 'Prática', icon: 'book', group: 'reading', title: 'O que está sendo rezado', description: 'Ofícios, livros, horários, diários e o que a comunidade compartilha.', usesPeriod: true },
  { id: 'platform', label: 'Negócio & API', shortLabel: 'Negócio', icon: 'layers', group: 'reading', title: 'Ordo+ e integrações', description: 'Assinaturas, chaves de API e quem constrói em cima do Ordo.', usesPeriod: true },
  { id: 'usage', label: 'Uso', shortLabel: 'Uso', icon: 'activity', group: 'reading', title: 'O que as pessoas usam', description: 'Recursos, eventos, pessoas ativas e funis do app e da web, pela telemetria própria do Ordo.', usesPeriod: true },
  { id: 'operations', label: 'Operação', shortLabel: 'Operação', icon: 'inbox', group: 'care', title: 'Fila de cuidado', description: 'Rosários enviados pela comunidade e os sinais da plataforma que pedem alguém.', usesPeriod: false },
  { id: 'audio', label: 'Áudio', shortLabel: 'Áudio', icon: 'audio', group: 'care', title: 'Narração do ofício', description: 'Gerar, ouvir e manter o catálogo de clips narrados.', usesPeriod: false }
]

// The first group paints the screen; the second fills in right after, so the
// page never waits on its heaviest section to show anything.
const SECTIONS: Record<DashboardTab, DashboardSectionName[][]> = {
  overview: [['overview', 'users', 'engagement', 'moderation', 'liturgical_today'], ['completions', 'prayer_books', 'notifications', 'health']],
  growth: [['users', 'engagement', 'onboarding'], ['retention', 'geography', 'prayer_books']],
  practice: [['completions', 'prayer_books'], ['journals', 'shared_offices', 'weekly_prayers', 'favorites']],
  platform: [['premium', 'api'], ['developers']],
  // Uso reads its own reports (/api/v1/admin/usage/*), not /dashboard.
  usage: [[]],
  operations: [['moderation', 'notifications', 'health', 'life_rules', 'custom_rosaries']],
  audio: [[]]
}

// The sections whose period numbers a card compares with the window just
// before. Read after the tab has painted, and only for the reading tabs.
const COMPARED: Record<DashboardTab, DashboardSectionName[]> = {
  overview: ['users', 'completions', 'notifications'],
  growth: ['users', 'onboarding'],
  practice: ['completions', 'journals', 'shared_offices', 'weekly_prayers'],
  platform: ['premium', 'api'],
  usage: [],
  operations: [],
  audio: []
}

const { user, logout, ready: authReady } = useFirebaseAuth()
const { fetchDashboard, fetchAudioSummary } = useOrdoApi()

// The URL is the source of truth for where the operator is: a reload, a
// bookmark or a link from the attention band opens the same tab, period and
// sub-tab. Changing tab adds a history entry; filters replace it.
const route = useRoute()
const router = useRouter()
const portalQuery = providePortalQuery(createPortalQuery({
  read: () => route.query,
  write: (query, push) => push ? router.push({ query }) : router.replace({ query })
}))
watch(() => route.query, query => portalQuery.sync(query))

const activeTab = computed<DashboardTab>(() => tabFromSlug(portalQuery.values.value.aba))
const period = computed<PeriodValue>({
  get: () => periodFromQuery(portalQuery.values.value),
  set: value => portalQuery.set(periodToQuery(value))
})
// The period object is rebuilt whenever any key changes; only its dates mean
// the data must be read again.
const periodKey = computed(() => `${period.value.preset}|${period.value.start}|${period.value.end}`)
const dashboard = ref<DashboardData>({})
const apiPeriod = ref<DashboardPeriod | null>(null)
const loadedSections = ref<DashboardSectionName[]>([])
const loadingTabs = ref<DashboardTab[]>([])
const dashboardError = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)
const audioSummary = ref<DashboardAudio | null>(null)
// Bumped by the refresh button; the Uso panel reloads its reports on change.
const usageReload = ref(0)
let generation = 0

// How many requests are reading each section right now. A section that is
// not loaded and has one on its way is "pending": its cards draw a skeleton.
const inFlight = ref<Partial<Record<DashboardSectionName, number>>>({})
const track = (sections: DashboardSectionName[], step: 1 | -1) => {
  const next = { ...inFlight.value }
  sections.forEach(section => { next[section] = Math.max(0, (next[section] || 0) + step) })
  inFlight.value = next
}

const previous = ref<DashboardData>({})
const previousLoaded = ref<DashboardSectionName[]>([])
const previousInFlight = ref<DashboardSectionName[]>([])

const activeDefinition = computed(() => TABS.find(tab => tab.id === activeTab.value) || TABS[0])
const activeLoading = computed(() => loadingTabs.value.includes(activeTab.value))
const monthly = computed(() => groupsByMonth(period.value))
const hasData = computed(() => loadedSections.value.length > 0)

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível carregar os dados.'

const fetchSections = async (sections: DashboardSectionName[], requestGeneration: number) => {
  const missing = sections.filter(section => !loadedSections.value.includes(section))
  if (!missing.length) return
  track(missing, 1)
  try {
    const response = await fetchDashboard({ start_date: period.value.start, end_date: period.value.end, sections: missing })
    if (requestGeneration !== generation) return
    dashboard.value = { ...dashboard.value, ...response.data }
    apiPeriod.value = response.period
    loadedSections.value = Array.from(new Set([...loadedSections.value, ...response.sections]))
    lastUpdatedAt.value = new Date()
  } finally {
    track(missing, -1)
  }
}

const comparedWindow = computed(() => previousPeriod(period.value))

// The same sections for the window just before the period. A failure here
// only costs the arrows, never the tab.
const fetchPrevious = async (tab: DashboardTab, requestGeneration: number) => {
  const window = comparedWindow.value
  const missing = COMPARED[tab].filter(section => !previousLoaded.value.includes(section) && !previousInFlight.value.includes(section))
  if (!window || !missing.length) return
  previousInFlight.value = [...previousInFlight.value, ...missing]
  try {
    const response = await fetchDashboard({ start_date: window.start, end_date: window.end, sections: missing })
    if (requestGeneration !== generation) return
    previous.value = { ...previous.value, ...response.data }
    previousLoaded.value = Array.from(new Set([...previousLoaded.value, ...response.sections]))
  } catch {
    // Without the previous window the cards simply show no comparison.
  } finally {
    if (requestGeneration === generation) previousInFlight.value = previousInFlight.value.filter(section => !missing.includes(section))
  }
}

const loadAudioSummary = async () => {
  try {
    audioSummary.value = await fetchAudioSummary()
  } catch (error) {
    if (!isSessionError(error)) audioSummary.value = null
  }
}

const loadTab = async (tab: DashboardTab) => {
  const requestGeneration = generation
  loadingTabs.value = [...new Set([...loadingTabs.value, tab])]
  dashboardError.value = null
  try {
    const [first, ...rest] = SECTIONS[tab]
    if (tab === 'overview' && !audioSummary.value) loadAudioSummary()
    await fetchSections(first, requestGeneration)
    await Promise.all([
      ...rest.map(group => fetchSections(group, requestGeneration)),
      fetchPrevious(tab, requestGeneration)
    ])
  } catch (error) {
    if (!isSessionError(error) && requestGeneration === generation) dashboardError.value = errorMessage(error)
  } finally {
    loadingTabs.value = loadingTabs.value.filter(item => item !== tab)
  }
}

// A new period invalidates every section that depends on it. The liturgical
// day and the moderation queue do not, but reloading them is cheap.
const reloadAll = async () => {
  generation += 1
  dashboard.value = { liturgical_today: dashboard.value.liturgical_today }
  loadedSections.value = dashboard.value.liturgical_today ? ['liturgical_today'] : []
  previous.value = {}
  previousLoaded.value = []
  previousInFlight.value = []
  await loadTab(activeTab.value)
}

const refresh = async () => {
  if (activeTab.value === 'audio') {
    await loadAudioSummary()
    return
  }
  if (activeTab.value === 'usage') {
    usageReload.value += 1
    return
  }
  const sections = SECTIONS[activeTab.value].flat()
  loadedSections.value = loadedSections.value.filter(section => !sections.includes(section))
  if (activeTab.value === 'overview') loadAudioSummary()
  await loadTab(activeTab.value)
}

// Before the first answer nothing is in flight yet, but nothing is loaded
// either: that is loading too, not a screen of zeros.
const booting = computed(() => !hasData.value && !dashboardError.value)
provideDashboardContext({
  isPending: (...sections) => sections.some(section => !loadedSections.value.includes(section) && ((inFlight.value[section] || 0) > 0 || booting.value)),
  previous: computed(() => comparedWindow.value ? previous.value : null),
  previousLabel: computed(() => previousLabelFor(period.value)),
  isPreviousPending: (...sections) => Boolean(comparedWindow.value) && sections.some(section => !previousLoaded.value.includes(section) && (previousInFlight.value.includes(section) || booting.value))
})

const navigate = (location: PortalLocation) => {
  const changesTab = location.tab !== activeTab.value
  portalQuery.set(queryForLocation(portalQuery.values.value, location), { push: true })
  if (changesTab && import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const selectTab = (id: string) => {
  if (id !== activeTab.value) navigate({ tab: id as DashboardTab })
}

const season = computed(() => {
  const today = dashboard.value.liturgical_today
  return today ? liturgicalTheme(today) : null
})

const shellStyle = computed(() => season.value
  ? { '--op-lit': season.value.color, '--op-lit-wash': season.value.wash, '--op-lit-ink': season.value.ink }
  : undefined)

const audioAttention = computed(() => {
  const summary = audioSummary.value
  if (!summary) return 0
  return (summary.pending_candidates || 0) + (summary.worker_queue?.purgeable || 0)
})

const railTabs = computed<RailTab[]>(() => TABS.map(tab => ({
  id: tab.id,
  label: tab.label,
  shortLabel: tab.shortLabel,
  icon: tab.icon,
  group: tab.group,
  count: tab.id === 'operations'
    ? dashboard.value.moderation?.custom_rosaries?.pending_now ?? null
    : tab.id === 'audio' ? audioAttention.value || null : null,
  countTone: 'gold'
})))

const todayLabel = computed(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
const updatedLabel = computed(() => {
  // Áudio reads its own data and keeps it fresh while there is work queued.
  if (activeTab.value === 'audio') return 'Ao vivo enquanto houver trabalho na fila'
  // Uso reads the nightly rollups: a day closes in the early hours of the next.
  if (activeTab.value === 'usage') return 'Resumos diários, fechados toda madrugada'
  return lastUpdatedAt.value
    ? `Dados de ${lastUpdatedAt.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · atualizam a cada 10 min`
    : 'Lendo os dados…'
})

watch(activeTab, tab => {
  if (authReady.value && user.value) loadTab(tab)
})

watch(periodKey, () => {
  if (authReady.value && user.value) reloadAll()
})

watch([authReady, user], ([isReady, currentUser]) => {
  if (isReady && currentUser && !hasData.value) loadTab(activeTab.value)
}, { immediate: true })
</script>

<template>
  <div class="ordo-shell" :style="shellStyle">
    <OrdoRail :tabs="railTabs" :active="activeTab" :user="user" :season="season" @select="selectTab" @logout="logout" />

    <div class="op-content">
      <header class="op-topbar">
        <nav class="op-crumbs" aria-label="Você está em">
          <span>{{ activeDefinition.group === 'care' ? 'Cuidado' : 'Leitura' }}</span>
          <OrdoIcon name="chevron-right" :size="14" />
          <strong>{{ activeDefinition.label }}</strong>
        </nav>
        <div class="op-topbar__status">
          <span class="op-live" :class="{ 'is-loading': activeLoading }"><i aria-hidden="true" />{{ activeLoading ? 'Lendo os dados…' : updatedLabel }}</span>
          <button type="button" class="op-icon-btn" aria-label="Atualizar dados" :disabled="activeLoading" @click="refresh">
            <OrdoIcon name="refresh" :size="18" />
          </button>
        </div>
      </header>

      <main class="op-main">
        <section class="op-page-head">
          <div class="op-page-head__copy">
            <div class="op-page-head__date">
              <span class="op-eyebrow">{{ todayLabel }}</span>
              <span v-if="season" class="op-pill op-pill--lit"><i aria-hidden="true" />{{ season.name }}</span>
            </div>
            <h1>{{ activeDefinition.title }}</h1>
            <p>{{ activeDefinition.description }}</p>
          </div>
          <div v-if="activeDefinition.usesPeriod" class="op-page-head__tools">
            <OrdoPeriodPicker v-model="period" :disabled="activeLoading" />
          </div>
        </section>

        <div v-if="dashboardError" class="op-inline-error" role="alert">
          <OrdoIcon name="alert" :size="18" />
          <span style="flex: 1">{{ dashboardError }}</span>
          <button type="button" class="op-btn op-btn--small" @click="refresh">Tentar de novo</button>
        </div>

        <OrdoAudioOperationsPanel v-if="activeTab === 'audio'" />
        <OrdoOperationsPanel v-else-if="activeTab === 'operations'" :dashboard="dashboard" :loading="activeLoading" :period-label="periodShortLabel(period)" />
        <template v-else>
          <OrdoOverviewPanel v-if="activeTab === 'overview'" :dashboard="dashboard" :audio="audioSummary" :period="period" :monthly="monthly" @navigate="navigate" />
          <OrdoGrowthPanel v-else-if="activeTab === 'growth'" :dashboard="dashboard" :period="period" :monthly="monthly" />
          <OrdoPracticePanel v-else-if="activeTab === 'practice'" :dashboard="dashboard" :period="period" :monthly="monthly" />
          <OrdoPlatformPanel v-else-if="activeTab === 'platform'" :dashboard="dashboard" :period="period" />
          <OrdoUsagePanel v-else-if="activeTab === 'usage'" :period="period" :monthly="monthly" :reload-key="usageReload" />
        </template>
      </main>
    </div>
  </div>
</template>
