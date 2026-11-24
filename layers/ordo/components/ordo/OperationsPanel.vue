<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoIcon from './Icon.vue'
import OrdoReviewWorkbench from './ReviewWorkbench.vue'
import OrdoSparkline from './Sparkline.vue'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { useDashboardContext } from '../../composables/useDashboardContext'
import { usePortalQuery } from '../../composables/usePortalQuery'
import { useRosaryModeration, type ModerationOrder, type ModerationStatus } from '../../composables/useRosaryModeration'
import {
  isSessionError,
  type DashboardData,
  type LifeRule,
  type LifeRulePagination,
  type LifeRuleStatus
} from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  loading?: boolean
  periodLabel?: string
}>()

const { formatNumber, formatPercent, formatDuration, formatDate, humanizeKey } = useOrdoDashboardPresentation()
const { fetchLifeRules } = useOrdoApi()
const { isPending } = useDashboardContext()

// Everything that says where the operator is lives in the URL, so a reload
// reopens the same queue, filters and rosary:
//   ?aba=operacao&situacao=aprovados&ordem=novos&busca=salmo&pagina=2&rosario=42
//   ?aba=operacao&vista=regras&situacao=todas&busca=jejum
const query = usePortalQuery()
const slugOf = <T extends string>(map: Record<T, string>, value: T) => map[value]
const valueOf = <T extends string>(map: Record<T, string>, slug: string | undefined, fallback: T) =>
  (Object.entries(map).find(([, item]) => item === slug)?.[0] as T | undefined) || fallback
const pageOf = (raw?: string) => Math.max(1, Number.parseInt(raw || '1', 10) || 1)

const ROSARY_STATUS: Record<ModerationStatus, string> = { pending_review: 'em-revisao', approved: 'aprovados', rejected: 'rejeitados' }
const ROSARY_ORDER: Record<ModerationOrder, string> = { oldest: 'antigos', newest: 'novos', title: 'titulo' }
const RULE_STATUS: Record<LifeRuleStatus, string> = { pending: 'novas', approved: 'aprovadas', all: 'todas' }
const VIEW_KEYS = ['situacao', 'ordem', 'busca', 'pagina', 'rosario']

type View = 'rosaries' | 'rules'
const view = computed<View>({
  get: () => query.values.value.vista === 'regras' ? 'rules' : 'rosaries',
  set: value => {
    if (value === view.value) return
    query.set({ ...Object.fromEntries(VIEW_KEYS.map(key => [key, null])), vista: value === 'rules' ? 'regras' : null }, { push: true })
    if (value === 'rosaries') writeRosaryQuery()
    else {
      ruleStatus.value = 'pending'
      ruleSearch.value = ''
      ruleOffset.value = 0
      loadRules()
    }
  }
})

const initial = query.values.value
const onRosaries = initial.vista !== 'regras'
const moderation = useRosaryModeration(onRosaries
  ? {
      status: valueOf(ROSARY_STATUS, initial.situacao, 'pending_review'),
      order: valueOf(ROSARY_ORDER, initial.ordem, 'oldest'),
      search: initial.busca || '',
      page: pageOf(initial.pagina),
      selectedId: initial.rosario || null
    }
  : {})

function writeRosaryQuery () {
  const { status, order, search, page, selectedId } = moderation
  query.set({
    situacao: status.value === 'pending_review' ? null : slugOf(ROSARY_STATUS, status.value),
    ordem: order.value === 'oldest' ? null : slugOf(ROSARY_ORDER, order.value),
    busca: search.value.trim() || null,
    pagina: page.value > 1 ? page.value : null,
    rosario: selectedId.value
  })
}

watch(
  () => [moderation.status.value, moderation.order.value, moderation.search.value, moderation.page.value, moderation.selectedId.value],
  () => {
    if (view.value === 'rosaries') writeRosaryQuery()
  }
)

const rosaryStats = computed(() => props.dashboard.moderation?.custom_rosaries)
const lifeRuleStats = computed(() => props.dashboard.moderation?.life_rules)
const notifications = computed(() => props.dashboard.notifications)
const health = computed(() => props.dashboard.health)

