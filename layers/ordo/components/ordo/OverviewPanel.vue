<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon, { type OrdoIconName } from './Icon.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoSparkline from './Sparkline.vue'
import OrdoTopList from './TopList.vue'
import OrdoTrendChart from './TrendChart.vue'
import { useDashboardContext } from '../../composables/useDashboardContext'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { comparePeriods } from '../../utils/compare'
import { buildSeries, lastValues, officeMeta, SERIES_COLORS } from '../../utils/series'
import { periodShortLabel, type PeriodValue } from '../../utils/period'
import type { PortalLocation } from '../../utils/portalRoute'
import type { DashboardAudio, DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  audio?: DashboardAudio | null
  period: PeriodValue
  monthly: boolean
}>()

const emit = defineEmits<{ navigate: [location: PortalLocation] }>()

const { formatNumber, formatPercent, formatDuration, humanizeKey } = useOrdoDashboardPresentation()

const overview = computed(() => props.dashboard.overview || {})
const users = computed(() => props.dashboard.users || {})
const engagement = computed(() => props.dashboard.engagement || {})
const completions = computed(() => props.dashboard.completions || {})
const moderation = computed(() => props.dashboard.moderation)
const notifications = computed(() => props.dashboard.notifications)
const health = computed(() => props.dashboard.health)

const { isPending, previous, previousLabel, isPreviousPending } = useDashboardContext()
const deltas = computed(() => ({
  active: comparePeriods(users.value.active_users_in_period, previous.value?.users?.active_users_in_period),
  completions: comparePeriods(completions.value.total_in_period, previous.value?.completions?.total_in_period),
  reminder: comparePeriods(notifications.value?.reminder_conversion?.rate, previous.value?.notifications?.reminder_conversion?.rate, { kind: 'rate' })
}))
const shortPeriod = computed(() => periodShortLabel(props.period))

// Each item opens the exact place that answers it, not just its tab.
interface AttentionItem { key: string; icon: OrdoIconName; tone: string; title: string; detail: string; to: PortalLocation }
const attention = computed<AttentionItem[]>(() => {
  const items: AttentionItem[] = []
  const rosaries = moderation.value?.custom_rosaries
  if (rosaries?.pending_now) {
    const eta = rosaries.estimated_days_to_clear
    const oldest = rosaries.oldest_pending_age_seconds ? `o mais antigo espera há ${formatDuration(rosaries.oldest_pending_age_seconds)}` : ''
    items.push({
      key: 'rosaries',
      icon: 'inbox',
      tone: 'op-tone-gold',
      title: `${formatNumber(rosaries.pending_now)} ${rosaries.pending_now === 1 ? 'rosário para revisar' : 'rosários para revisar'}`,
      detail: [oldest, eta ? `no ritmo atual, a fila zera em ${eta} ${eta === 1 ? 'dia' : 'dias'}` : ''].filter(Boolean).join(' · '),
      to: { tab: 'operations' }
    })
  }
  if (props.audio?.pending_candidates) {
    items.push({ key: 'candidates', icon: 'audio', tone: 'op-tone-info', title: `${formatNumber(props.audio.pending_candidates)} ${props.audio.pending_candidates === 1 ? 'tentativa de narração' : 'tentativas de narração'}`, detail: 'Esperam alguém ouvir e aprovar', to: { tab: 'audio', params: { secao: 'clips' } } })
  }
  const dead = props.audio?.worker_queue?.purgeable
  if (dead) {
    items.push({ key: 'dead', icon: 'alert', tone: 'op-tone-danger', title: `${formatNumber(dead)} ${dead === 1 ? 'tarefa de áudio travada' : 'tarefas de áudio travadas'}`, detail: 'Nunca vão terminar · apagar libera a fila', to: { tab: 'audio', params: { foco: 'fila' } } })
  }
  const expiring = health.value?.api_keys?.expiring_next_30_days
  if (expiring) {
    items.push({ key: 'keys', icon: 'key', tone: 'op-tone-warn', title: `${formatNumber(expiring)} ${expiring === 1 ? 'chave de API vence' : 'chaves de API vencem'} em 30 dias`, detail: 'Avise quem usa antes que pare', to: { tab: 'platform' } })
  }
  const lifeRules = moderation.value?.life_rules?.pending_now
  if (lifeRules) {
    items.push({ key: 'rules', icon: 'book', tone: 'op-tone-info', title: `${formatNumber(lifeRules)} ${lifeRules === 1 ? 'regra de vida nova' : 'regras de vida novas'}`, detail: 'Para acompanhar · a API ainda não aprova regras', to: { tab: 'operations', params: { vista: 'regras' } } })
  }
  return items
})
const attentionLoaded = computed(() => Boolean(moderation.value))

