<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import OrdoSparkline from './Sparkline.vue'
import OrdoTrendChart, { type TrendPoint } from './TrendChart.vue'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { comparePeriods, previousLabel } from '../../utils/compare'
import { endpointLabel } from '../../utils/endpoints'
import { groupsByMonth, periodShortLabel, type PeriodValue } from '../../utils/period'
import { buildSeries } from '../../utils/series'
import { isSessionError, type DeveloperUsageKey, type DeveloperUsageResponse } from '../../types/dashboard'

// One developer's use of the API, opened from the Negócio tab: how much,
// with which key, on which endpoints, on which days, and how close to the
// limit. It sits in a side sheet so the list stays where it was.
const props = defineProps<{
  developerId: string
  period: PeriodValue
  /** The name the list already showed, so the sheet has a title before the data. */
  name?: string | null
}>()

const emit = defineEmits<{ close: [] }>()

const { fetchDeveloperUsage } = useOrdoApi()
const { formatNumber, formatPercent, formatDate, formatRelative, formatTimestamp } = useOrdoDashboardPresentation()

const data = ref<DeveloperUsageResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let request = 0

const load = async () => {
  const requestId = ++request
  loading.value = true
  error.value = null
  try {
    const response = await fetchDeveloperUsage(props.developerId, { start_date: props.period.start, end_date: props.period.end })
    if (requestId === request) data.value = response
  } catch (caught) {
    if (requestId !== request || isSessionError(caught)) return
    const status = (caught as { status?: number })?.status
    error.value = status === 404
      ? 'Este detalhe ainda não existe na API publicada ou o desenvolvedor não foi encontrado.'
      : caught instanceof Error ? caught.message : 'Não foi possível carregar o uso deste desenvolvedor.'
  } finally {
    if (requestId === request) loading.value = false
  }
}

watch(() => [props.developerId, props.period.start, props.period.end], load, { immediate: true })

const developer = computed(() => data.value?.developer || null)
const totals = computed(() => data.value?.totals || {})
const shortPeriod = computed(() => periodShortLabel(props.period))
const monthly = computed(() => groupsByMonth(props.period))
const periodDays = computed(() => {
  const start = new Date(`${data.value?.period.start_date || props.period.start}T12:00:00`)
  const end = new Date(`${data.value?.period.end_date || props.period.end}T12:00:00`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
})

const delta = computed(() => comparePeriods(totals.value.requests_in_period, totals.value.previous_period_requests))
const compareLabel = computed(() => previousLabel(props.period))

const daily = computed<TrendPoint[]>(() => buildSeries(data.value?.daily || {}, props.period.start, props.period.end, { monthly: monthly.value }))

// Activity in words, from the last call of any key.
const activity = computed(() => {
  const last = totals.value.last_used_at
  if (!last) return { text: 'Nunca usou uma chave', tone: 'op-pill--quiet' }
  const days = (Date.now() - new Date(last).getTime()) / 86_400_000
  if (days < 1) return { text: `Ativo hoje · ${formatRelative(last)}`, tone: 'op-pill--ok' }
  if (days < 7) return { text: `Ativo nesta semana · ${formatRelative(last)}`, tone: 'op-pill--ok' }
  if (days < 30) return { text: `Usou este mês · ${formatRelative(last)}`, tone: 'op-pill--info' }
  return { text: `Parado · último uso ${formatRelative(last)}`, tone: 'op-pill--warn' }
})

const PLAN_NAMES: Record<string, string> = { parish: 'Paróquia', diocese: 'Diocese', province: 'Província' }
const plan = computed(() => {
  const dev = developer.value
  if (!dev) return null
  if (dev.legacy_free) return { text: 'Gratuito vitalício', tone: 'op-pill--gold' }
  const current = dev.plan
  if (!current?.code) return { text: 'Sem plano', tone: 'op-pill--quiet' }
  const name = PLAN_NAMES[current.code] || current.code
  if (current.status === 'trialing') return { text: `${name} · em teste${current.trial_ends_at ? ` até ${formatDate(current.trial_ends_at)}` : ''}`, tone: 'op-pill--info' }
  if (current.status === 'active') return { text: `${name}${current.cancel_at_period_end ? ' · cancela no fim do ciclo' : ''}`, tone: current.cancel_at_period_end ? 'op-pill--warn' : 'op-pill--ok' }
  return { text: `${name} · ${current.status === 'past_due' ? 'pagamento atrasado' : current.status === 'canceled' ? 'cancelado' : current.status || 'sem status'}`, tone: 'op-pill--danger' }
})

const keyStatus = (key: DeveloperUsageKey) => {
  if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) return { text: 'Vencida', tone: 'op-pill--danger' }
  if (!key.active) return { text: 'Desligada', tone: 'op-pill--quiet' }
  if (key.billing_active === false) return { text: 'Sem plano ativo', tone: 'op-pill--warn' }
  return { text: 'Ativa', tone: 'op-pill--ok' }
}

