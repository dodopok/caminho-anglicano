<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTopList from './TopList.vue'
import OrdoTrendChart, { type TrendPoint } from './TrendChart.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { buildSeries, officeMeta } from '../../utils/series'
import { periodShortLabel, type PeriodValue } from '../../utils/period'
import type { CountMap, DashboardData } from '../../types/dashboard'

const props = defineProps<{
  dashboard: DashboardData
  period: PeriodValue
  monthly: boolean
}>()

const { formatNumber, formatPercent, formatDuration, humanizeKey, languageLabel } = useOrdoDashboardPresentation()

const completions = computed(() => props.dashboard.completions || {})
const journals = computed(() => props.dashboard.journals)
const shared = computed(() => props.dashboard.shared_offices)
const weekly = computed(() => props.dashboard.weekly_prayers)
const favorites = computed(() => props.dashboard.favorites)
const shortPeriod = computed(() => periodShortLabel(props.period))

const daily = computed(() => buildSeries(
  (completions.value.daily_completions || []).map(item => ({ date: item.date, value: item.count })),
  props.period.start,
  props.period.end,
  { monthly: props.monthly }
))

const officeItems = (map?: CountMap): BarListItem[] => {
  const entries = Object.entries(map || {})
  const total = entries.reduce((sum, [, value]) => sum + (value || 0), 0)
  return entries
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
}

// All 24 hours in order: the old card sorted the hours and showed the first
// eight, so it only ever showed the night, never the peaks.
const hours = computed<TrendPoint[]>(() => {
  const map = completions.value.by_hour || {}
  return Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    tick: `${hour}h`,
    title: `Das ${hour}h às ${hour + 1}h`,
    value: Number(map[hour] ?? map[String(hour).padStart(2, '0')] ?? 0),
    strong: false
  }))
})
const peakHour = computed(() => hours.value.reduce((best, point) => point.value > best.value ? point : best, hours.value[0]))

const books = computed<BarListItem[]>(() => {
  const list = props.dashboard.prayer_books?.completion_usage_by_prayer_book || completions.value.by_prayer_book || []
  const total = list.reduce((sum, item) => sum + (item.completions || 0), 0)
  return [...list]
    .sort((a, b) => (b.completions || 0) - (a.completions || 0))
    .map(item => ({
      key: item.code,
      label: item.name,
      code: item.code,
      value: item.completions || 0,
      display: formatNumber(item.completions),
      share: total ? formatPercent(Math.round((item.completions || 0) / total * 1000) / 10) : undefined
    }))
})

const completers = computed(() => (completions.value.top_completers || []).slice(0, 6).map(item => ({
  label: item.name || `Pessoa #${item.id}`,
  value: item.completions || 0,
  display: `${formatNumber(item.completions)} ofícios`,
  subtitle: `#${item.id}`
})))
const writers = computed(() => (journals.value?.top_writers || []).slice(0, 6).map(item => ({
  label: item.name || `Pessoa #${item.id}`,
  value: item.journals || 0,
  display: `${formatNumber(item.journals)} ${item.journals === 1 ? 'diário' : 'diários'}`,
  subtitle: `#${item.id}`
})))

const mapToItems = (map: CountMap | undefined, color: string): BarListItem[] => Object.entries(map || {})
  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
  .map(([key, value]) => ({ key, label: humanizeKey(key), value: value || 0, display: formatNumber(value), color }))