const premiumShare = computed(() => overview.value.premium_conversion_rate ?? 0)

const presence = computed(() => buildSeries(
  (engagement.value.daily_active_trend || []).map(item => ({ date: item.date, value: item.active_users })),
  props.period.start,
  props.period.end,
  { monthly: props.monthly, average: true }
))
const completionSeries = computed(() => buildSeries(
  (completions.value.daily_completions || []).map(item => ({ date: item.date, value: item.count })),
  props.period.start,
  props.period.end
))

const steadiness = computed(() => {
  const ratio = engagement.value.wau_mau_ratio
  if (ratio == null || !engagement.value.mau) return null
  return Math.round(ratio / 10)
})

const core = computed(() => engagement.value.core_users)

const offices = computed<BarListItem[]>(() => {
  const map = completions.value.by_office_type || {}
  const total = Object.values(map).reduce((sum, value) => sum + (value || 0), 0)
  return Object.entries(map)
    .map(([key, value]) => ({ key, value: value || 0, meta: officeMeta(key) }))
    .sort((a, b) => a.meta.order - b.meta.order)
    .map(({ key, value, meta }) => ({
      key,
      label: meta.label,
      value,
      display: formatNumber(value),
      share: total ? formatPercent(Math.round(value / total * 1000) / 10) : undefined,
      icon: meta.icon,
      color: meta.color,
      tint: meta.tint
    }))
})

const streakBuckets = computed<BarListItem[]>(() => {
  const base = overview.value.total_users || 0
  return (users.value.current_streak_buckets || []).map(bucket => ({
    key: String(bucket.min_days),
    label: `${bucket.min_days}+ dias seguidos`,
    value: bucket.users || 0,
    display: formatNumber(bucket.users),
    share: base ? `${formatPercent(Math.round((bucket.users || 0) / base * 1000) / 10)} da base` : undefined,
    color: 'var(--op-gold)'
  }))
})

const streakers = computed(() => (users.value.top_streakers || []).slice(0, 5).map(item => ({
  label: item.name || `Pessoa #${item.id}`,
  value: item.longest_streak || 0,
  display: `${formatNumber(item.longest_streak)} dias`,
  subtitle: `#${item.id} · agora em ${formatNumber(item.current_streak)} ${item.current_streak === 1 ? 'dia' : 'dias'}`
})))

const reminder = computed(() => notifications.value?.reminder_conversion || null)
const devices = computed(() => {
  const map = users.value.platform_breakdown || {}
  const total = Object.values(map).reduce((sum, value) => sum + (value || 0), 0)
  return Object.entries(map)
    .map(([key, value]) => ({ key, label: humanizeKey(key), value: value || 0 }))
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({ ...item, color: SERIES_COLORS[index] || 'var(--op-ink-faint)', share: total ? Math.round(item.value / total * 100) : 0 }))
})

