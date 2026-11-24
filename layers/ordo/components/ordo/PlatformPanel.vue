<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoDeveloperDetail from './DeveloperDetail.vue'
import OrdoIcon from './Icon.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTrendChart from './TrendChart.vue'
import { useDashboardContext } from '../../composables/useDashboardContext'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { useQueryParam } from '../../composables/usePortalQuery'
import { comparePeriods } from '../../utils/compare'
import { endpointLabel } from '../../utils/endpoints'
import { buildSeries } from '../../utils/series'
import { periodShortLabel, type PeriodValue } from '../../utils/period'
import type { DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period: PeriodValue
}>()

const { formatNumber, formatPercent, formatRelative } = useOrdoDashboardPresentation()
const { isPending, previous, previousLabel, isPreviousPending } = useDashboardContext()

const premium = computed(() => props.dashboard.premium || {})
const api = computed(() => props.dashboard.api || {})
const developers = computed(() => props.dashboard.developers)
const shortPeriod = computed(() => periodShortLabel(props.period))

const requests = computed(() => buildSeries(
  (api.value.requests_by_day || []).map(item => ({ date: item.date, value: item.requests || 0 })),
  props.period.start,
  props.period.end,
  { monthly: props.period.preset === 'all' || props.period.preset === '12m' }
))

const deltas = computed(() => ({
  premiumShare: comparePeriods(premium.value.premium_share_of_active, previous.value?.premium?.premium_share_of_active, { kind: 'rate' }),
  renewal: premium.value.renewal_rate_available && previous.value?.premium?.renewal_rate_available
    ? comparePeriods(premium.value.renewal_rate, previous.value?.premium?.renewal_rate, { kind: 'rate' })
    : null,
  requests: comparePeriods(api.value.requests_in_period, previous.value?.api?.requests_in_period)
}))

const endpoints = computed<BarListItem[]>(() => (api.value.top_endpoints || []).map(item => ({
  key: item.endpoint,
  label: endpointLabel(item.endpoint),
  hint: endpointLabel(item.endpoint) === item.endpoint ? undefined : item.endpoint,
  value: item.requests || 0,
  display: formatNumber(item.requests),
  color: 'var(--op-ink)'
})))

// Every developer with a key, busiest first, each one opening its own detail
// (`?aba=negocio&dev=12`, so a reload keeps it open). Before the API shipped
// the period numbers, the list falls back to the key count it always had.
const developerId = useQueryParam<string>('dev', '')
interface DeveloperRow {
  id: number | string
  name: string
  company: string
  keys: number
  activeKeys: number | null
  requests: number | null
  activeDays: number | null
  lastUsedAt: string | null
  delta: ReturnType<typeof comparePeriods>
}
const developerRows = computed<DeveloperRow[]>(() => {
  const usage = developers.value?.usage_by_developer?.developers
  if (usage) {
    return usage.map(row => ({
      id: row.id,
      name: row.name || `Desenvolvedor #${row.id}`,
      company: row.company_name || '',
      keys: row.keys || 0,
      activeKeys: row.active_keys ?? null,
      requests: row.requests_in_period ?? 0,
      activeDays: row.active_days_in_period ?? 0,
      lastUsedAt: row.last_used_at || null,
      delta: comparePeriods(row.requests_in_period, row.previous_period_requests)
    }))
  }
  return (developers.value?.keys_by_developer || []).filter(item => item.keys).map(item => ({
    id: item.id,
    name: item.name || `Desenvolvedor #${item.id}`,
    company: '',
    keys: item.keys || 0,
    activeKeys: null,
    requests: null,
    activeDays: null,
    lastUsedAt: null,
    delta: null
  }))
})
const hasUsage = computed(() => Boolean(developers.value?.usage_by_developer?.developers))
const maxRequests = computed(() => Math.max(1, ...developerRows.value.map(row => row.requests || 0)))
const periodDays = computed(() => {
  const start = new Date(`${props.period.start}T12:00:00`)
  const end = new Date(`${props.period.end}T12:00:00`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
})
const openedName = computed(() => developerRows.value.find(row => String(row.id) === developerId.value)?.name || null)
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('pt-BR')).join('')
const activityOf = (row: DeveloperRow) => {
  if (!row.lastUsedAt) return row.requests === null ? null : { text: 'Nunca usou', tone: 'op-pill--quiet' }
  const days = (Date.now() - new Date(row.lastUsedAt).getTime()) / 86_400_000
  if (days < 7) return { text: `Ativo · ${formatRelative(row.lastUsedAt)}`, tone: 'op-pill--ok' }
  if (days < 30) return { text: formatRelative(row.lastUsedAt), tone: 'op-pill--info' }
  return { text: `Parado · ${formatRelative(row.lastUsedAt)}`, tone: 'op-pill--warn' }
}

