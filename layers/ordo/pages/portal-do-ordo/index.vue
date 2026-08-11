<script setup lang="ts">
import OrdoGrowthPanel from '../../components/ordo/GrowthPanel.vue'
import OrdoOperationsPanel from '../../components/ordo/OperationsPanel.vue'
import OrdoOverviewPanel from '../../components/ordo/OverviewPanel.vue'
import OrdoPlatformPanel from '../../components/ordo/PlatformPanel.vue'
import OrdoPracticePanel from '../../components/ordo/PracticePanel.vue'
import OrdoRosaryReviewModal from '../../components/ordo/RosaryReviewModal.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import {
  isSessionError,
  type CustomRosaryPrayer,
  type CustomRosaryShareStatus,
  type DashboardData,
  type DashboardPeriod,
  type DashboardSectionName,
  type LifeRule,
  type LifeRulePagination,
  type LifeRuleStatus
} from '../../types/dashboard'

definePageMeta({
  middleware: 'ordo-auth'
})

type DashboardTab = 'overview' | 'growth' | 'practice' | 'operations' | 'platform'

interface TabDefinition {
  id: DashboardTab
  label: string
  shortLabel: string
  title: string
  description: string
  mark: string
}

const { user, logout, ready: authReady } = useFirebaseAuth()
const {
  fetchDashboard,
  fetchLifeRules,
  fetchCustomRosaries,
  fetchCustomRosary,
  approveCustomRosary,
  rejectCustomRosary
} = useOrdoApi()
const { formatDate, formatTimestamp, humanizeKey } = useOrdoDashboardPresentation()

const tabDefinitions: TabDefinition[] = [
  { id: 'overview', label: 'Visão geral', shortLabel: 'Resumo', title: 'Ritmo do ofício', description: 'Uma leitura rápida da saúde espiritual e operacional do app.', mark: '◒' },
  { id: 'growth', label: 'Pessoas & hábito', shortLabel: 'Pessoas', title: 'Pessoas que permanecem', description: 'Aquisição, primeiros passos e sinais de continuidade.', mark: '⌁' },
  { id: 'practice', label: 'Prática & conteúdo', shortLabel: 'Prática', title: 'O que está sendo rezado', description: 'Ofícios, livros, diários e conteúdo compartilhado.', mark: '✦' },
  { id: 'operations', label: 'Operação', shortLabel: 'Operação', title: 'Fila de cuidado', description: 'Saúde da plataforma e itens que precisam de decisão humana.', mark: '◌' },
  { id: 'platform', label: 'Negócio & API', shortLabel: 'Plataforma', title: 'A camada de plataforma', description: 'Premium, chaves e consumo das integrações.', mark: '＋' }
]

const sectionGroups: Record<DashboardTab, DashboardSectionName[]> = {
  overview: ['overview', 'users', 'engagement'],
  growth: ['users', 'engagement', 'retention', 'onboarding', 'geography'],
  practice: ['completions', 'prayer_books', 'journals', 'shared_offices', 'weekly_prayers', 'favorites'],
  operations: ['audio', 'notifications', 'life_rules', 'moderation', 'health', 'custom_rosaries'],
  platform: ['premium', 'api', 'developers', 'geography']
}

const getDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(today.getDate() - 30)

const activeTab = ref<DashboardTab>('overview')
const dashboard = ref<DashboardData>({})
const period = ref<DashboardPeriod | null>(null)
const startDate = ref(getDateInput(thirtyDaysAgo))
const endDate = ref(getDateInput(today))
const loadedSections = ref<DashboardSectionName[]>([])
const loadingTabs = ref<DashboardTab[]>([])
const dashboardError = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)
const hasLoadedOnce = ref(false)

const lifeRules = ref<LifeRule[]>([])
const lifeRulesPagination = ref<LifeRulePagination | null>(null)
const lifeRulesLoading = ref(false)
const lifeRulesError = ref<string | null>(null)
const lifeRuleStatus = ref<LifeRuleStatus>('pending')
const lifeRuleSearch = ref('')
const lifeRuleOffset = ref(0)
const lifeRuleLimit = 6

const customRosaries = ref<CustomRosaryPrayer[]>([])
const customRosariesLoading = ref(false)
const customRosariesError = ref<string | null>(null)
const customRosaryStatus = ref<Exclude<CustomRosaryShareStatus, 'private'>>('pending_review')
const selectedRosary = ref<CustomRosaryPrayer | null>(null)
const selectedRosaryLoading = ref(false)
const rosaryActionLoading = ref(false)
const rosaryActionError = ref<string | null>(null)
const strapiSlug = ref('')
const rejectionReason = ref('')

const activeTabDefinition = computed(() => tabDefinitions.find(tab => tab.id === activeTab.value) || tabDefinitions[0])
const isTabLoading = (tab: DashboardTab) => loadingTabs.value.includes(tab)
const activeTabLoading = computed(() => isTabLoading(activeTab.value))
const dashboardReady = computed(() => hasLoadedOnce.value || loadedSections.value.length > 0)
const lifeRuleTotalPages = computed(() => Math.max(1, Math.ceil((lifeRulesPagination.value?.total || 0) / lifeRuleLimit)))
const lifeRuleCurrentPage = computed(() => Math.floor(lifeRuleOffset.value / lifeRuleLimit) + 1)
const moderationSummary = computed(() => dashboard.value.moderation?.custom_rosaries)
const customRosaryStatusItems = computed(() => Object.entries(dashboard.value.custom_rosaries?.by_share_status || {})
  .map(([key, value]) => ({ key, label: humanizeKey(key), value: value || 0 })))

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível carregar os dados.'