const pending = computed(() => rosaryStats.value?.pending_now ?? moderation.total.value)

const summary = computed(() => {
  const parts: string[] = []
  const stats = rosaryStats.value
  if (stats?.pending_now != null) parts.push(`${formatNumber(stats.pending_now)} ${stats.pending_now === 1 ? 'rosário' : 'rosários'} em revisão`)
  if (stats?.oldest_pending_age_seconds) parts.push(`o mais antigo espera há ${formatDuration(stats.oldest_pending_age_seconds)}`)
  if (lifeRuleStats.value?.pending_now) parts.push(`${formatNumber(lifeRuleStats.value.pending_now)} ${lifeRuleStats.value.pending_now === 1 ? 'regra de vida nova' : 'regras de vida novas'}`)
  return parts.join(' · ')
})

const pace = computed(() => {
  const days = rosaryStats.value?.reviewed_per_day || []
  return days.map(day => (day.approved || 0) + (day.rejected || 0))
})

// Life rules are read only: the API lists them but has no approval action.
const rules = ref<LifeRule[]>([])
const rulesPagination = ref<LifeRulePagination | null>(null)
const rulesLoading = ref(false)
const rulesError = ref<string | null>(null)
const RULE_LIMIT = 8
const ruleStatus = ref<LifeRuleStatus>(onRosaries ? 'pending' : valueOf(RULE_STATUS, initial.situacao, 'pending'))
const ruleSearch = ref(onRosaries ? '' : initial.busca || '')
const ruleOffset = ref(onRosaries ? 0 : (pageOf(initial.pagina) - 1) * RULE_LIMIT)
const ruleTotalPages = computed(() => Math.max(1, Math.ceil((rulesPagination.value?.total || 0) / RULE_LIMIT)))
const rulePage = computed(() => Math.floor(ruleOffset.value / RULE_LIMIT) + 1)

const loadRules = async () => {
  if (view.value === 'rules') {
    query.set({
      situacao: ruleStatus.value === 'pending' ? null : slugOf(RULE_STATUS, ruleStatus.value),
      busca: ruleSearch.value.trim() || null,
      pagina: ruleOffset.value ? Math.floor(ruleOffset.value / RULE_LIMIT) + 1 : null
    })
  }
  rulesLoading.value = true
  rulesError.value = null
  try {
    const response = await fetchLifeRules({ status: ruleStatus.value, search: ruleSearch.value, limit: RULE_LIMIT, offset: ruleOffset.value })
    rules.value = response.life_rules || []
    rulesPagination.value = response.pagination
  } catch (error) {
    if (!isSessionError(error)) rulesError.value = error instanceof Error ? error.message : 'Não foi possível carregar as regras.'
  } finally {
    rulesLoading.value = false
  }
}
const searchRules = () => {
  ruleOffset.value = 0
  loadRules()
}
const changeRulePage = (direction: number) => {
  const next = ruleOffset.value + direction * RULE_LIMIT
  if (next < 0 || next >= ruleTotalPages.value * RULE_LIMIT) return
  ruleOffset.value = next
  loadRules()
}

const delivery = computed<BarListItem[]>(() => {
  const map = notifications.value?.delivery_status_counts || {}
  const tone: Record<string, string> = { sent: 'var(--op-action)', failed: 'var(--op-s2)', invalid: 'var(--op-s5)' }
  const label: Record<string, string> = { sent: 'Entregues', failed: 'Falharam', invalid: 'Aparelho não recebe mais' }
  return Object.entries(map)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([key, value]) => ({ key, label: label[key] || humanizeKey(key), value: value || 0, display: formatNumber(value), color: tone[key] || 'var(--op-ink-faint)' }))
})

const conversions = computed<BarListItem[]>(() => (notifications.value?.conversion_by_type || [])
  .filter(item => item.sent)
  .map(item => ({
    key: item.notification_type,
    label: humanizeKey(item.notification_type),
    value: item.rate || 0,
    display: formatPercent(item.rate),
    share: `${formatNumber(item.followed_by_prayer)} de ${formatNumber(item.sent)}`,
    color: 'var(--op-s3)'
  })))