const sharedItems = computed(() => officeItems(shared.value?.by_office_type))
const favoriteItems = computed(() => mapToItems(favorites.value?.by_kind, 'var(--op-s5)'))
const languageItems = computed(() => mapToItems(weekly.value?.generated_by_language, 'var(--op-s2)').map(item => ({ ...item, label: languageLabel(item.key) })))
const entryItems = computed(() => mapToItems(journals.value?.by_entry_type, 'var(--op-s4)'))
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <section class="op-grid" style="--op-min: 240px" aria-label="Resumo">
      <OrdoMetricCard title="Ofícios rezados" :value="formatNumber(completions.total_in_period)" scope="period" :scope-label="shortPeriod" :subtitle="completions.avg_duration_seconds ? `cada um dura ${formatDuration(completions.avg_duration_seconds)}, em média` : 'no período escolhido'" />
      <OrdoMetricCard title="Diários escritos" :value="formatNumber(journals?.total_in_period)" scope="period" :scope-label="shortPeriod" :subtitle="`${formatNumber(journals?.users_with_journals)} pessoas escrevendo`" />
      <OrdoMetricCard title="Ofícios compartilhados" :value="formatNumber(shared?.total_in_period)" scope="period" :scope-label="shortPeriod" :subtitle="`por ${formatNumber(shared?.unique_users_sharing)} pessoas`" />
      <OrdoMetricCard title="Orações semanais" :value="formatNumber(weekly?.weekly_prayers_generated)" scope="period" :scope-label="shortPeriod" :subtitle="`geradas a partir de ${formatNumber(weekly?.prayer_requests_created)} pedidos de oração`" />
    </section>

    <section class="op-row">
      <OrdoChartCard class="op-grow-2" eyebrow="Ritmo" :title="monthly ? 'Ofícios rezados por mês' : 'Ofícios rezados por dia'" :description="monthly ? 'Soma de ofícios em cada mês.' : 'Contados pelo dia a que o ofício pertence. Dias sem ofícios aparecem como zero.'">
        <OrdoTrendChart :points="daily" unit="ofícios" aria-label="Ofícios rezados no período" />
      </OrdoChartCard>
      <OrdoChartCard class="op-grow-1" eyebrow="Horas" title="Horas do ofício" description="Ofícios rezados por tipo, na ordem do dia." scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="officeItems(completions.by_office_type)" />
      </OrdoChartCard>
    </section>

    <section class="op-row">
      <OrdoChartCard class="op-grow-2" eyebrow="Horário" title="A que horas se reza" :description="`Ofícios por hora no relógio de cada pessoa. O pico é ${peakHour?.title.toLowerCase() || '—'}.`">
        <OrdoTrendChart :points="hours" variant="bars" unit="ofícios" :height="180" aria-label="Ofícios por hora do dia" />
      </OrdoChartCard>
      <OrdoChartCard class="op-grow-1" eyebrow="Livros de oração" title="Em uso no período" description="Ofícios rezados em cada livro." scope="period" :scope-label="shortPeriod">
        <OrdoBarList :items="books" :limit="7" :thickness="6" />
        <template v-if="dashboard.prayer_books?.unattributed_completions" #footer>
          <span>Sem livro registrado: <strong style="color: var(--op-ink)">{{ formatNumber(dashboard.prayer_books?.unattributed_completions) }}</strong> ofícios antigos.</span>
        </template>
      </OrdoChartCard>
    </section>

    <section class="op-grid" style="--op-min: 320px">
      <OrdoChartCard eyebrow="Comunidade" title="Quem mais rezou" scope="period" :scope-label="shortPeriod">
        <OrdoTopList :items="completers" empty-message="Ninguém rezou neste período." />
        <template #footer><span>Sem e-mail: só nome e número da conta.</span></template>
      </OrdoChartCard>
      <OrdoChartCard eyebrow="Diários" title="Quem mais escreveu" scope="period" :scope-label="shortPeriod">
        <OrdoTopList :items="writers" empty-message="Ninguém escreveu neste período." />
        <template v-if="entryItems.length" #footer>
          <span>Tipos de entrada: {{ entryItems.map(item => `${item.label} ${item.display}`).join(' · ') }}</span>
        </template>
      </OrdoChartCard>
    </section>

    <section class="op-grid" style="--op-min: 300px">
      <OrdoChartCard eyebrow="Compartilhamentos" title="Ofícios enviados a alguém" :description="`${formatNumber(shared?.total_in_period)} links, por ${formatNumber(shared?.unique_users_sharing)} pessoas.`">
        <OrdoBarList :items="sharedItems" :thickness="6" />
      </OrdoChartCard>
      <OrdoChartCard eyebrow="Favoritos" title="O que guardaram" :description="`${formatNumber(favorites?.created_in_period)} favoritos de ${formatNumber(favorites?.users_with_favorites)} pessoas.`">
        <OrdoBarList :items="favoriteItems" :limit="5" :thickness="6" />
      </OrdoChartCard>
      <OrdoChartCard eyebrow="Orações semanais" title="Pedidos que viram oração" :description="`${formatNumber(weekly?.weekly_prayer_users)} pessoas receberam orações geradas a partir de ${formatNumber(weekly?.prayer_requests_created)} pedidos.`">
        <OrdoBarList :items="languageItems" :limit="5" :thickness="6" empty-message="Nenhuma oração gerada no período." />
        <template #footer><span>Cada oração gerada é uma chamada à IA; o custo real não aparece aqui.</span></template>
      </OrdoChartCard>
    </section>
  </div>
</template>