const KEY_COLORS = ['var(--op-s1)', 'var(--op-s2)', 'var(--op-s4)', 'var(--op-s3)', 'var(--op-s5)', 'var(--op-s6)']

const keys = computed(() => {
  const list = data.value?.keys || []
  const total = list.reduce((sum, key) => sum + (key.requests_in_period || 0), 0)
  return list.map((key, index) => ({
    ...key,
    color: KEY_COLORS[index % KEY_COLORS.length],
    share: total ? (key.requests_in_period || 0) / total * 100 : 0,
    spark: buildSeries(key.daily || {}, props.period.start, props.period.end, { monthly: monthly.value }).map(point => point.value),
    status: keyStatus(key)
  }))
})

const endpoints = computed<BarListItem[]>(() => {
  const list = data.value?.endpoints || []
  const total = list.reduce((sum, item) => sum + (item.requests || 0), 0)
  return list.map(item => ({
    key: item.endpoint,
    label: endpointLabel(item.endpoint),
    hint: [endpointLabel(item.endpoint) === item.endpoint ? '' : item.endpoint, item.keys && item.keys > 1 ? `${item.keys} chaves` : ''].filter(Boolean).join(' · ') || undefined,
    value: item.requests || 0,
    display: formatNumber(item.requests),
    share: total ? formatPercent(Math.round((item.requests || 0) / total * 1000) / 10) : undefined,
    color: 'var(--op-s1)'
  }))
})

