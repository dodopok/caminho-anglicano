<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoCustomRosaryQueue from './CustomRosaryQueue.vue'
import OrdoLifeRulesQueue from './LifeRulesQueue.vue'
import OrdoMetricCard from './MetricCard.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type {
  CustomRosaryPrayer,
  CustomRosaryShareStatus,
  DashboardData,
  LifeRule,
  LifeRulePagination,
  LifeRuleStatus
} from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  lifeRules: LifeRule[]
  lifeRulesPagination?: LifeRulePagination | null
  lifeRulesLoading: boolean
  lifeRulesError?: string | null
  lifeRuleStatus: LifeRuleStatus
  lifeRuleSearch: string
  lifeRuleCurrentPage: number
  lifeRuleTotalPages: number
  customRosaries: CustomRosaryPrayer[]
  customRosariesLoading: boolean
  customRosariesError?: string | null
  customRosaryStatus: Exclude<CustomRosaryShareStatus, 'private'>
  selectedRosaryStatusItems: Array<{ key: string; label: string; value: number }>
}>()

const emit = defineEmits<{
  'update:lifeRuleStatus': [value: LifeRuleStatus]
  'update:lifeRuleSearch': [value: string]
  'search-life-rules': []
  'change-life-rule-page': [direction: number]
  'update:customRosaryStatus': [value: Exclude<CustomRosaryShareStatus, 'private'>]
  'change-custom-rosary-status': []
  'open-rosary': [rosary: CustomRosaryPrayer]
}>()

const { formatNumber, formatDecimal, formatPercent, formatDuration, mapItems, maxItemValue } = useOrdoDashboardPresentation()

const notificationStatusItems = computed(() => mapItems(props.dashboard.notifications?.delivery_status_counts))
const estimatedMissingCharacters = computed(() => Object.values(props.dashboard.audio?.estimated_missing_characters || {}).reduce((total, value) => total + value, 0))
const moderation = computed(() => props.dashboard.moderation?.custom_rosaries)
</script>

<template>
  <section class="ordo-content-stack">
    <div class="ordo-section-intro"><div><p class="ordo-kicker">Operação & moderação</p><h2>O que precisa de uma decisão humana.</h2></div><span class="ordo-scope-label">fila atual + métricas do período</span></div>

    <div class="ordo-metrics-grid ordo-metrics-grid--four">
      <OrdoMetricCard v-if="moderation" title="Rosários em revisão" :value="formatNumber(moderation.pending_now)" :subtitle="`${formatNumber(moderation.approved_without_strapi)} aprovados sem Strapi`" color="orange" icon="◌" eyebrow="Moderação" />
      <OrdoMetricCard v-if="dashboard.life_rules" title="Regras pendentes" :value="formatNumber(dashboard.life_rules.pending_rules)" :subtitle="`${formatNumber(dashboard.life_rules.total_adoptions)} adoções históricas`" color="purple" icon="⌁" eyebrow="Regras de vida" />
      <OrdoMetricCard v-if="dashboard.health?.notifications" title="Falhas nas últimas 24h" :value="formatNumber(dashboard.health.notifications.failures_last_24_hours)" subtitle="notificações FCM" color="pink" icon="!" eyebrow="Saúde" />
      <OrdoMetricCard v-if="dashboard.health?.audio_sessions" title="Áudio travado" :value="formatNumber(dashboard.health.audio_sessions.stale_running)" :subtitle="`${formatNumber(dashboard.health.audio_sessions.failed)} falhas históricas`" color="blue" icon="◷" eyebrow="Geração" />
    </div>

    <div class="ordo-grid-2">
      <OrdoChartCard v-if="dashboard.audio" title="Cobertura de áudio" description="Vozes conhecidas: male_1, female_1 e male_2." icon="◷" icon-color="blue" eyebrow="Áudio"><div class="ordo-stat-banner"><strong>{{ formatPercent(dashboard.audio.audio_coverage_percentage) }}</strong><span>{{ formatNumber(dashboard.audio.texts_with_audio) }} de {{ formatNumber(dashboard.audio.total_texts) }} textos</span></div><div class="ordo-highlight-grid"><div><span>Concluídas</span><strong>{{ formatNumber(dashboard.audio.completed_sessions) }}</strong></div><div><span>Rodando</span><strong>{{ formatNumber(dashboard.audio.running_sessions) }}</strong></div><div><span>Falhas</span><strong>{{ formatNumber(dashboard.audio.failed_sessions) }}</strong></div><div><span>Custo estimado</span><strong>{{ dashboard.audio.estimated_missing_cost == null ? '—' : `US$ ${formatDecimal(dashboard.audio.estimated_missing_cost, 2)}` }}</strong></div></div><div class="ordo-note-box"><span>Caracteres faltantes</span><strong>{{ formatNumber(estimatedMissingCharacters) }}</strong><small>estimativa somada por voz</small></div></OrdoChartCard>
      <OrdoChartCard v-if="dashboard.notifications" title="Entrega de notificações" description="O token bruto nunca aparece no dashboard; status são agregados por hash." icon="⌁" icon-color="pink" eyebrow="Notificações"><div class="ordo-highlight-grid"><div><span>Logs</span><strong>{{ formatNumber(dashboard.notifications.total_in_period) }}</strong></div><div><span>Enviadas</span><strong>{{ formatNumber(dashboard.notifications.sent) }}</strong></div><div><span>Falhas</span><strong>{{ formatNumber(dashboard.notifications.failed) }}</strong></div><div><span>Sucesso</span><strong>{{ formatPercent(dashboard.notifications.success_rate) }}</strong></div></div><div class="ordo-mini-bars"><div v-for="item in notificationStatusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-pink" :style="{ width: `${(item.value / maxItemValue(notificationStatusItems)) * 100}%` }" /></i></div></div></OrdoChartCard>
    </div>

    <div class="ordo-queue-grid">
      <OrdoLifeRulesQueue :rules="lifeRules" :pagination="lifeRulesPagination" :loading="lifeRulesLoading" :error="lifeRulesError" :status="lifeRuleStatus" :search="lifeRuleSearch" :current-page="lifeRuleCurrentPage" :total-pages="lifeRuleTotalPages" @update:status="emit('update:lifeRuleStatus', $event)" @update:search="emit('update:lifeRuleSearch', $event)" @search="emit('search-life-rules')" @change-page="emit('change-life-rule-page', $event)" />
      <OrdoCustomRosaryQueue :rosaries="customRosaries" :loading="customRosariesLoading" :error="customRosariesError" :status="customRosaryStatus" :summary="dashboard.custom_rosaries" :status-items="selectedRosaryStatusItems" @update:status="emit('update:customRosaryStatus', $event)" @change="emit('change-custom-rosary-status')" @open="emit('open-rosary', $event)" />
    </div>

    <div v-if="moderation" class="ordo-table-card"><div class="ordo-table-card__header"><div><p class="ordo-kicker">Decisões no período</p><h2>Qualidade da moderação</h2></div><span class="ordo-scope-label">{{ formatPercent(moderation.approval_rate) }} de aprovação</span></div><div class="ordo-highlight-grid ordo-highlight-grid--wide"><div><span>Aprovadas</span><strong>{{ formatNumber(moderation.approved_in_period) }}</strong></div><div><span>Rejeitadas</span><strong>{{ formatNumber(moderation.rejected_in_period) }}</strong></div><div><span>Reentradas</span><strong>{{ formatNumber(moderation.reentries_in_period) }}</strong></div><div><span>Tempo médio</span><strong>{{ formatDuration(moderation.average_response_time_seconds) }}</strong></div></div></div>
  </section>
</template>