const nearLimit = computed(() => (api.value.near_daily_limit || []).map(item => {
  const pct = item.daily_limit ? Math.round((item.requests_today || 0) / item.daily_limit * 100) : 0
  return { ...item, pct }
}))
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <section class="op-grid" style="--op-min: 240px" aria-label="Ordo+">
      <OrdoMetricCard :loading="isPending('premium')" title="Assinam o Ordo+ agora" :value="formatNumber(premium.active_now)" scope="lifetime" :subtitle="`${formatNumber(premium.new_in_period)} começaram no período`" />
      <OrdoMetricCard
        :loading="isPending('premium')"
        :delta="deltas.premiumShare"
        :delta-label="previousLabel"
        :delta-loading="isPreviousPending('premium')"
        title="Ordo+ entre quem reza"
        :value="premium.premium_share_of_active != null ? formatPercent(premium.premium_share_of_active) : '—'"
        scope="period"
        :scope-label="shortPeriod"
        :subtitle="premium.premium_share_of_active != null ? `${formatNumber(premium.premium_among_active)} de ${formatNumber(premium.active_users_in_period)} pessoas que rezaram` : 'Aparece quando a API publicar este número.'"
      />
      <OrdoMetricCard :loading="isPending('premium')" title="Vencem em 30 dias" :value="formatNumber(premium.expiring_next_30_days)" scope="lifetime" :subtitle="`${formatNumber(premium.expired)} já venceram ao todo`" />
      <OrdoMetricCard :loading="isPending('premium')" :delta="deltas.renewal" :delta-label="previousLabel" title="Renovação" :value="premium.renewal_rate_available ? formatPercent(premium.renewal_rate) : '—'" scope="period" :scope-label="shortPeriod" :subtitle="premium.renewal_rate_available ? `de quem chegou ao fim do ciclo no período` : 'Sem assinaturas que chegaram ao fim no período.'" />
    </section>

    <OrdoChartCard :loading="isPending('premium')" :skeleton-height="70" eyebrow="Ciclo" title="Ordo+ no período" description="Começos, renovações e fins de assinatura registrados." scope="period" :scope-label="shortPeriod">
      <dl class="op-kv" style="--op-kv-cols: 4">
        <div><dt>Começaram</dt><dd>{{ formatNumber(premium.new_in_period) }}</dd></div>
        <div><dt>Renovaram</dt><dd>{{ formatNumber(premium.renewals_in_period) }}</dd></div>
        <div><dt>Venceram</dt><dd>{{ formatNumber(premium.expired_in_period) }}</dd></div>
        <div><dt>Saída histórica</dt><dd>{{ formatPercent(premium.churn_rate) }}<small> das assinaturas</small></dd></div>
      </dl>
    </OrdoChartCard>

    <section class="op-row">
      <OrdoChartCard :loading="isPending('api')" :skeleton-height="200" class="op-grow-2" eyebrow="API" title="Requisições de integrações" :description="`${formatNumber(api.requests_in_period)} requisições de chaves de API no período.`">
        <template v-if="deltas.requests" #actions>
          <OrdoDeltaChip :delta="deltas.requests" :label="previousLabel" />
        </template>
        <OrdoTrendChart :points="requests" unit="requisições" :height="200" aria-label="Requisições à API por dia" />
      </OrdoChartCard>
      <OrdoChartCard :loading="isPending('api')" class="op-grow-1" eyebrow="Endereços" title="O que mais consultam" scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="endpoints" :limit="6" :thickness="6" empty-message="Nenhuma requisição no período." />
      </OrdoChartCard>
    </section>

    <section class="op-grid" style="--op-min: 320px">
      <OrdoChartCard :loading="isPending('api')" eyebrow="Limites" title="Chaves perto do limite de hoje" description="A partir de 80% do limite diário.">
        <ul v-if="nearLimit.length" class="op-barlist">
          <li v-for="item in nearLimit" :key="item.id" class="op-barlist__row">
            <div class="op-barlist__body">
              <div class="op-barlist__line">
                <span class="op-barlist__label">{{ item.name }}</span>
                <span class="op-barlist__value"><strong>{{ formatNumber(item.requests_today) }}</strong> de {{ formatNumber(item.daily_limit) }}</span>
              </div>
              <div class="op-track" aria-hidden="true"><span :style="{ width: `${Math.min(item.pct, 100)}%`, background: item.pct >= 95 ? 'var(--op-danger)' : 'var(--op-s2)' }" /></div>
            </div>
          </li>
        </ul>
        <p v-else class="op-empty" style="color: var(--op-ok)">Nenhuma chave perto do limite hoje.</p>
        <template #footer>
          <span>Chaves: {{ formatNumber(api.keys?.active) }} ativas · {{ formatNumber(api.keys?.inactive) }} desligadas · {{ formatNumber(api.keys?.expired) }} vencidas</span>
        </template>
      </OrdoChartCard>
      <OrdoChartCard :loading="isPending('developers')" eyebrow="Desenvolvedores" title="Quem constrói com o Ordo" scope="lifetime">
        <dl class="op-kv" style="--op-kv-cols: 3">
          <div><dt>Cadastrados</dt><dd>{{ formatNumber(developers?.registered) }}</dd></div>
          <div><dt>Aprovados</dt><dd>{{ formatNumber(developers?.approved) }}</dd></div>
          <div><dt>Com chave</dt><dd>{{ formatNumber(developers?.with_api_keys) }}</dd></div>
        </dl>
        <template v-if="developers?.pending_approval" #footer>
          <span style="color: var(--op-warn)">{{ formatNumber(developers.pending_approval) }} esperando aprovação no portal de desenvolvedores.</span>
        </template>
      </OrdoChartCard>
    </section>

    <OrdoChartCard :loading="isPending('developers')" :skeleton-height="260" eyebrow="Uso por desenvolvedor" title="Quem usa a API" :description="hasUsage ? 'Do mais ativo ao mais parado. Clique para ver as chaves, os endereços e os dias de uso.' : 'Clique num desenvolvedor para ver as chaves, os endereços e os dias de uso.'" :scope="hasUsage ? 'period' : 'lifetime'" :scope-label="hasUsage ? shortPeriod : undefined">
      <ul v-if="developerRows.length" class="dev-list">
        <li v-for="row in developerRows" :key="row.id">
          <button type="button" class="dev-row" :aria-label="`Ver o uso de ${row.name}`" @click="developerId = String(row.id)">
            <span class="op-initials" aria-hidden="true">{{ initialsOf(row.name) }}</span>
            <span class="dev-row__who">
              <strong>{{ row.name }}</strong>
              <small>{{ [row.company, `${formatNumber(row.keys)} ${row.keys === 1 ? 'chave' : 'chaves'}${row.activeKeys != null && row.activeKeys !== row.keys ? ` · ${formatNumber(row.activeKeys)} ${row.activeKeys === 1 ? 'ativa' : 'ativas'}` : ''}`].filter(Boolean).join(' · ') }}</small>
            </span>
            <span v-if="activityOf(row)" class="dev-row__activity"><span class="op-pill" :class="activityOf(row)!.tone">{{ activityOf(row)!.text }}</span></span>
            <span v-if="row.activeDays !== null" class="dev-row__days" :title="`${row.activeDays} de ${periodDays} dias com alguma requisição`">
              <small>{{ formatNumber(row.activeDays) }} de {{ formatNumber(periodDays) }} dias</small>
              <span class="op-track" style="height: 5px" aria-hidden="true"><span :style="{ width: `${Math.min(100, row.activeDays / periodDays * 100)}%`, background: 'var(--op-s3)' }" /></span>
            </span>
            <span v-if="row.requests !== null" class="dev-row__requests">
              <span class="dev-row__count"><strong>{{ formatNumber(row.requests) }}</strong> <small>requisições</small></span>
              <span class="op-track" style="height: 5px" aria-hidden="true"><span :style="{ width: `${(row.requests || 0) / maxRequests * 100}%`, background: 'var(--op-s1)' }" /></span>
              <OrdoDeltaChip v-if="row.delta" :delta="row.delta" />
            </span>
            <OrdoIcon name="chevron-right" :size="18" class="dev-row__go" />
          </button>
        </li>
      </ul>
      <p v-else class="op-empty">Nenhum desenvolvedor com chave ainda.</p>
    </OrdoChartCard>

    <OrdoDeveloperDetail v-if="developerId" :developer-id="developerId" :period="period" :name="openedName" @close="developerId = ''" />
  </div>