const books = computed<BarListItem[]>(() => {
  const list = props.dashboard.prayer_books?.completion_usage_by_prayer_book || completions.value.by_prayer_book || []
  return [...list]
    .sort((a, b) => (b.completions || 0) - (a.completions || 0))
    .map(item => ({ key: item.code, label: item.name, code: item.code, value: item.completions || 0, display: formatNumber(item.completions) }))
})
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <span v-if="!attentionLoaded && isPending('moderation')" class="op-skeleton" style="height: 92px; border-radius: 20px" aria-hidden="true" />
    <section v-if="attentionLoaded" class="op-band" aria-labelledby="attention-title">
      <template v-if="attention.length">
        <div class="op-section__head" style="padding: 0 4px 14px">
          <h2 id="attention-title" class="op-display" style="margin: 0; font-size: 21px; font-weight: 600">Pede uma decisão</h2>
          <p class="op-muted" style="margin: 0; font-size: 13px">O que está esperando alguém, do mais urgente ao mais leve.</p>
        </div>
        <div class="op-attn">
          <button v-for="item in attention" :key="item.key" type="button" class="op-attn__item" @click="emit('navigate', item.to)">
            <span class="op-attn__icon" :class="item.tone" aria-hidden="true"><OrdoIcon :name="item.icon" :size="22" /></span>
            <span class="op-attn__copy">
              <strong>{{ item.title }}</strong>
              <span v-if="item.detail">{{ item.detail }}</span>
            </span>
            <span class="op-attn__go" aria-hidden="true"><OrdoIcon name="arrow" :size="16" /></span>
          </button>
        </div>
      </template>
      <div v-else style="display: flex; align-items: center; gap: 16px">
        <span class="op-attn__icon op-tone-ok" style="border-radius: 999px" aria-hidden="true"><OrdoIcon name="check" :size="22" /></span>
        <div style="display: flex; flex-direction: column; gap: 2px">
          <h2 id="attention-title" class="op-display" style="margin: 0; font-size: 19px; font-weight: 600">Tudo em dia</h2>
          <span class="op-muted" style="font-size: 13.5px">Nenhuma fila pede decisão agora. Rosários, narração e chaves estão em ordem.</span>
        </div>
      </div>
    </section>

    <section class="op-section" aria-labelledby="pulse-title">
      <div class="op-section__head">
        <h2 id="pulse-title">Pulso da comunidade</h2>
        <div class="op-legend">
          <span><i class="op-swatch" style="border-radius: 999px; background: var(--op-action)" />No período escolhido</span>
          <span><i class="op-swatch" style="border-radius: 999px; border: 1.5px solid var(--op-ink-soft)" />Base total</span>
        </div>
      </div>
      <div class="op-grid" style="--op-min: 250px">
        <OrdoMetricCard :loading="isPending('overview')" title="Pessoas na base" :value="formatNumber(overview.total_users)" scope="lifetime" :subtitle="`${formatNumber(overview.free_users)} gratuitas · ${formatNumber(overview.premium_users)} no Ordo+ (${formatPercent(premiumShare)})`">
          <div class="op-stack" style="height: 8px; margin-top: 4px" aria-hidden="true">
            <span :style="{ flex: `${Math.max(100 - premiumShare, 0)} 1 0`, background: 'var(--op-seq-2)' }" />
            <span :style="{ flex: `${premiumShare} 1 0`, background: 'var(--op-gold)' }" />
          </div>
        </OrdoMetricCard>
        <OrdoMetricCard :loading="isPending('users')" :delta="deltas.active" :delta-label="previousLabel" :delta-loading="isPreviousPending('users')" title="Rezaram no período" :value="formatNumber(users.active_users_in_period)" scope="period" :scope-label="shortPeriod" subtitle="ao menos um ofício rezado">
          <OrdoSparkline :values="lastValues(presence)" />
        </OrdoMetricCard>
        <OrdoMetricCard :loading="isPending('engagement')" title="Núcleo fiel" :value="core ? formatNumber(core.count) : '—'" scope="window" scope-label="Últimos 7 dias" :subtitle="core ? `rezaram em ${core.min_active_days ?? 4} ou mais dos últimos ${core.window_days ?? 7} dias · ${formatPercent(core.share_of_wau)} de quem rezou na semana` : 'Aparece quando a API publicar este número.'" />
        <OrdoMetricCard :loading="isPending('completions')" :delta="deltas.completions" :delta-label="previousLabel" :delta-loading="isPreviousPending('completions')" title="Ofícios rezados" :value="formatNumber(completions.total_in_period)" scope="period" :scope-label="shortPeriod" :subtitle="completions.avg_duration_seconds ? `cada um dura ${formatDuration(completions.avg_duration_seconds)}, em média` : 'no período escolhido'">
          <OrdoSparkline :values="lastValues(completionSeries)" />
        </OrdoMetricCard>
      </div>
    </section>

    <section class="op-row">
      <OrdoChartCard :loading="isPending('engagement')" :skeleton-height="260" class="op-grow-2" eyebrow="Presença" :title="monthly ? 'Quantas pessoas rezam por dia, mês a mês' : 'Quantas pessoas rezam por dia'" :description="monthly ? 'Média diária de pessoas que rezaram em cada mês.' : 'Pessoas diferentes que rezaram ao menos um ofício em cada dia.'">
        <template #actions>
          <dl class="op-kv" style="--op-kv-cols: 3; gap: 18px">
            <div><dt>Rezaram hoje</dt><dd style="font-size: 20px">{{ formatNumber(engagement.dau) }}</dd></div>
            <div><dt>Em 7 dias</dt><dd style="font-size: 20px">{{ formatNumber(engagement.wau) }}</dd></div>
            <div><dt>Em 30 dias</dt><dd style="font-size: 20px">{{ formatNumber(engagement.mau) }}</dd></div>
          </dl>
        </template>
        <OrdoTrendChart :points="presence" unit="pessoas" aria-label="Pessoas que rezaram por dia no período" />
        <template #footer>
          <span v-if="steadiness !== null" style="color: var(--op-ink); font-size: 13px"><strong>Constância:</strong> de cada 10 pessoas que rezaram no mês, {{ steadiness }} voltaram nesta semana.</span>
          <span>Hoje, 7 e 30 dias contam até o fim do período.</span>
        </template>
      </OrdoChartCard>

      <OrdoChartCard :loading="isPending('completions')" :skeleton-height="220" class="op-grow-1" eyebrow="Prática" title="Horas do ofício" description="Ofícios rezados por tipo, na ordem do dia." scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="offices" />
        <template #footer>
          <span>As cores são as das horas no app.</span>
        </template>
      </OrdoChartCard>
    </section>

    <section class="op-grid" style="--op-min: 320px">
      <OrdoChartCard :loading="isPending('users')" :skeleton-height="240" eyebrow="Constância" title="Dias seguidos rezando" description="Quantas pessoas estão numa sequência agora." scope="lifetime">
        <OrdoBarList v-if="streakBuckets.length" :items="streakBuckets" />
        <p v-else class="op-faint" style="margin: 0; font-size: 13px">Média atual: <strong style="color: var(--op-ink)">{{ formatNumber(users.avg_current_streak) }} dias</strong> · maior média: {{ formatNumber(users.avg_longest_streak) }} dias.</p>
        <p class="op-eyebrow" style="margin-top: 4px">Mais dias seguidos</p>
        <OrdoTopList :items="streakers" empty-message="Ninguém em sequência ainda." />
        <template #footer><span>Sem e-mail no ranking: só nome e número da conta.</span></template>
      </OrdoChartCard>

      <OrdoChartCard :loading="isPending('notifications', 'users')" :skeleton-height="200" eyebrow="Lembretes" title="Lembretes que viram oração" description="Lembretes de sequência seguidos de um ofício da mesma pessoa em até 2 horas." scope="period" :scope-label="shortPeriod">
        <div v-if="reminder" style="display: flex; align-items: baseline; gap: 10px">
          <span class="op-metric__value">{{ formatPercent(reminder.rate) }}</span>
          <span class="op-faint" style="font-size: 13px">{{ formatNumber(reminder.followed_by_prayer) }} de {{ formatNumber(reminder.sent) }} lembretes</span>
        </div>
        <OrdoDeltaChip v-if="reminder && deltas.reminder" :delta="deltas.reminder" :label="previousLabel" />
        <p v-else class="op-faint" style="margin: 0; font-size: 13px">Aparece quando a API publicar este número.</p>
        <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid var(--op-hair-soft)">
          <div style="display: flex; justify-content: space-between; align-items: baseline">
            <span style="font-size: 14px; font-weight: 600">Aparelhos que recebem lembretes</span>
            <strong class="op-display" style="font-size: 20px">{{ formatNumber(users.active_fcm_tokens) }}</strong>
          </div>
          <div class="op-stack" aria-hidden="true">
            <span v-for="item in devices" :key="item.key" :style="{ flex: `${item.value} 1 0`, background: item.color }" />
          </div>
          <div class="op-legend">
            <span v-for="item in devices" :key="item.key"><i class="op-swatch" :style="{ background: item.color }" />{{ item.label }} <strong style="color: var(--op-ink)">{{ formatNumber(item.value) }}</strong> · {{ item.share }}%</span>
          </div>
        </div>
        <template #footer><span>Aparelhos usados nos últimos 60 dias.</span></template>
      </OrdoChartCard>

      <OrdoChartCard :loading="isPending('prayer_books', 'completions')" :skeleton-height="220" eyebrow="Livros de oração" title="Em uso no período" description="Ofícios rezados em cada livro, não a escolha do primeiro acesso." scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="books" :limit="6" :thickness="6" />
        <template v-if="dashboard.prayer_books?.unattributed_completions" #footer>
          <span>Sem livro registrado: <strong style="color: var(--op-ink)">{{ formatNumber(dashboard.prayer_books?.unattributed_completions) }}</strong> ofícios, de antes de o app guardar essa informação.</span>
        </template>
      </OrdoChartCard>
    </section>
  </div>
</template>
