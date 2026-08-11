<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoLineChart from './LineChart.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { DashboardData, DashboardPeriod } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period?: DashboardPeriod | null
}>()

const {
  asNumber,
  formatNumber,
  formatDecimal,
  formatPercent,
  formatDate,
  formatChartLabel,
  scopeLabel
} = useOrdoDashboardPresentation()

const activityTrend = computed(() => props.dashboard.engagement?.daily_active_trend || [])
const activityLabels = computed(() => activityTrend.value.map(item => formatChartLabel(item.date)))
const activityData = computed(() => activityTrend.value.map(item => asNumber(item.active_users)))

const topStreakers = computed(() => (props.dashboard.users?.top_streakers || []).map(item => ({
  label: item.name || `Usuário ${item.id}`,
  value: asNumber(item.longest_streak),
  subtitle: `Sequência atual: ${formatNumber(item.current_streak)} dias`
})))
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro">
      <div>
        <p class="ordo-kicker">Pulso da comunidade</p>
        <h2>Os números que pedem atenção primeiro.</h2>
      </div>
      <span v-if="dashboard.overview" class="ordo-scope-label">visão {{ scopeLabel(dashboard.overview.scope) }}</span>
    </div>

    <div v-if="dashboard.overview" class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard title="Pessoas na base" :value="formatNumber(dashboard.overview.total_users)" :subtitle="`${formatNumber(dashboard.overview.free_users)} gratuitas · ${formatNumber(dashboard.overview.premium_users)} premium`" color="blue" icon="◎" eyebrow="Alcance" />
      <OrdoMetricCard title="Conversão premium" :value="formatPercent(dashboard.overview.premium_conversion_rate)" subtitle="sobre a base total" color="orange" icon="◇" eyebrow="Valor" />
      <OrdoMetricCard title="Ofícios realizados" :value="formatNumber(dashboard.overview.total_completions)" :subtitle="`média ${formatDecimal(dashboard.overview.avg_completions_per_user)} por pessoa ativa`" color="green" icon="✦" eyebrow="Prática" />
      <OrdoMetricCard title="Diários criados" :value="formatNumber(dashboard.overview.total_journals)" :subtitle="`${formatNumber(dashboard.overview.users_with_completions)} pessoas já rezaram`" color="purple" icon="▤" eyebrow="Memória" />
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.engagement" title="Ritmo de presença" description="Usuários ativos distintos por dia de referência." icon="⌁" icon-color="blue" eyebrow="Engajamento">
        <div class="ordo-chart-meta"><span>DAU / WAU <strong>{{ formatPercent(dashboard.engagement.dau_wau_ratio) }}</strong></span><span>WAU / MAU <strong>{{ formatPercent(dashboard.engagement.wau_mau_ratio) }}</strong></span></div>
        <OrdoLineChart :labels="activityLabels" :data="activityData" label="Usuários ativos" color="#496451" />
      </OrdoChartCard>

      <section v-if="dashboard.users" class="ordo-signal-card">
        <div class="ordo-signal-card__header">
          <div><p class="ordo-kicker">Leitura lateral</p><h2>Constância antes de volume.</h2></div>
          <span class="ordo-signal-card__symbol">◔</span>
        </div>
        <div class="ordo-signal-list">
          <div><span>Novos no período</span><strong>{{ formatNumber(dashboard.users.new_users_in_period) }}</strong></div>
          <div><span>Ativos no período</span><strong>{{ formatNumber(dashboard.users.active_users_in_period) }}</strong></div>
          <div><span>Sequência média atual</span><strong>{{ formatDecimal(dashboard.users.avg_current_streak) }} dias</strong></div>
          <div><span>Maior sequência média</span><strong>{{ formatDecimal(dashboard.users.avg_longest_streak) }} dias</strong></div>
        </div>
        <p class="ordo-signal-card__note">A média de completions usa somente quem tem ao menos um ofício, conforme o novo contrato.</p>
      </section>
    </div>

    <div v-if="dashboard.users" class="ordo-grid-2">
      <OrdoChartCard title="Sequências mais longas" description="O ranking não expõe e-mail: apenas nome e ID público." icon="↗" icon-color="orange" eyebrow="Comunidade">
        <OrdoTopList :items="topStreakers" empty-message="Ainda não há sequências registradas." />
      </OrdoChartCard>
      <OrdoChartCard v-if="dashboard.engagement" title="O que mudou no período" description="O MAU termina no fim do período escolhido." icon="＋" icon-color="green" eyebrow="Contexto">
        <div class="ordo-highlight-grid">
          <div><span>DAU</span><strong>{{ formatNumber(dashboard.engagement.dau) }}</strong></div>
          <div><span>WAU</span><strong>{{ formatNumber(dashboard.engagement.wau) }}</strong></div>
          <div><span>MAU</span><strong>{{ formatNumber(dashboard.engagement.mau) }}</strong></div>
          <div><span>Tokens FCM</span><strong>{{ formatNumber(dashboard.users.active_fcm_tokens) }}</strong></div>
        </div>
        <div class="ordo-note-box"><span>Escopo</span><strong>{{ scopeLabel(dashboard.engagement.scope) }}</strong><small>As janelas móveis terminam em {{ formatDate(period?.end_date) }}.</small></div>
      </OrdoChartCard>
    </div>
  </section>
</template>