const lifeRuleData = computed(() => props.dashboard.life_rules)
const topRules = computed<BarListItem[]>(() => (lifeRuleData.value?.top_adopted || []).slice(0, 3).map(rule => ({
  key: String(rule.id ?? rule.title),
  label: rule.title,
  value: rule.adoptions || 0,
  display: `${formatNumber(rule.adoptions)} ${rule.adoptions === 1 ? 'adoção' : 'adoções'}`,
  color: 'var(--op-s4)'
})))

const healthRows = computed(() => {
  const data = health.value
  if (!data) return []
  return [
    { key: 'notifications', label: 'Lembretes que falharam nas últimas 24 h', value: data.notifications?.failures_last_24_hours || 0 },
    { key: 'keys', label: 'Chaves de API vencendo em 30 dias', value: data.api_keys?.expiring_next_30_days || 0 },
    { key: 'stale', label: 'Sessões de áudio paradas', value: data.audio_sessions?.stale_running || 0, hint: `${formatNumber(data.audio_sessions?.running)} rodando agora` },
    { key: 'failed', label: 'Sessões de áudio com erro', value: data.audio_sessions?.failed || 0, hint: 'desde o início' }
  ]
})

onMounted(() => {
  moderation.load()
  moderation.loadCategories()
  loadRules()
})
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 22px">
    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px">
      <div class="op-seg" role="tablist" aria-label="Filas">
        <button type="button" role="tab" :class="{ 'is-on': view === 'rosaries' }" :aria-selected="view === 'rosaries'" @click="view = 'rosaries'">
          Rosários <span v-if="pending" class="op-count" style="margin-left: 6px">{{ formatNumber(pending) }}</span>
        </button>
        <button type="button" role="tab" :class="{ 'is-on': view === 'rules' }" :aria-selected="view === 'rules'" @click="view = 'rules'">
          Regras de vida <span v-if="lifeRuleStats?.pending_now" class="op-count op-count--quiet" style="margin-left: 6px">{{ formatNumber(lifeRuleStats?.pending_now) }}</span>
        </button>
      </div>
      <p v-if="summary" class="op-muted ops-summary" style="margin: 0; font-size: 13.5px">{{ summary }}</p>
    </div>

    <template v-if="view === 'rosaries'">
      <section class="op-band" aria-label="Ritmo de revisão" style="display: flex; flex-wrap: wrap; align-items: center; gap: 14px 28px; padding: 14px 20px">
        <div style="display: flex; flex-direction: column; gap: 2px">
          <span class="op-eyebrow">Nesta sessão</span>
          <span style="font-size: 15px"><strong>{{ moderation.session.approved }}</strong> aprovados · <strong>{{ moderation.session.rejected }}</strong> rejeitados</span>
        </div>
        <div v-if="rosaryStats?.average_reviews_per_day != null" style="display: flex; flex-direction: column; gap: 2px">
          <span class="op-eyebrow">Ritmo do período</span>
          <span style="font-size: 15px"><strong>{{ formatNumber(rosaryStats.average_reviews_per_day) }}</strong> por dia{{ rosaryStats.estimated_days_to_clear ? ` · a fila zera em ~${rosaryStats.estimated_days_to_clear} ${rosaryStats.estimated_days_to_clear === 1 ? 'dia' : 'dias'}` : '' }}</span>
        </div>
        <div v-if="pace.length > 1" style="flex: 1 1 200px; min-width: 160px" aria-hidden="true">
          <OrdoSparkline :values="pace" color="var(--op-ok)" :height="28" />
        </div>
      </section>
      <OrdoReviewWorkbench :moderation="moderation" />
    </template>

    <section v-else aria-label="Regras de vida" style="display: flex; flex-direction: column; gap: 14px">
      <div class="op-inline-note">
        <OrdoIcon name="info" :size="18" style="flex: 0 0 auto; margin-top: 1px; color: var(--op-action)" />
        <span>Fila só de leitura. A API ainda não tem ação para aprovar regras de vida, então aqui você acompanha o que chegou, sem decidir.</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center">
        <div class="op-seg op-seg--small" role="group" aria-label="Situação das regras">
          <button v-for="option in [{ v: 'pending', l: 'Novas' }, { v: 'approved', l: 'Aprovadas' }, { v: 'all', l: 'Todas' }]" :key="option.v" type="button" :class="{ 'is-on': ruleStatus === option.v }" :aria-pressed="ruleStatus === option.v" @click="ruleStatus = option.v as LifeRuleStatus; searchRules()">{{ option.l }}</button>
        </div>
        <label class="op-search" style="flex: 1 1 240px">
          <span class="op-sr-only">Buscar regra</span>
          <OrdoIcon name="search" :size="18" />
          <input v-model="ruleSearch" class="op-field" type="search" placeholder="Buscar título" @keydown.enter="searchRules">
        </label>
      </div>
      <p v-if="rulesError" class="op-inline-error">{{ rulesError }}</p>
      <div v-if="rulesLoading" class="op-grid" style="--op-min: 320px"><span v-for="n in 4" :key="n" class="op-skeleton" style="height: 130px" /></div>
      <div v-else-if="rules.length" class="op-grid" style="--op-min: 320px">
        <article v-for="rule in rules" :key="rule.id" class="op-card op-card--quiet" style="display: flex; flex-direction: column; gap: 10px; padding: 18px 20px">
          <div style="display: flex; justify-content: space-between; gap: 8px; align-items: baseline">
            <h3 class="op-display" style="margin: 0; font-size: 19px; font-weight: 600">{{ rule.title }}</h3>
            <span class="op-pill" :class="rule.approved ? 'op-pill--ok' : 'op-pill--gold'">{{ rule.approved ? 'Aprovada' : 'Nova' }}</span>
          </div>
          <p class="op-muted" style="margin: 0; font-size: 14px; line-height: 1.5">{{ rule.description || 'Sem descrição.' }}</p>
          <span class="op-faint" style="font-size: 12.5px">{{ rule.owner?.name || 'Autor sem nome' }} · {{ formatDate(rule.created_at) }} · {{ formatNumber(rule.adoption_count) }} {{ rule.adoption_count === 1 ? 'adoção' : 'adoções' }}</span>
          <details v-if="rule.steps?.length">
            <summary class="op-link" style="cursor: pointer">{{ rule.steps.length }} {{ rule.steps.length === 1 ? 'etapa' : 'etapas' }}</summary>
            <ol style="margin: 8px 0 0; padding-left: 20px; font-size: 13.5px; line-height: 1.6">
              <li v-for="step in rule.steps" :key="step.id">{{ step.title }}<span v-if="step.description" class="op-muted"> — {{ step.description }}</span></li>
            </ol>
          </details>
        </article>
      </div>
      <p v-else class="op-empty">Nenhuma regra nesta lista.</p>
      <div v-if="ruleTotalPages > 1" style="display: flex; align-items: center; justify-content: center; gap: 12px">
        <button type="button" class="op-icon-btn" aria-label="Página anterior" :disabled="rulePage <= 1 || rulesLoading" @click="changeRulePage(-1)"><OrdoIcon name="chevron-left" :size="16" /></button>
        <span class="op-faint" style="font-size: 13px">Página {{ rulePage }} de {{ ruleTotalPages }}</span>
        <button type="button" class="op-icon-btn" aria-label="Próxima página" :disabled="rulePage >= ruleTotalPages || rulesLoading" @click="changeRulePage(1)"><OrdoIcon name="chevron-right" :size="16" /></button>
      </div>
    </section>

    <section class="op-section" aria-labelledby="signals-title" style="margin-top: 6px">
      <div class="op-section__head">
        <h2 id="signals-title">Sinais da plataforma</h2>
        <p>Contados no período escolhido nas abas de leitura ({{ periodLabel || '30 dias' }}).</p>
      </div>
      <div class="op-grid" style="--op-min: 240px">
        <OrdoChartCard :loading="isPending('moderation')" :skeleton-height="150" eyebrow="Revisões" title="Como as decisões andam" scope="period">
          <dl class="op-kv">
            <div><dt>Aprovados</dt><dd>{{ formatNumber(rosaryStats?.approved_in_period) }}</dd></div>
            <div><dt>Rejeitados</dt><dd>{{ formatNumber(rosaryStats?.rejected_in_period) }}</dd></div>
            <div><dt>Reenviados após rejeição</dt><dd>{{ formatNumber(rosaryStats?.reentries_in_period) }}</dd></div>
            <div><dt>Tempo até a decisão</dt><dd>{{ rosaryStats?.average_response_time_seconds ? formatDuration(rosaryStats.average_response_time_seconds) : '—' }}</dd></div>
          </dl>
          <template #footer>
            <span><strong style="color: var(--op-ok)">{{ formatPercent(rosaryStats?.approval_rate) }}</strong> aprovados entre os decididos.</span>
            <span v-if="rosaryStats?.approved_without_strapi" style="color: var(--op-warn)">{{ formatNumber(rosaryStats.approved_without_strapi) }} aprovados ainda sem publicação no CMS.</span>
          </template>
        </OrdoChartCard>

        <OrdoChartCard :loading="isPending('notifications')" :skeleton-height="150" eyebrow="Lembretes" title="Entrega e efeito" scope="period">
          <div v-if="notifications?.success_rate != null" style="display: flex; align-items: baseline; gap: 10px">
            <span class="op-metric__value" style="font-size: 32px">{{ formatPercent(notifications.success_rate) }}</span>
            <span class="op-faint" style="font-size: 13px">entregues de {{ formatNumber(notifications.total_in_period) }} enviados</span>
          </div>
          <OrdoBarList :items="delivery" :thickness="6" empty-message="Nenhum lembrete enviado no período." />
          <template v-if="conversions.length">
            <span class="op-eyebrow" style="margin-top: 4px">Viram oração em até 2 h</span>
            <OrdoBarList :items="conversions" :max="100" :thickness="6" />
          </template>
        </OrdoChartCard>

        <OrdoChartCard v-if="lifeRuleData || isPending('life_rules')" :loading="isPending('life_rules')" :skeleton-height="150" eyebrow="Regras de vida" title="Adoção e exames">
          <dl class="op-kv">
            <div><dt>Regras públicas</dt><dd>{{ formatNumber(lifeRuleData.public_rules) }}</dd></div>
            <div><dt>Adoções, ao todo</dt><dd>{{ formatNumber(lifeRuleData.total_adoptions) }}</dd></div>
            <div><dt>Exames no período</dt><dd>{{ formatNumber(lifeRuleData.exams?.completed_in_period) }}<small> de {{ formatNumber(lifeRuleData.exams?.users_with_completed_exams) }} pessoas</small></dd></div>
            <div><dt>Nota média</dt><dd>{{ lifeRuleData.exams?.average_score != null ? lifeRuleData.exams.average_score.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—' }}</dd></div>
          </dl>
          <template v-if="topRules.length">
            <span class="op-eyebrow">Mais adotadas</span>
            <OrdoBarList :items="topRules" :thickness="6" />
          </template>
        </OrdoChartCard>

        <OrdoChartCard :loading="isPending('health')" :skeleton-height="150" eyebrow="Saúde" title="O que pode estar quebrado">
          <ul style="display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none">
            <li v-for="row in healthRows" :key="row.key" style="display: flex; align-items: center; gap: 10px; font-size: 14px">
              <span class="op-attn__icon" :class="row.value ? 'op-tone-warn' : 'op-tone-ok'" style="width: 24px; height: 24px; border-radius: 999px" aria-hidden="true">
                <OrdoIcon :name="row.value ? 'alert' : 'check'" :size="13" :stroke-width="2.6" />
              </span>
              <span style="flex: 1; display: flex; flex-direction: column"><span>{{ row.label }}</span><small v-if="row.hint" class="op-faint" style="font-size: 12px">{{ row.hint }}</small></span>
              <strong :style="{ color: row.value ? 'var(--op-warn)' : 'var(--op-ink)' }">{{ formatNumber(row.value) }}</strong>
            </li>
          </ul>
          <p v-if="!healthRows.length" class="op-empty">Carregando…</p>
        </OrdoChartCard>
      </div>
    </section>
  </div>
</template>