const mergeDashboard = (response: { period: DashboardPeriod; sections: DashboardSectionName[]; data: DashboardData }) => {
  dashboard.value = { ...dashboard.value, ...response.data }
  period.value = response.period
  loadedSections.value = Array.from(new Set([...loadedSections.value, ...response.sections]))
  lastUpdatedAt.value = new Date()
  hasLoadedOnce.value = true
}

const loadLifeRules = async () => {
  lifeRulesLoading.value = true
  lifeRulesError.value = null
  try {
    const response = await fetchLifeRules({ status: lifeRuleStatus.value, search: lifeRuleSearch.value, limit: lifeRuleLimit, offset: lifeRuleOffset.value })
    lifeRules.value = response.life_rules || []
    lifeRulesPagination.value = response.pagination
  } catch (error) {
    if (!isSessionError(error)) lifeRulesError.value = errorMessage(error)
  } finally {
    lifeRulesLoading.value = false
  }
}

const loadCustomRosaries = async () => {
  customRosariesLoading.value = true
  customRosariesError.value = null
  try {
    const response = await fetchCustomRosaries({ share_status: customRosaryStatus.value })
    customRosaries.value = response.custom_rosary_prayers || []
  } catch (error) {
    if (!isSessionError(error)) customRosariesError.value = errorMessage(error)
  } finally {
    customRosariesLoading.value = false
  }
}

const loadTab = async (tab: DashboardTab, force = false) => {
  const requestedSections = sectionGroups[tab]
  const sections = force ? requestedSections : requestedSections.filter(section => !loadedSections.value.includes(section))
  const shouldLoadQueue = tab === 'operations' && (force || !lifeRulesPagination.value || !customRosaries.value.length)
  if (!sections.length && !shouldLoadQueue) return

  loadingTabs.value = [...new Set([...loadingTabs.value, tab])]
  dashboardError.value = null

  try {
    if (sections.length) {
      const response = await fetchDashboard({ start_date: startDate.value, end_date: endDate.value, sections })
      mergeDashboard(response)
    }
    if (tab === 'operations' && shouldLoadQueue) await Promise.all([loadLifeRules(), loadCustomRosaries()])
  } catch (error) {
    if (!isSessionError(error)) dashboardError.value = errorMessage(error)
  } finally {
    loadingTabs.value = loadingTabs.value.filter(item => item !== tab)
  }
}

const refreshCurrentTab = () => loadTab(activeTab.value, true)

const applyDateRange = async () => {
  if (!startDate.value || !endDate.value || startDate.value > endDate.value) {
    dashboardError.value = 'O início do período precisa ser anterior ao fim.'
    return
  }
  dashboard.value = {}
  loadedSections.value = []
  period.value = null
  hasLoadedOnce.value = false
  await loadTab(activeTab.value, true)
}

const searchLifeRules = async () => {
  lifeRuleOffset.value = 0
  await loadLifeRules()
}

const changeLifeRulePage = async (direction: number) => {
  const nextOffset = lifeRuleOffset.value + direction * lifeRuleLimit
  if (nextOffset < 0 || nextOffset >= (lifeRulesPagination.value?.total || 0)) return
  lifeRuleOffset.value = nextOffset
  await loadLifeRules()
}

const openRosary = async (rosary: CustomRosaryPrayer) => {
  selectedRosary.value = rosary
  strapiSlug.value = rosary.strapi_slug || ''
  rejectionReason.value = rosary.moderation_note || ''
  rosaryActionError.value = null
  selectedRosaryLoading.value = true
  try {
    const response = await fetchCustomRosary(rosary.id)
    selectedRosary.value = response.custom_rosary_prayer
    strapiSlug.value = response.custom_rosary_prayer.strapi_slug || ''
    rejectionReason.value = response.custom_rosary_prayer.moderation_note || ''
  } catch (error) {
    if (!isSessionError(error)) rosaryActionError.value = errorMessage(error)
  } finally {
    selectedRosaryLoading.value = false
  }
}

const closeRosary = () => {
  if (!rosaryActionLoading.value) {
    selectedRosary.value = null
    rosaryActionError.value = null
  }
}

const replaceRosaryInList = (updated: CustomRosaryPrayer) => {
  customRosaries.value = customRosaries.value.map(item => item.id === updated.id ? updated : item)
}

const approveSelectedRosary = async () => {
  if (!selectedRosary.value) return
  rosaryActionLoading.value = true
  rosaryActionError.value = null
  try {
    const response = await approveCustomRosary(selectedRosary.value.id, strapiSlug.value)
    selectedRosary.value = response.custom_rosary_prayer
    replaceRosaryInList(response.custom_rosary_prayer)
  } catch (error) {
    if (!isSessionError(error)) rosaryActionError.value = errorMessage(error)
  } finally {
    rosaryActionLoading.value = false
  }
}

const rejectSelectedRosary = async () => {
  if (!selectedRosary.value) return
  rosaryActionLoading.value = true
  rosaryActionError.value = null
  try {
    const response = await rejectCustomRosary(selectedRosary.value.id, rejectionReason.value)
    selectedRosary.value = response.custom_rosary_prayer
    replaceRosaryInList(response.custom_rosary_prayer)
  } catch (error) {
    if (!isSessionError(error)) rosaryActionError.value = errorMessage(error)
  } finally {
    rosaryActionLoading.value = false
  }
}

watch(activeTab, tab => {
  if (authReady.value && user.value) loadTab(tab)
})

watch([authReady, user], ([isReady, currentUser]) => {
  if (isReady && currentUser && !hasLoadedOnce.value) loadTab('overview')
}, { immediate: true })
</script>