// Monday first, as a working week reads; Sunday in the API is 0.
const WEEKDAYS = [[1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado'], [0, 'Domingo']] as const
const weekdays = computed<BarListItem[]>(() => {
  const values = WEEKDAYS.map(([index]) => Number(data.value?.weekdays?.[String(index)] || 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  return WEEKDAYS.map(([index, label], position) => ({
    key: String(index),
    label,
    value: values[position] || 0,
    display: formatNumber(values[position]),
    share: total ? formatPercent(Math.round((values[position] || 0) / total * 1000) / 10) : undefined,
    color: index === 0 || index === 6 ? 'var(--op-s2)' : 'var(--op-s1)'
  }))
})
const busiestWeekday = computed(() => weekdays.value.reduce((best, day) => day.value > best.value ? day : best, weekdays.value[0]))

const activeShare = computed(() => Math.min(100, (totals.value.active_days_in_period || 0) / periodDays.value * 100))
const averagePerActiveDay = computed(() => totals.value.active_days_in_period
  ? Math.round((totals.value.requests_in_period || 0) / totals.value.active_days_in_period)
  : 0)

const initials = computed(() => (developer.value?.name || props.name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('pt-BR')).join(''))

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  nextTick(() => closeButton.value?.focus())
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="dev-sheet" role="presentation">
    <button type="button" class="dev-sheet__backdrop" aria-label="Fechar detalhe" tabindex="-1" @click="emit('close')" />
    <aside class="dev-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="dev-sheet-title">
      <header class="dev-sheet__head">
        <span class="op-initials dev-sheet__avatar" aria-hidden="true">{{ initials }}</span>
        <div class="dev-sheet__title">
          <p class="op-eyebrow">Desenvolvedor · {{ shortPeriod }}</p>
          <h2 id="dev-sheet-title">{{ developer?.name || name || `Desenvolvedor #${developerId}` }}</h2>
          <p v-if="developer?.company_name || developer?.email" class="dev-sheet__meta">
            <span v-if="developer?.company_name">{{ developer.company_name }}</span>
            <a v-if="developer?.email" :href="`mailto:${developer.email}`" class="op-link">{{ developer.email }}</a>
            <a v-if="developer?.website" :href="developer.website" target="_blank" rel="noopener noreferrer" class="op-link">site <OrdoIcon name="external" :size="12" /></a>
          </p>
        </div>
        <button ref="closeButton" type="button" class="op-icon-btn" aria-label="Fechar" @click="emit('close')"><OrdoIcon name="close" :size="18" /></button>
      </header>

      <div class="dev-sheet__body">
        <div v-if="error" class="op-inline-error" role="alert">
          <OrdoIcon name="alert" :size="18" />
          <span style="flex: 1">{{ error }}</span>
          <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
        </div>

        <template v-else-if="loading && !data">
          <div class="dev-sheet__pills"><span class="op-skeleton" style="width: 160px; height: 26px; border-radius: 999px" /><span class="op-skeleton" style="width: 120px; height: 26px; border-radius: 999px" /></div>
          <div class="dev-sheet__kpis"><span v-for="n in 4" :key="n" class="op-skeleton" style="height: 92px" /></div>
          <span class="op-skeleton" style="height: 230px" />
          <span class="op-skeleton" style="height: 160px" />
        </template>

        <template v-else-if="data">
          <div class="dev-sheet__pills" :style="{ opacity: loading ? .6 : 1 }">
            <span class="op-pill" :class="activity.tone">{{ activity.text }}</span>
            <span v-if="plan" class="op-pill" :class="plan.tone">{{ plan.text }}</span>
            <span v-if="developer?.approved === false" class="op-pill op-pill--warn">Esperando aprovação</span>
            <span v-if="developer?.created_at" class="op-faint" style="font-size: 12.5px">no portal desde {{ formatDate(developer.created_at) }}</span>
          </div>

          <section class="dev-sheet__kpis" aria-label="Resumo do uso" :style="{ opacity: loading ? .6 : 1 }">
            <div class="dev-kpi">
              <span class="dev-kpi__label">Requisições</span>
              <strong class="dev-kpi__value">{{ formatNumber(totals.requests_in_period) }}</strong>
              <OrdoDeltaChip v-if="delta" :delta="delta" :label="compareLabel" />
              <small v-else>{{ formatNumber(totals.lifetime_requests) }} desde o início</small>
            </div>
            <div class="dev-kpi">
              <span class="dev-kpi__label">Dias com uso</span>
              <strong class="dev-kpi__value">{{ formatNumber(totals.active_days_in_period) }}<small>de {{ formatNumber(periodDays) }}</small></strong>
              <span class="op-track" style="height: 6px" aria-hidden="true"><span :style="{ width: `${activeShare}%`, background: 'var(--op-s3)' }" /></span>
              <small v-if="averagePerActiveDay">{{ formatNumber(averagePerActiveDay) }} por dia de uso</small>
            </div>
            <div class="dev-kpi">
              <span class="dev-kpi__label">Dia mais cheio</span>
              <strong class="dev-kpi__value">{{ totals.peak_day ? formatNumber(totals.peak_day.requests) : '—' }}</strong>
              <small>{{ totals.peak_day ? formatDate(totals.peak_day.date) : 'Nenhuma requisição no período' }}</small>
            </div>
            <div class="dev-kpi">
              <span class="dev-kpi__label">Perto do limite</span>
              <strong class="dev-kpi__value" :style="{ color: totals.days_near_limit ? 'var(--op-warn)' : undefined }">{{ formatNumber(totals.days_near_limit) }}<small>{{ totals.days_near_limit === 1 ? 'dia' : 'dias' }}</small></strong>
              <small>com uma chave acima de 80% do limite{{ totals.daily_limit ? ` · ${formatNumber(totals.daily_limit)}/dia somando as ativas` : '' }}</small>
            </div>
          </section>

          <section class="dev-sheet__block" aria-labelledby="dev-daily-title">
            <div class="dev-sheet__block-head">
              <h3 id="dev-daily-title">{{ monthly ? 'Requisições por mês' : 'Requisições por dia' }}</h3>
              <p>Todas as chaves somadas. Dias sem uso aparecem como zero.</p>
            </div>
            <OrdoTrendChart :points="daily" unit="requisições" :height="200" aria-label="Requisições deste desenvolvedor ao longo do período" />
          </section>

          <section class="dev-sheet__block" aria-labelledby="dev-keys-title">
            <div class="dev-sheet__block-head">
              <h3 id="dev-keys-title">Chaves</h3>
              <p>{{ formatNumber(keys.length) }} {{ keys.length === 1 ? 'chave' : 'chaves' }}{{ developer?.max_keys ? ` de ${developer.max_keys} permitidas` : '' }} · {{ formatNumber(totals.keys_used_in_period) }} usadas no período.</p>
            </div>
            <div v-if="keys.filter(item => item.share > 0).length > 1" class="op-stack dev-sheet__share" aria-hidden="true">
              <span v-for="key in keys.filter(item => item.share > 0)" :key="key.id" :style="{ flex: `${key.share} 1 0`, background: key.color }" />
            </div>
            <ul v-if="keys.length" class="dev-keys">
              <li v-for="key in keys" :key="key.id" class="dev-key">
                <div class="dev-key__head">
                  <i class="op-swatch" :style="{ background: key.color }" aria-hidden="true" />
                  <strong>{{ key.name }}</strong>
                  <span class="op-pill" :class="key.status.tone">{{ key.status.text }}</span>
                </div>
                <code v-if="key.key_preview" class="dev-key__preview">{{ key.key_preview }}</code>
                <div class="dev-key__numbers">
                  <template v-if="key.requests_in_period">
                    <span><strong>{{ formatNumber(key.requests_in_period) }}</strong> no período<template v-if="keys.length > 1"> · {{ formatPercent(Math.round(key.share * 10) / 10) }}</template></span>
                    <span>{{ formatNumber(key.active_days_in_period) }} {{ key.active_days_in_period === 1 ? 'dia' : 'dias' }} com uso</span>
                  </template>
                  <span>último uso {{ key.last_used_at ? formatRelative(key.last_used_at) : 'nunca' }}</span>
                  <span v-if="key.daily_limit">limite {{ formatNumber(key.daily_limit) }}/dia{{ key.rate_limit_multiplier && key.rate_limit_multiplier > 1 ? ` (×${key.rate_limit_multiplier})` : '' }}</span>
                  <span v-if="key.expires_at">vence {{ formatDate(key.expires_at) }}</span>
                </div>
                <div v-if="key.spark.some(value => value > 0)" class="dev-key__spark" aria-hidden="true">
                  <OrdoSparkline :values="key.spark" :color="key.color" :height="30" />
                </div>
                <small v-else class="op-faint">Sem requisições no período · {{ formatNumber(key.lifetime_requests) }} desde o início{{ key.created_at ? `, criada em ${formatDate(key.created_at)}` : '' }}</small>
              </li>
            </ul>
            <p v-else class="op-empty">Nenhuma chave criada.</p>
          </section>

          <div class="dev-sheet__pair">
            <section class="dev-sheet__block" aria-labelledby="dev-endpoints-title">
              <div class="dev-sheet__block-head">
                <h3 id="dev-endpoints-title">O que mais consulta</h3>
                <p>Endereços da API no período.</p>
              </div>
              <OrdoBarList :items="endpoints" :limit="8" :thickness="6" empty-message="Nenhuma requisição no período." />
            </section>
            <section class="dev-sheet__block" aria-labelledby="dev-weekdays-title">
              <div class="dev-sheet__block-head">
                <h3 id="dev-weekdays-title">Dias da semana</h3>
                <p>{{ busiestWeekday?.value ? `Usa mais às ${busiestWeekday.label.toLowerCase()}s. Fim de semana em laranja.` : 'Sem uso no período.' }}</p>
              </div>
              <OrdoBarList :items="weekdays" :limit="7" :thickness="6" empty-message="Sem uso no período." />
            </section>
          </div>

          <details v-if="developer?.use_case_description" class="dev-sheet__usecase">
            <summary>O que disse que ia construir</summary>
            <p>{{ developer.use_case_description }}</p>
          </details>

          <p class="op-faint" style="margin: 0; font-size: 12px">Contagem por dia no fuso da API, atualizada a cada minuto. Lido {{ formatTimestamp(new Date().toISOString()) }}.</p>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.dev-sheet { position: fixed; z-index: 80; inset: 0; display: flex; justify-content: flex-end; }
.dev-sheet__backdrop { position: absolute; inset: 0; border: 0; background: rgba(13, 39, 68, .32); cursor: pointer; animation: dev-fade .18s ease-out; }
.dev-sheet__panel { position: relative; display: flex; flex-direction: column; width: min(760px, 100vw); height: 100%; background: var(--op-paper); box-shadow: -24px 0 60px -30px rgba(13, 39, 68, .55); animation: dev-slide .22s cubic-bezier(.2, .8, .2, 1); }
.dev-sheet__head { display: flex; align-items: flex-start; gap: 14px; padding: 22px 24px 18px; border-bottom: 1px solid var(--op-hair); background: var(--op-card); }
.dev-sheet__avatar { width: 46px; height: 46px; font-size: 16px; }
.dev-sheet__title { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; }
.dev-sheet__title .op-eyebrow { margin: 0; }
.dev-sheet__title h2 { margin: 0; overflow-wrap: anywhere; font-family: var(--op-font-display); font-size: 26px; font-weight: 600; line-height: 1.15; }
.dev-sheet__meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 2px 0 0; color: var(--op-ink-soft); font-size: 13.5px; }
.dev-sheet__meta a { display: inline-flex; align-items: center; gap: 3px; overflow-wrap: anywhere; }
.dev-sheet__body { display: flex; flex: 1; flex-direction: column; gap: 22px; overflow-y: auto; padding: 22px 24px 40px; overscroll-behavior: contain; }
.dev-sheet__pills { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dev-sheet__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.dev-kpi { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid var(--op-hair); border-radius: 14px; background: var(--op-card); }
.dev-kpi__label { color: var(--op-ink-soft); font-size: 12.5px; font-weight: 600; }
.dev-kpi__value { font-family: var(--op-font-display); font-size: 28px; font-weight: 500; line-height: 1; font-variant-numeric: lining-nums tabular-nums; }
.dev-kpi__value small { margin-left: 5px; color: var(--op-ink-faint); font-family: var(--op-font-ui); font-size: 13px; font-weight: 500; }
.dev-kpi > small { color: var(--op-ink-faint); font-size: 12px; line-height: 1.4; }
.dev-sheet__block { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; border: 1px solid var(--op-hair); border-radius: 16px; background: var(--op-card); }
.dev-sheet__block-head h3 { margin: 0; font-family: var(--op-font-display); font-size: 19px; font-weight: 600; }
.dev-sheet__block-head p { margin: 3px 0 0; color: var(--op-ink-faint); font-size: 13px; }
.dev-sheet__share { height: 10px; }
.dev-sheet__pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.dev-keys { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.dev-key { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid var(--op-hair-soft); border-radius: 12px; background: var(--op-paper); }
.dev-key__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dev-key__head strong { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 14.5px; }
.dev-key__preview { align-self: flex-start; max-width: 100%; overflow: hidden; padding: 2px 8px; border-radius: 6px; background: var(--op-card); color: var(--op-ink-soft); font-family: var(--op-font-mono); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.dev-key__numbers { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--op-ink-soft); font-size: 12.5px; }
.dev-key__numbers strong { color: var(--op-ink); font-variant-numeric: tabular-nums; }
.dev-key__spark { height: 30px; }
.dev-sheet__usecase { padding: 14px 18px; border: 1px dashed rgba(13, 39, 68, .18); border-radius: 14px; color: var(--op-ink-soft); font-size: 14px; line-height: 1.55; }
.dev-sheet__usecase summary { color: var(--op-ink); cursor: pointer; font-weight: 600; }
.dev-sheet__usecase p { margin: 10px 0 0; white-space: pre-line; }
@keyframes dev-slide { from { transform: translateX(24px); opacity: 0; } }
@keyframes dev-fade { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dev-sheet__panel, .dev-sheet__backdrop { animation: none; } }
@media (max-width: 640px) {
  .dev-sheet__head { padding: 16px; }
  .dev-sheet__body { padding: 16px 16px 32px; }
  .dev-sheet__title h2 { font-size: 22px; }
}
</style>
