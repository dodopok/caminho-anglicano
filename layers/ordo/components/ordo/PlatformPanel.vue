<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import OrdoTrendChart from './TrendChart.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { buildSeries } from '../../utils/series'
import { periodShortLabel, type PeriodValue } from '../../utils/period'
import type { DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period: PeriodValue
}>()

const { formatNumber, formatPercent } = useOrdoDashboardPresentation()

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

const endpoints = computed<BarListItem[]>(() => (api.value.top_endpoints || []).map(item => ({
  key: item.endpoint,
  label: item.endpoint,
  value: item.requests || 0,
  display: formatNumber(item.requests),
  color: 'var(--op-ink)'
})))

const keysByDeveloper = computed(() => (developers.value?.keys_by_developer || []).slice(0, 6).map(item => ({
  label: item.name,
  value: item.keys || 0,
  display: `${formatNumber(item.keys)} ${item.keys === 1 ? 'chave' : 'chaves'}`
})))

const nearLimit = computed(() => (api.value.near_daily_limit || []).map(item => {
  const pct = item.daily_limit ? Math.round((item.requests_today || 0) / item.daily_limit * 100) : 0
  return { ...item, pct }
}))
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <section class="op-grid" style="--op-min: 240px" aria-label="Ordo+">
      <OrdoMetricCard title="Assinam o Ordo+ agora" :value="formatNumber(premium.active_now)" scope="lifetime" :subtitle="`${formatNumber(premium.new_in_period)} começaram no período`" />
      <OrdoMetricCard
        title="Ordo+ entre quem reza"
        :value="premium.premium_share_of_active != null ? formatPercent(premium.premium_share_of_active) : '—'"
        scope="period"
        :scope-label="shortPeriod"
        :subtitle="premium.premium_share_of_active != null ? `${formatNumber(premium.premium_among_active)} de ${formatNumber(premium.active_users_in_period)} pessoas que rezaram` : 'Aparece quando a API publicar este número.'"
      />
      <OrdoMetricCard title="Vencem em 30 dias" :value="formatNumber(premium.expiring_next_30_days)" scope="lifetime" :subtitle="`${formatNumber(premium.expired)} já venceram ao todo`" />
      <OrdoMetricCard title="Renovação" :value="premium.renewal_rate_available ? formatPercent(premium.renewal_rate) : '—'" scope="period" :scope-label="shortPeriod" :subtitle="premium.renewal_rate_available ? `de quem chegou ao fim do ciclo no período` : 'Sem assinaturas que chegaram ao fim no período.'" />
    </section>

    <OrdoChartCard eyebrow="Ciclo" title="Ordo+ no período" description="Começos, renovações e fins de assinatura registrados." scope="period" :scope-label="shortPeriod">
      <dl class="op-kv" style="--op-kv-cols: 4">
        <div><dt>Começaram</dt><dd>{{ formatNumber(premium.new_in_period) }}</dd></div>
        <div><dt>Renovaram</dt><dd>{{ formatNumber(premium.renewals_in_period) }}</dd></div>
        <div><dt>Venceram</dt><dd>{{ formatNumber(premium.expired_in_period) }}</dd></div>
        <div><dt>Saída histórica</dt><dd>{{ formatPercent(premium.churn_rate) }}<small> das assinaturas</small></dd></div>
      </dl>
    </OrdoChartCard>

    <section class="op-row">
      <OrdoChartCard class="op-grow-2" eyebrow="API" title="Requisições de integrações" :description="`${formatNumber(api.requests_in_period)} requisições de chaves de API no período.`">
        <OrdoTrendChart :points="requests" unit="requisições" :height="200" aria-label="Requisições à API por dia" />
      </OrdoChartCard>
      <OrdoChartCard class="op-grow-1" eyebrow="Endereços" title="O que mais consultam" scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="endpoints" :limit="6" :thickness="6" empty-message="Nenhuma requisição no período." />
      </OrdoChartCard>
    </section>

    <section class="op-grid" style="--op-min: 320px">
      <OrdoChartCard eyebrow="Limites" title="Chaves perto do limite de hoje" description="A partir de 80% do limite diário.">
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
      <OrdoChartCard eyebrow="Desenvolvedores" title="Quem constrói com o Ordo" scope="lifetime">
        <dl class="op-kv" style="--op-kv-cols: 3">
          <div><dt>Cadastrados</dt><dd>{{ formatNumber(developers?.registered) }}</dd></div>
          <div><dt>Aprovados</dt><dd>{{ formatNumber(developers?.approved) }}</dd></div>
          <div><dt>Com chave</dt><dd>{{ formatNumber(developers?.with_api_keys) }}</dd></div>
        </dl>
        <OrdoTopList :items="keysByDeveloper" empty-message="Nenhum desenvolvedor com chave ainda." />
        <template v-if="developers?.pending_approval" #footer>
          <span style="color: var(--op-warn)">{{ formatNumber(developers.pending_approval) }} esperando aprovação no portal de desenvolvedores.</span>
        </template>
      </OrdoChartCard>
    </section>
  </div>
</template>