<template>
  <div class="ordo-shell">
    <div class="ordo-shell__grid" aria-hidden="true" />
    <header class="ordo-topbar">
      <div class="ordo-brand"><div class="ordo-brand__mark">✦</div><div><p class="ordo-brand__overline">Caminho Anglicano</p><p class="ordo-brand__name">Portal do Ordo</p></div></div>
      <div class="ordo-topbar__center"><span class="ordo-live-dot" /><span>painel administrativo</span><span class="ordo-topbar__separator">/</span><span>dados com cache de até 10 min</span></div>
      <div class="ordo-account"><div v-if="user?.photoURL" class="ordo-account__avatar"><img :src="user.photoURL" alt="" referrerpolicy="no-referrer"></div><div v-else class="ordo-account__avatar ordo-account__avatar--fallback">{{ (user?.displayName || user?.email || 'A').charAt(0).toUpperCase() }}</div><div class="ordo-account__copy"><strong>{{ user?.displayName || 'Administrador' }}</strong><span>{{ user?.email }}</span></div><button class="ordo-logout" type="button" aria-label="Sair do portal" @click="logout">Sair <span>↗</span></button></div>
    </header>

    <div class="ordo-mobile-nav" role="tablist" aria-label="Seções do portal"><button v-for="tab in tabDefinitions" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" role="tab" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id"><span>{{ tab.mark }}</span>{{ tab.shortLabel }}</button></div>

    <div class="ordo-layout">
      <aside class="ordo-sidebar"><div class="ordo-sidebar__caption">Navegação</div><nav class="ordo-sidebar__nav" aria-label="Seções do portal"><button v-for="tab in tabDefinitions" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" @click="activeTab = tab.id"><span class="ordo-sidebar__mark">{{ tab.mark }}</span><span>{{ tab.label }}</span><span v-if="tab.id === 'operations' && moderationSummary?.pending_now" class="ordo-sidebar__count">{{ moderationSummary.pending_now }}</span></button></nav><div class="ordo-sidebar__footer"><div class="ordo-sidebar__seal">⌁</div><p>Leitura responsável</p><span>O período é inclusivo e segue o fuso da API.</span></div></aside>

      <main class="ordo-main">
        <section class="ordo-intro"><div><p class="ordo-kicker">{{ activeTabDefinition.shortLabel }} <span>·</span> visão administrativa</p><h1>{{ activeTabDefinition.title }}</h1><p class="ordo-intro__description">{{ activeTabDefinition.description }}</p></div><div class="ordo-intro__meta"><span class="ordo-scope-pill">{{ period ? `${formatDate(period.start_date)} — ${formatDate(period.end_date)}` : 'Preparando período' }}</span><span v-if="lastUpdatedAt" class="ordo-updated">Atualizado {{ formatTimestamp(lastUpdatedAt.toISOString()) }}</span></div></section>

        <section class="ordo-filter-bar" aria-label="Filtros do dashboard"><div class="ordo-filter-bar__period"><span class="ordo-filter-bar__label">Período de leitura</span><label><span>De</span><input v-model="startDate" type="date" @keyup.enter="applyDateRange"></label><span class="ordo-filter-bar__dash">—</span><label><span>Até</span><input v-model="endDate" type="date" @keyup.enter="applyDateRange"></label></div><div class="ordo-filter-bar__actions"><span v-if="activeTabLoading" class="ordo-loading-note"><i /> lendo API…</span><button type="button" class="ordo-button ordo-button--quiet" :disabled="activeTabLoading" @click="refreshCurrentTab"><span>↻</span> Atualizar</button><button type="button" class="ordo-button ordo-button--primary" :disabled="activeTabLoading" @click="applyDateRange">Aplicar período <span>→</span></button></div></section>

        <section v-if="dashboardError && !dashboardReady" class="ordo-state ordo-state--error"><span class="ordo-state__symbol">!</span><div><h2>Não foi possível abrir o painel</h2><p>{{ dashboardError }}</p><button type="button" class="ordo-button ordo-button--primary" @click="loadTab(activeTab, true)">Tentar novamente <span>↗</span></button></div></section>
        <section v-else-if="!dashboardReady" class="ordo-loading-panel"><div class="ordo-loading-panel__orb" /><p>Consultando os sinais do Ordo</p><span>Autenticando e preparando as seções necessárias…</span></section>
        <template v-else>
          <div v-if="dashboardError" class="ordo-inline-error"><span>!</span>{{ dashboardError }}</div>
          <OrdoOverviewPanel v-if="activeTab === 'overview'" :dashboard="dashboard" :period="period" />
          <OrdoGrowthPanel v-else-if="activeTab === 'growth'" :dashboard="dashboard" :period="period" :start-date="startDate" :end-date="endDate" />
          <OrdoPracticePanel v-else-if="activeTab === 'practice'" :dashboard="dashboard" :start-date="startDate" :end-date="endDate" />
          <OrdoOperationsPanel v-else-if="activeTab === 'operations'" :dashboard="dashboard" :life-rules="lifeRules" :life-rules-pagination="lifeRulesPagination" :life-rules-loading="lifeRulesLoading" :life-rules-error="lifeRulesError" :life-rule-status="lifeRuleStatus" :life-rule-search="lifeRuleSearch" :life-rule-current-page="lifeRuleCurrentPage" :life-rule-total-pages="lifeRuleTotalPages" :custom-rosaries="customRosaries" :custom-rosaries-loading="customRosariesLoading" :custom-rosaries-error="customRosariesError" :custom-rosary-status="customRosaryStatus" :selected-rosary-status-items="customRosaryStatusItems" @update:life-rule-status="lifeRuleStatus = $event" @update:life-rule-search="lifeRuleSearch = $event" @search-life-rules="searchLifeRules" @change-life-rule-page="changeLifeRulePage" @update:custom-rosary-status="customRosaryStatus = $event" @change-custom-rosary-status="loadCustomRosaries" @open-rosary="openRosary" />
          <OrdoPlatformPanel v-else :dashboard="dashboard" />
        </template>
      </main>
    </div>

    <OrdoRosaryReviewModal v-if="selectedRosary" :rosary="selectedRosary" :loading="selectedRosaryLoading" :action-loading="rosaryActionLoading" :action-error="rosaryActionError" :strapi-slug="strapiSlug" :rejection-reason="rejectionReason" @close="closeRosary" @update:strapi-slug="strapiSlug = $event" @update:rejection-reason="rejectionReason = $event" @approve="approveSelectedRosary" @reject="rejectSelectedRosary" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
