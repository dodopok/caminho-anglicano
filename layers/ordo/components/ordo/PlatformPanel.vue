<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
}>()

const { asNumber, formatNumber, formatPercent, maxItemValue, formatChartLabel } = useOrdoDashboardPresentation()

const apiEndpointItems = computed(() => (props.dashboard.api?.top_endpoints || []).map(item => ({
  key: item.endpoint,
  label: item.endpoint,
  value: asNumber(item.requests)
})))
const apiDailyItems = computed(() => (props.dashboard.api?.requests_by_day || []).map(item => ({
  key: item.date,
  label: formatChartLabel(item.date),
  value: asNumber(item.requests)
})))
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Monetização & integrações</p><h2>Uma plataforma que continua respirando.</h2></div><span class="ordo-scope-label">estado atual + atividade do período</span></div>

    <div v-if="dashboard.premium" class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard title="Premium ativos agora" :value="formatNumber(dashboard.premium.active_now)" :subtitle="`${formatNumber(dashboard.premium.new_in_period)} novos no período`" color="orange" icon="◇" eyebrow="Premium" />
      <OrdoMetricCard title="Expiram em 30 dias" :value="formatNumber(dashboard.premium.expiring_next_30_days)" :subtitle="`${formatNumber(dashboard.premium.expired)} expirados na base`" color="pink" icon="⌁" eyebrow="Ciclo" />
      <OrdoMetricCard title="Churn histórico" :value="formatPercent(dashboard.premium.churn_rate)" subtitle="expirados / base premium total" color="purple" icon="↘" eyebrow="Retenção" />
      <OrdoMetricCard title="Renovação" :value="dashboard.premium.renewal_rate_available ? formatPercent(dashboard.premium.renewal_rate) : '—'" :subtitle="dashboard.premium.renewal_rate_available ? `${formatNumber(dashboard.premium.renewals_in_period)} renovações` : (dashboard.premium.renewal_rate_note || 'Ainda sem eventos suficientes')" color="green" icon="↻" eyebrow="Período" />
    </div>

    <div v-if="dashboard.premium && !dashboard.premium.renewal_rate_available" class="ordo-info-callout"><span>i</span><p><strong>Renovação ainda não é uma porcentagem confiável.</strong> A API marca explicitamente `renewal_rate` como nulo quando não existem eventos de renovação ou expiração no período.</p></div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.api" title="Tráfego da API" description="Uso agregado por endpoint; o alerta considera o limite diário configurado." icon="⌘" icon-color="blue" eyebrow="API pública"><div class="ordo-stat-banner"><strong>{{ formatNumber(dashboard.api.requests_in_period) }}</strong><span>requests no período</span></div><div class="ordo-mini-bars"><div v-for="item in apiEndpointItems.slice(0, 6)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-blue" :style="{ width: `${(item.value / maxItemValue(apiEndpointItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.developers" title="Ecossistema de desenvolvedores" description="Chaves ativas, aprovadas e pendências de acesso." icon="⌘" icon-color="purple" eyebrow="Developers"><div class="ordo-highlight-grid"><div><span>Registrados</span><strong>{{ formatNumber(dashboard.developers.registered) }}</strong></div><div><span>Aprovados</span><strong>{{ formatNumber(dashboard.developers.approved) }}</strong></div><div><span>Com chaves</span><strong>{{ formatNumber(dashboard.developers.with_api_keys) }}</strong></div><div><span>Chaves totais</span><strong>{{ formatNumber(dashboard.developers.api_keys?.total) }}</strong></div></div><OrdoTopList :items="(dashboard.developers.keys_by_developer || []).map(item => ({ label: item.name, value: asNumber(item.keys) }))" :max="5" empty-message="Nenhum desenvolvedor com chave." /></OrdoChartCard>
    </div>

    <div v-if="dashboard.api" class="ordo-grid-2">
      <OrdoChartCard title="Requests por dia" description="Série esparsa de logs de uso." icon="↗" icon-color="green" eyebrow="Atividade"><div class="ordo-mini-bars"><div v-for="item in apiDailyItems.slice(-8)" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b :style="{ width: `${(item.value / maxItemValue(apiDailyItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
      <OrdoChartCard title="Chaves perto do limite" description="A API considera a partir de 80% do limite diário." icon="!" icon-color="orange" eyebrow="Atenção"><div v-if="dashboard.api.near_daily_limit?.length" class="ordo-alert-list"><div v-for="key in dashboard.api.near_daily_limit" :key="key.id"><span><strong>{{ key.name }}</strong><small>{{ formatNumber(key.requests_today) }} / {{ formatNumber(key.daily_limit) }} requests</small></span><b>{{ key.daily_limit ? formatPercent((asNumber(key.requests_today) / key.daily_limit) * 100) : '—' }}</b></div></div><div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">✓</span><span>Nenhuma chave perto do limite hoje.</span></div></OrdoChartCard>
    </div>
  </section>
</template>