</template>

<style scoped>
.dev-list { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.dev-list li + li { border-top: 1px solid var(--op-hair-soft); }
.dev-row { display: grid; grid-template-columns: auto minmax(160px, 1.4fr) minmax(120px, .9fr) minmax(110px, .8fr) minmax(170px, 1.1fr) auto; align-items: center; gap: 14px; width: 100%; padding: 12px 8px; border: 0; border-radius: 12px; background: transparent; color: var(--op-ink); cursor: pointer; text-align: left; transition: background .15s; }
.dev-row:hover { background: var(--op-paper); }
.dev-row:focus-visible { outline: 2px solid var(--op-action); outline-offset: -2px; }
.dev-row__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dev-row__who strong { overflow: hidden; font-size: 14.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.dev-row__who small { overflow: hidden; color: var(--op-ink-faint); font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
.dev-row__activity { min-width: 0; }
.dev-row__activity .op-pill { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.dev-row__days, .dev-row__requests { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.dev-row__days small { color: var(--op-ink-soft); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.dev-row__count strong { font-size: 15px; font-variant-numeric: tabular-nums; }
.dev-row__count small { color: var(--op-ink-faint); font-size: 12px; }
.dev-row__requests :deep(.op-metric__delta) { margin-top: 1px; }
.dev-row__go { color: var(--op-ink-faint); }
.dev-row:hover .dev-row__go { color: var(--op-action); }
@media (max-width: 960px) {
  .dev-row { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: 'avatar who go' 'avatar activity go' 'avatar days go' 'avatar requests go'; row-gap: 8px; }
  .dev-row > .op-initials { grid-area: avatar; align-self: start; }
  .dev-row__who { grid-area: who; }
  .dev-row__activity { grid-area: activity; }
  .dev-row__days { grid-area: days; }
  .dev-row__requests { grid-area: requests; }
  .dev-row__go { grid-area: go; }
}
</style>