:root { color-scheme: light; }
body { margin: 0; background: #e7ece4; }
.ordo-shell { --ink: #233328; --ink-soft: #6e7b6e; --moss: #496451; --moss-deep: #20372a; --ochre: #c9934d; --line: #dce4d9; position: relative; min-height: 100vh; overflow: hidden; background: #e7ece4; color: var(--ink); font-family: 'DM Sans', sans-serif; }
.ordo-shell__grid { position: fixed; inset: 0; pointer-events: none; opacity: .34; background-image: linear-gradient(rgba(73,100,81,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(73,100,81,.05) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom, black, transparent 74%); }
.ordo-topbar { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(230px,1fr) auto minmax(230px,1fr); align-items: center; gap: 24px; max-width: 1540px; margin: 0 auto; padding: 24px 40px 20px; }
.ordo-brand, .ordo-account, .ordo-topbar__center, .ordo-sidebar__nav button, .ordo-filter-bar, .ordo-filter-bar__period, .ordo-filter-bar__actions, .ordo-queue-item__copy>div, .ordo-modal__facts, .ordo-modal__actions { display: flex; align-items: center; }
.ordo-brand { gap: 12px; }.ordo-brand__mark { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid rgba(73,100,81,.22); border-radius: 13px; background: var(--moss-deep); color: #e7cf9f; font-size: 18px; box-shadow: 0 6px 16px rgba(32,55,42,.16); }.ordo-brand__overline,.ordo-brand__name,.ordo-kicker,.ordo-sidebar__caption,.ordo-filter-bar__label,.ordo-scope-label,.ordo-updated { margin: 0; }.ordo-brand__overline { color: #829082; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }.ordo-brand__name { margin-top: 3px; color: var(--ink); font-family: 'Fraunces',Georgia,serif; font-size: 20px; font-weight: 600; letter-spacing: -.03em; }
.ordo-topbar__center { justify-content: center; gap: 8px; color: #7d897e; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }.ordo-topbar__separator { color: #b9c5b8; }.ordo-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #6d9b72; box-shadow: 0 0 0 4px rgba(109,155,114,.14); }.ordo-account { justify-content: flex-end; gap: 10px; }.ordo-account__avatar { display: grid; width: 34px; height: 34px; overflow: hidden; place-items: center; border: 2px solid #f7f8f3; border-radius: 50%; background: #dce7db; color: var(--moss); font-weight: 800; box-shadow: 0 2px 8px rgba(38,55,44,.12); }.ordo-account__avatar img { width: 100%; height: 100%; object-fit: cover; }.ordo-account__copy { display: grid; max-width: 155px; gap: 2px; }.ordo-account__copy strong,.ordo-account__copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ordo-account__copy strong { color: var(--ink); font-size: 12px; }.ordo-account__copy span { color: #879287; font-size: 10px; }.ordo-logout { margin-left: 10px; padding: 7px 0 7px 10px; border: 0; border-left: 1px solid #d6dfd4; background: transparent; color: #788678; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; }.ordo-logout span { color: var(--ochre); font-size: 15px; }
.ordo-layout { position: relative; z-index: 1; display: grid; grid-template-columns: 212px minmax(0,1fr); gap: 42px; max-width: 1540px; margin: 0 auto; padding: 12px 40px 60px; }.ordo-sidebar { display: flex; flex-direction: column; min-height: calc(100vh - 150px); padding-top: 20px; }.ordo-sidebar__caption { padding: 0 12px 10px; color: #99a498; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }.ordo-sidebar__nav { display: grid; gap: 4px; }.ordo-sidebar__nav button { width: 100%; gap: 11px; padding: 12px; border: 1px solid transparent; border-radius: 13px; background: transparent; color: #778378; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; text-align: left; }.ordo-sidebar__nav button.is-active { border-color: rgba(73,100,81,.13); background: rgba(251,252,248,.8); color: var(--moss-deep); box-shadow: 0 8px 18px rgba(38,55,44,.055); }.ordo-sidebar__mark { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 9px; background: #dde7dc; color: var(--moss); font-size: 14px; }.ordo-sidebar__nav button.is-active .ordo-sidebar__mark { background: var(--moss-deep); color: #ead4a2; }.ordo-sidebar__count { display: grid; min-width: 20px; height: 20px; margin-left: auto; padding: 0 5px; place-items: center; border-radius: 99px; background: #f2d7c5; color: #a95d43; font-size: 10px; font-weight: 800; }.ordo-sidebar__footer { margin-top: auto; padding: 24px 12px 0; }.ordo-sidebar__seal { display: grid; width: 30px; height: 30px; margin-bottom: 10px; place-items: center; border: 1px solid #cbd7c9; border-radius: 50%; color: var(--ochre); font-size: 18px; }.ordo-sidebar__footer p { margin: 0 0 4px; color: var(--ink); font-family: 'Fraunces',Georgia,serif; font-size: 14px; font-weight: 600; }.ordo-sidebar__footer span { display: block; max-width: 150px; color: #8b968c; font-size: 10px; line-height: 1.5; }.ordo-main { min-width: 0; padding-top: 14px; }
.ordo-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 18px 0 28px; }.ordo-kicker { color: #8b978b; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }.ordo-kicker span { color: var(--ochre); }.ordo-intro h1 { max-width: 720px; margin: 10px 0 0; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: clamp(38px,5vw,66px); font-weight: 600; letter-spacing: -.058em; line-height: .94; }.ordo-intro__description { max-width: 540px; margin: 14px 0 0; color: #7e8b80; font-size: 14px; line-height: 1.55; }.ordo-intro__meta { display: grid; justify-items: end; gap: 8px; padding-bottom: 4px; }.ordo-scope-pill { display: inline-flex; padding: 8px 11px; border: 1px solid #d5dfd2; border-radius: 99px; background: rgba(251,252,248,.64); color: var(--moss); font-size: 10px; font-weight: 800; letter-spacing: .05em; }.ordo-updated { color: #9aa59a; font-size: 10px; }
.ordo-filter-bar { justify-content: space-between; gap: 18px; margin-bottom: 34px; padding: 12px 14px 12px 18px; border: 1px solid rgba(50,73,56,.12); border-radius: 17px; background: rgba(251,252,248,.75); box-shadow: 0 9px 22px rgba(38,55,44,.04); }.ordo-filter-bar__period { gap: 12px; }.ordo-filter-bar__label { margin-right: 4px; color: #68766a; font-size: 11px; font-weight: 800; }.ordo-filter-bar label { display: flex; align-items: center; gap: 7px; color: #9ba59a; font-size: 10px; font-weight: 700; }.ordo-filter-bar input,.ordo-queue-card__filters input,.ordo-queue-card__filters select { min-width: 0; padding: 8px 9px; border: 1px solid #d8e1d5; border-radius: 9px; outline: 0; background: #f9fbf7; color: var(--ink); font: inherit; font-size: 11px; }.ordo-filter-bar__dash { color: #aeb9ad; }.ordo-filter-bar__actions { justify-content: flex-end; gap: 8px; }.ordo-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 34px; padding: 8px 12px; border: 1px solid transparent; border-radius: 10px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 800; }.ordo-button:disabled { cursor: not-allowed; opacity: .5; }.ordo-button--primary { background: var(--moss-deep); color: #f8faf5; box-shadow: 0 7px 14px rgba(32,55,42,.13); }.ordo-button--quiet { border-color: #d8e1d5; background: #f8faf6; color: #637265; }.ordo-loading-note { display: inline-flex; align-items: center; gap: 7px; color: #8d9a8e; font-size: 10px; }.ordo-loading-note i { width: 7px; height: 7px; border: 2px solid #b8c7b7; border-top-color: var(--moss); border-radius: 50%; animation: ordo-spin 800ms linear infinite; }
.ordo-content-stack { display: grid; gap: 22px; animation: ordo-enter 420ms ease both; }.ordo-section-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 2px 0 4px; }.ordo-section-intro h2 { max-width: 600px; margin: 8px 0 0; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: clamp(27px,3vw,39px); font-weight: 600; letter-spacing: -.045em; line-height: 1; }.ordo-scope-label { color: #899589; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.ordo-metrics-grid { display: grid; gap: 12px; }.ordo-metrics-grid--four { grid-template-columns: repeat(4,minmax(0,1fr)); }.ordo-grid-2 { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }.ordo-chart-meta { display: flex; gap: 16px; margin: 0 0 5px; color: #8b978b; font-size: 10px; }.ordo-chart-meta strong { margin-left: 3px; color: var(--moss); font-size: 12px; }
.ordo-signal-card { position: relative; overflow: hidden; min-height: 100%; padding: 24px; border-radius: 22px; background: var(--moss-deep); color: #eef3e9; box-shadow: 0 14px 32px rgba(32,55,42,.15); }.ordo-signal-card::before { position: absolute; top: -72px; right: -46px; width: 200px; height: 200px; border: 1px solid rgba(234,212,162,.25); border-radius: 50%; box-shadow: 0 0 0 18px rgba(234,212,162,.04),0 0 0 38px rgba(234,212,162,.035); content: ''; }.ordo-signal-card__header { position: relative; display: flex; justify-content: space-between; gap: 12px; }.ordo-signal-card .ordo-kicker { color: #aabca8; }.ordo-signal-card h2 { max-width: 220px; margin: 9px 0 0; font-family: 'Fraunces',Georgia,serif; font-size: 27px; font-weight: 500; letter-spacing: -.04em; line-height: 1.03; }.ordo-signal-card__symbol { color: #e7cf9f; font-size: 28px; }.ordo-signal-list { position: relative; display: grid; gap: 0; margin-top: 32px; }.ordo-signal-list div { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-top: 1px solid rgba(235,244,231,.12); }.ordo-signal-list span { color: #b9c9b8; font-size: 11px; }.ordo-signal-list strong { color: #fff; font-family: 'Fraunces',Georgia,serif; font-size: 17px; font-weight: 600; }.ordo-signal-card__note { position: relative; margin: 24px 0 0; color: #a9bba7; font-size: 10px; line-height: 1.5; }
.ordo-highlight-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin: 14px 0 16px; }.ordo-highlight-grid div { min-width: 0; padding: 12px; border: 1px solid #e0e7dd; border-radius: 12px; background: #f4f7f1; }.ordo-highlight-grid span,.ordo-stat-banner span { display: block; overflow: hidden; color: #859185; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.ordo-highlight-grid strong { display: block; margin-top: 5px; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 20px; font-weight: 600; }.ordo-note-box { display: grid; grid-template-columns: auto auto; align-items: baseline; gap: 3px 10px; margin-top: 12px; padding: 12px; border-left: 2px solid var(--ochre); background: #f8f5eb; }.ordo-note-box span { color: #9a825e; font-size: 10px; font-weight: 800; text-transform: uppercase; }.ordo-note-box strong { color: #715331; font-family: 'Fraunces',Georgia,serif; font-size: 17px; }.ordo-note-box small { grid-column: 1/-1; color: #9b927f; font-size: 10px; }
.ordo-funnel { display: grid; gap: 13px; }.ordo-funnel__label { display: flex; justify-content: space-between; gap: 10px; color: #607062; font-size: 11px; }.ordo-funnel__label strong { color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 17px; }.ordo-funnel__step small { display: block; margin-top: 4px; color: #9aa59b; font-size: 10px; }.ordo-bar-track,.ordo-mini-bars i { display: block; overflow: hidden; border-radius: 99px; background: #ebf0e9; }.ordo-bar-track { height: 7px; margin-top: 7px; }.ordo-bar-track span,.ordo-mini-bars b { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,var(--moss),#8ca17e); transition: width 400ms ease; }.ordo-table-card,.ordo-queue-card { overflow: hidden; border: 1px solid rgba(50,73,56,.12); border-radius: 22px; background: rgba(251,252,248,.88); box-shadow: 0 12px 30px rgba(38,55,44,.05); }.ordo-table-card__header,.ordo-queue-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 14px; }.ordo-table-card h2,.ordo-queue-card h2 { margin: 7px 0 0; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 25px; font-weight: 600; letter-spacing: -.035em; }
.ordo-table-wrap { overflow-x: auto; padding: 0 24px 20px; }.ordo-table-wrap table { width: 100%; min-width: 570px; border-collapse: collapse; }.ordo-table-wrap th { padding: 11px 10px; border-bottom: 1px solid #dfe7dd; color: #97a296; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-align: left; text-transform: uppercase; }.ordo-table-wrap td { padding: 14px 10px; border-bottom: 1px solid #edf1eb; color: #59685b; font-size: 12px; }.ordo-table-wrap td:first-child { color: var(--ink); font-weight: 700; }.ordo-table-wrap td strong,.ordo-table-wrap td span { display: block; }.ordo-table-wrap td strong { color: var(--moss); font-size: 14px; }.ordo-table-wrap td span { margin-top: 3px; color: #99a49a; font-size: 10px; }
.ordo-mini-bars { display: grid; gap: 12px; margin-top: 16px; }.ordo-mini-bars>div { display: grid; grid-template-columns: minmax(90px,1fr) auto; gap: 5px 10px; align-items: center; }.ordo-mini-bars span { overflow: hidden; color: #637163; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.ordo-mini-bars strong { color: var(--ink); font-family: 'Fraunces',Georgia,serif; font-size: 15px; font-weight: 600; }.ordo-mini-bars i { grid-column: 1/-1; height: 5px; }.ordo-mini-bars b.is-ochre { background: linear-gradient(90deg,#b7793d,#e0b36e); }.ordo-mini-bars b.is-blue { background: linear-gradient(90deg,#457180,#8bb4bd); }.ordo-mini-bars b.is-pink { background: linear-gradient(90deg,#a65c64,#d59691); }.ordo-mini-bars--compact { padding: 0 24px 20px; }.ordo-stat-banner { display: flex; align-items: baseline; gap: 10px; padding: 12px 14px; border-radius: 13px; background: #eef3eb; }.ordo-stat-banner strong { color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 28px; font-weight: 600; letter-spacing: -.04em; }.ordo-alert-list { display: grid; gap: 8px; margin-top: 16px; }.ordo-alert-list>div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 12px; border: 1px solid #f0dfd0; border-radius: 11px; background: #fcf5ef; }.ordo-alert-list strong,.ordo-alert-list small { display: block; }.ordo-alert-list strong { color: #7e4d37; font-size: 12px; }.ordo-alert-list small { margin-top: 3px; color: #ad8a73; font-size: 10px; }.ordo-alert-list b { color: #a75f3e; font-family: 'Fraunces',Georgia,serif; font-size: 17px; }
.ordo-queue-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }.ordo-queue-card__header { padding-bottom: 17px; }.ordo-queue-card__header h2 { margin-bottom: 5px; }.ordo-queue-card__header span { color: #899589; font-size: 10px; }.ordo-queue-card__count { display: grid; min-width: 38px; height: 38px; place-items: center; border-radius: 12px; background: #edf2eb; color: var(--moss); font-family: 'Fraunces',Georgia,serif; font-size: 19px !important; font-weight: 600; }.ordo-queue-card__filters { display: flex; gap: 7px; padding: 0 24px 14px; }.ordo-queue-card__filters select { flex: 0 0 auto; }.ordo-queue-card__filters input { flex: 1; width: 50px; }.ordo-filter-caption { align-self: center; color: #9aa49a; font-size: 10px; }.ordo-queue-list { display: grid; }.ordo-queue-item { display: flex; align-items: flex-start; width: 100%; gap: 11px; padding: 14px 24px; border: 0; border-top: 1px solid #edf1eb; background: transparent; color: inherit; text-align: left; }.ordo-queue-item--button { cursor: pointer; }.ordo-queue-item__mark { display: grid; flex: 0 0 auto; width: 30px; height: 30px; place-items: center; border-radius: 10px; background: #e7eef3; color: #51788a; font-size: 14px; }.ordo-queue-item__mark--warm { background: #f6eadc; color: #af7147; }.ordo-queue-item__copy { min-width: 0; flex: 1; }.ordo-queue-item__copy>div { gap: 8px; }.ordo-queue-item__copy strong { overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.ordo-queue-item__copy p { margin: 4px 0; overflow: hidden; color: #7e897f; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.ordo-queue-item__copy small { display: block; overflow: hidden; color: #a0aaa0; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.ordo-queue-item__arrow { align-self: center; color: var(--ochre); font-size: 17px; }.ordo-status { display: inline-flex; flex: 0 0 auto; padding: 4px 7px; border-radius: 99px; background: #edf2eb; color: #667767; font-size: 9px; font-weight: 800; }.ordo-status.is-pending,.ordo-status.is-pending_review { background: #fff0df; color: #a46c34; }.ordo-status.is-approved { background: #e3f0e5; color: #4f7a58; }.ordo-status.is-rejected { background: #f5e4e3; color: #a85d5d; }.ordo-steps { margin-top: 8px; color: #7f8d80; font-size: 10px; }.ordo-steps summary { cursor: pointer; color: var(--moss); font-weight: 800; }.ordo-steps ol { margin: 7px 0 0; padding-left: 18px; line-height: 1.5; }.ordo-pagination { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px 24px 17px; border-top: 1px solid #edf1eb; color: #97a197; font-size: 10px; }.ordo-pagination button { padding: 4px 0; border: 0; background: transparent; color: var(--moss); cursor: pointer; font: inherit; font-size: 10px; font-weight: 800; }.ordo-pagination button:disabled { color: #c2cbc1; cursor: not-allowed; }.ordo-queue-loading,.ordo-queue-error { padding: 26px 24px; color: #8b968b; font-size: 12px; }.ordo-queue-error { color: #a5635c; }
.ordo-inline-error { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #efd8d1; border-radius: 10px; background: #fdf3f0; color: #a5675e; font-size: 11px; }.ordo-inline-error span,.ordo-info-callout>span { display: grid; flex: 0 0 auto; width: 20px; height: 20px; place-items: center; border-radius: 50%; background: #f3d8d0; color: #a35c50; font-weight: 800; }.ordo-info-callout { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid #e9dcc3; border-radius: 12px; background: #fbf7ed; color: #85765d; font-size: 11px; line-height: 1.5; }.ordo-info-callout p { margin: 1px 0 0; }.ordo-info-callout strong { color: #715d3f; }.ordo-state { display: flex; align-items: flex-start; gap: 15px; max-width: 610px; margin: 60px auto; padding: 22px; border: 1px solid #efd8d1; border-radius: 18px; background: #fdf5f1; }.ordo-state__symbol { display: grid; flex: 0 0 auto; width: 34px; height: 34px; place-items: center; border-radius: 12px; background: #f3d8d0; color: #a35c50; font-weight: 800; }.ordo-state h2 { margin: 2px 0 6px; color: #7e4b42; font-family: 'Fraunces',Georgia,serif; font-size: 25px; font-weight: 600; }.ordo-state p { margin: 0 0 15px; color: #a16f65; font-size: 12px; line-height: 1.5; }.ordo-loading-panel { display: grid; justify-items: center; padding: 130px 20px; color: #788778; text-align: center; }.ordo-loading-panel__orb { width: 52px; height: 52px; margin-bottom: 20px; border: 1px solid #b4c6b3; border-top-color: var(--moss-deep); border-radius: 50%; box-shadow: 0 0 0 10px rgba(73,100,81,.06),inset 0 0 0 8px rgba(73,100,81,.04); animation: ordo-spin 1.2s linear infinite; }.ordo-loading-panel p { margin: 0; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 24px; }.ordo-loading-panel span { margin-top: 8px; color: #9aa59b; font-size: 11px; }
.ordo-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; overflow: auto; place-items: center; padding: 22px; background: rgba(25,42,31,.48); backdrop-filter: blur(8px); }.ordo-modal { width: min(760px,100%); max-height: min(840px,calc(100vh - 44px)); overflow: auto; border: 1px solid rgba(255,255,255,.55); border-radius: 22px; background: #f8faf5; box-shadow: 0 30px 80px rgba(22,37,27,.25); }.ordo-modal__header { display: flex; justify-content: space-between; gap: 16px; padding: 24px 26px 17px; border-bottom: 1px solid #e2e9df; }.ordo-modal__header h2 { margin: 7px 0 4px; color: var(--moss-deep); font-family: 'Fraunces',Georgia,serif; font-size: 31px; font-weight: 600; letter-spacing: -.04em; }.ordo-modal__header span { color: #8c988c; font-size: 11px; }.ordo-modal__close { width: 30px; height: 30px; border: 1px solid #d9e3d7; border-radius: 10px; background: #fff; color: #798579; cursor: pointer; font-size: 21px; line-height: 1; }.ordo-modal__facts { flex-wrap: wrap; gap: 8px; padding: 14px 26px 0; color: #8d998e; font-size: 10px; }.ordo-modal__facts>span:not(.ordo-status) { padding: 4px 7px; border: 1px solid #e0e7dd; border-radius: 99px; background: #f1f5ef; }.ordo-modal__description { margin: 13px 26px; color: #718073; font-size: 12px; line-height: 1.5; }.ordo-modal__sequence { display: grid; gap: 7px; max-height: 310px; overflow: auto; margin: 0 26px; padding: 4px 8px 4px 0; }.ordo-modal__step { display: grid; grid-template-columns: 30px 1fr; gap: 10px; padding: 10px; border: 1px solid #e4ebe1; border-radius: 11px; background: #fff; }.ordo-modal__step>span { color: var(--ochre); font-family: 'Fraunces',Georgia,serif; font-size: 15px; }.ordo-modal__step strong,.ordo-modal__step small,.ordo-modal__step p { display: block; }.ordo-modal__step strong { color: var(--ink); font-size: 12px; }.ordo-modal__step small { margin-top: 2px; color: #9aa59b; font-size: 9px; text-transform: uppercase; }.ordo-modal__step p { margin: 6px 0 0; color: #6e7c70; font-size: 11px; line-height: 1.45; white-space: pre-wrap; }.ordo-modal__form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 18px 26px 0; }.ordo-modal__form label { display: grid; gap: 6px; color: #718073; font-size: 10px; font-weight: 800; }.ordo-modal__form input,.ordo-modal__form textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 9px 10px; border: 1px solid #dbe4d8; border-radius: 9px; outline: 0; background: #fff; color: var(--ink); font: inherit; font-size: 11px; }.ordo-modal__error { margin: 13px 26px 0; color: #a15f57; font-size: 11px; }.ordo-modal__actions { justify-content: flex-end; gap: 8px; padding: 20px 26px 24px; }
.ordo-mobile-nav { display: none; }@keyframes ordo-spin { to { transform: rotate(360deg); } }@keyframes ordo-enter { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width:1180px) { .ordo-topbar { grid-template-columns: 1fr auto; padding-right: 28px; padding-left: 28px; }.ordo-topbar__center { display: none; }.ordo-layout { gap: 26px; padding-right: 28px; padding-left: 28px; } }
@media (max-width:900px) { .ordo-layout { display: block; padding-top: 0; }.ordo-sidebar { display: none; }.ordo-mobile-nav { position: sticky; z-index: 3; top: 0; display: flex; gap: 5px; overflow-x: auto; padding: 8px 20px; border-top: 1px solid rgba(50,73,56,.08); border-bottom: 1px solid rgba(50,73,56,.1); background: rgba(231,236,228,.92); scrollbar-width: none; }.ordo-mobile-nav::-webkit-scrollbar { display: none; }.ordo-mobile-nav button { display: inline-flex; align-items: center; flex: 0 0 auto; gap: 6px; padding: 9px 11px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #7e8b80; cursor: pointer; font: inherit; font-size: 10px; font-weight: 800; white-space: nowrap; }.ordo-mobile-nav button.is-active { border-color: #d4dfd2; background: #f9fbf7; color: var(--moss-deep); }.ordo-main { padding-top: 12px; } }
@media (max-width:720px) { .ordo-topbar { padding: 17px 18px 15px; }.ordo-brand__name { font-size: 18px; }.ordo-account__copy,.ordo-logout { display: none; }.ordo-layout { padding: 0 18px 40px; }.ordo-intro { display: block; padding: 22px 0 20px; }.ordo-intro h1 { font-size: 43px; }.ordo-intro__description { font-size: 12px; }.ordo-intro__meta { display: flex; align-items: center; justify-content: flex-start; margin-top: 17px; }.ordo-filter-bar { display: block; padding: 13px; }.ordo-filter-bar__period { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 7px; }.ordo-filter-bar__label { grid-column: 1/-1; margin-bottom: 2px; }.ordo-filter-bar label { display: grid; gap: 4px; }.ordo-filter-bar label span { font-size: 9px; }.ordo-filter-bar input { width: 100%; box-sizing: border-box; }.ordo-filter-bar__actions { margin-top: 12px; }.ordo-filter-bar__actions .ordo-button--primary { flex: 1; }.ordo-metrics-grid--four,.ordo-grid-2,.ordo-queue-grid { grid-template-columns: 1fr 1fr; }.ordo-section-intro { display: block; }.ordo-section-intro .ordo-scope-label { display: block; margin-top: 10px; }.ordo-highlight-grid { grid-template-columns: 1fr 1fr; }.ordo-queue-grid { gap: 12px; }.ordo-queue-card__header,.ordo-table-card__header { padding-right: 16px; padding-left: 16px; }.ordo-queue-card__filters { padding-right: 16px; padding-left: 16px; }.ordo-queue-item { padding-right: 16px; padding-left: 16px; }.ordo-mini-bars--compact { padding-right: 16px; padding-left: 16px; }.ordo-table-wrap { padding-right: 16px; padding-left: 16px; }.ordo-modal__form { grid-template-columns: 1fr; } }
@media (max-width:500px) { .ordo-metrics-grid--four,.ordo-grid-2,.ordo-queue-grid { grid-template-columns: 1fr; }.ordo-intro h1 { font-size: 38px; }.ordo-filter-bar__period { grid-template-columns: auto 1fr; }.ordo-filter-bar__dash { display: none; }.ordo-filter-bar__period label:nth-of-type(2) { grid-column: 1/-1; }.ordo-filter-bar__actions { display: grid; grid-template-columns: auto 1fr; }.ordo-loading-note { grid-column: 1/-1; }.ordo-stat-banner { display: block; }.ordo-stat-banner span { margin-top: 4px; }.ordo-modal-backdrop { padding: 10px; }.ordo-modal { max-height: calc(100vh - 20px); border-radius: 17px; }.ordo-modal__header,.ordo-modal__facts,.ordo-modal__form { padding-right: 17px; padding-left: 17px; }.ordo-modal__description,.ordo-modal__sequence { margin-right: 17px; margin-left: 17px; }.ordo-modal__actions { padding-right: 17px; padding-left: 17px; } }
</style>
