<script setup lang="ts">
import OrdoBarList, { type BarListItem } from './BarList.vue'
import OrdoChartCard from './ChartCard.vue'
import OrdoIcon from './Icon.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoTrendChart from './TrendChart.vue'
import OrdoUsageFunnel from './UsageFunnel.vue'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { useQueryParam } from '../../composables/usePortalQuery'
import { buildSeries } from '../../utils/series'
import type { PeriodValue } from '../../utils/period'
import {
  clientLabel,
  eventLabel,
  featureLabel,
  FEATURES,
  groupContent,
  latestActiveDay,
  platformLabel,
  SOURCE_LABELS,
  usagePeriod
} from '../../utils/usage'
import { isSessionError, OrdoApiError } from '../../types/dashboard'
import type {
  UsageActiveUsersResponse,
  UsageBreakdownResponse,
  UsageContentResponse,
  UsageDimension,
  UsageFunnelsResponse,
  UsageSeriesResponse,
  UsageTopResponse
} from '../../types/usage'

// The "Uso" tab: the first-party usage telemetry (estevao-api
// docs/USAGE_TELEMETRY.md), read from GET /api/v1/admin/usage/*. Unlike the
// other reading tabs it does not use /dashboard: it reads its own reports,
// each one on its own, so one failing report costs one card, not the tab.
const props = defineProps<{
  period: PeriodValue
  monthly: boolean
  /** Bumped by the page's refresh button. */
  reloadKey: number
}>()

const api = useOrdoApi()
const { formatNumber, formatPercent, formatDate, languageLabel } = useOrdoDashboardPresentation()

// Where the operator is, in the URL: ?aba=uso&serie=office&medida=pessoas&ativos=semana
const seriesFeature = useQueryParam<string>('serie', '', ['', ...FEATURES])
const seriesMeasure = useQueryParam<'vezes' | 'pessoas'>('medida', 'vezes', ['vezes', 'pessoas'])
const activeWindow = useQueryParam<'dia' | 'semana' | 'mes'>('ativos', 'dia', ['dia', 'semana', 'mes'])

const range = computed(() => usagePeriod(props.period))
const apiRange = () => ({ start_date: range.value.start_date, end_date: range.value.end_date })
const rangeKey = computed(() => `${range.value.start_date}|${range.value.end_date}`)

// One slot per report: its answer, its error and whether it is on its way.
interface Slot<T> { data: T | null; error: unknown; loading: boolean }
function slot<T> (): Slot<T> {
  return reactive({ data: null, error: null, loading: true }) as Slot<T>
}

const BREAKDOWNS: Array<{ dimension: UsageDimension; title: string; description: string }> = [
  { dimension: 'client', title: 'Por cliente', description: 'Quem fez o pedido: app, web, widget, aparelho, chave de API…' },
  { dimension: 'platform', title: 'Por plataforma', description: 'iOS, Android e a web no computador ou no celular.' },
  { dimension: 'book', title: 'Por livro de oração', description: 'O livro em uso no pedido ou no evento.' },
  { dimension: 'language', title: 'Por idioma', description: 'O idioma da interface de quem usou.' },
  { dimension: 'app_version', title: 'Por versão do app', description: 'Versão do app ou da web que fez o pedido.' }
]

const top = slot<UsageTopResponse>()
const active = slot<UsageActiveUsersResponse>()
const funnels = slot<UsageFunnelsResponse>()
const content = slot<UsageContentResponse>()
const series = slot<UsageSeriesResponse>()
const breakdowns = Object.fromEntries(BREAKDOWNS.map(item => [item.dimension, slot<UsageBreakdownResponse>()])) as Record<UsageDimension, Slot<UsageBreakdownResponse>>
const bookNames = ref<Record<string, string>>({})

let generation = 0
async function fill<T> (target: Slot<T>, read: () => Promise<T>, requestGeneration: number) {
  target.loading = true
  target.error = null
  try {
    const data = await read()
    if (requestGeneration !== generation) return
    target.data = data
  } catch (error) {
    if (requestGeneration !== generation) return
    target.data = null
    target.error = error
  } finally {
    if (requestGeneration === generation) target.loading = false
  }
}

let seriesGeneration = 0
const loadSeries = async () => {
  const requestGeneration = ++seriesGeneration
  series.loading = true
  series.error = null
  try {
    const data = await api.fetchUsageSeries(apiRange(), seriesFeature.value ? { feature: seriesFeature.value } : {})
    if (requestGeneration !== seriesGeneration) return
    series.data = data
  } catch (error) {
    if (requestGeneration !== seriesGeneration) return
    series.data = null
    series.error = error
  } finally {
    if (requestGeneration === seriesGeneration) series.loading = false
  }
}

const loadBookNames = async () => {
  if (Object.keys(bookNames.value).length) return
  try {
    const response = await api.fetchAudioPrayerBooks()
    bookNames.value = Object.fromEntries((response.data || []).map(book => [book.code, book.name]))
  } catch {
    // Without the names the codes still identify the books.
  }
}

const load = () => {
  const requestGeneration = ++generation
  const period = apiRange()
  loadBookNames()
  loadSeries()
  return Promise.all([
    fill(top, () => api.fetchUsageTop(period, 20), requestGeneration),
    fill(active, () => api.fetchUsageActiveUsers(period), requestGeneration),
    fill(funnels, () => api.fetchUsageFunnels(period), requestGeneration),
    fill(content, () => api.fetchUsageContent(period, 100), requestGeneration),
    ...BREAKDOWNS.map(({ dimension }) => fill(breakdowns[dimension], () => api.fetchUsageBreakdown(period, dimension), requestGeneration))
  ])
}

watch(rangeKey, () => load())
watch(() => props.reloadKey, () => load())
watch(seriesFeature, () => loadSeries())
onMounted(() => load())

// --- Errors -----------------------------------------------------------------

const slots = computed(() => [top, active, funnels, content, series, ...Object.values(breakdowns)])
const status = (error: unknown) => error instanceof OrdoApiError ? error.status : 0

const errorText = (error: unknown) => {
  if (!error || isSessionError(error)) return null
  const code = status(error)
  if (code === 404) return 'Esta API ainda não tem o painel de uso.'
  if (code === 403) return 'Sua conta não tem acesso de administrador.'
  if (error instanceof Error && error.message) return error.message
  return 'Não foi possível ler este relatório.'
}

// Every report failed the same way: one clear screen instead of twelve
// broken cards. A 404 means the API in use does not have the reports yet.
const settled = computed(() => slots.value.every(item => !item.loading))
const allFailed = computed(() => settled.value && slots.value.every(item => item.error && !isSessionError(item.error)))
const notDeployed = computed(() => allFailed.value && slots.value.every(item => status(item.error) === 404))

// --- People -----------------------------------------------------------------

const latest = computed(() => latestActiveDay(active.data?.series || []))
const latestLabel = computed(() => latest.value ? `em ${formatDate(latest.value.date)}` : 'sem dados no período')

const WINDOW_KEY = { dia: 'dau', semana: 'wau', mes: 'mau' } as const
const WINDOW_TITLE = { dia: 'Pessoas ativas no dia', semana: 'Pessoas ativas em 7 dias', mes: 'Pessoas ativas em 30 dias' }

const activePoints = computed(() => buildSeries(
  (active.data?.series || []).map(point => ({ date: point.date, value: point[WINDOW_KEY[activeWindow.value]] })),
  range.value.start_date,
  range.value.end_date,
  { monthly: props.monthly, average: true }
))

const clientRows = computed(() => {
  const point = latest.value
  if (!point) return []
  const rows = Object.entries(point.by_client || {})
    .map(([client, windows]) => ({ key: client, label: clientLabel(client), ...windows }))
    .sort((a, b) => b.mau - a.mau)
  return [...rows, { key: 'app_and_web', label: 'App e web', ...point.app_and_web }]
})

// --- What is used -------------------------------------------------------------

const seriesPoints = computed(() => buildSeries(
  (series.data?.series || []).map(point => ({ date: point.date, value: seriesMeasure.value === 'pessoas' ? point.users : point.count })),
  range.value.start_date,
  range.value.end_date,
  // People are distinct per day: a month shows the daily average, not a sum.
  { monthly: props.monthly, average: seriesMeasure.value === 'pessoas' }
))
const seriesTotal = computed(() => (series.data?.series || []).reduce((sum, point) => sum + (point.count || 0), 0))
const seriesTitle = computed(() => seriesFeature.value ? featureLabel(seriesFeature.value) : 'Tudo')
const seriesUnit = computed(() => seriesMeasure.value === 'pessoas' ? 'pessoas' : 'vezes')

const showSeries = (feature: string) => {
  seriesFeature.value = feature
}

const share = (value: number, total: number) => total ? formatPercent(Math.round(value / total * 1000) / 10) : undefined

const breakdownItems = (dimension: UsageDimension): BarListItem[] => {
  const rows = breakdowns[dimension].data?.rows || []
  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0)
  return rows.map(row => {
    const value = row.value
    let label = value || 'Não informado'
    let code: string | null = null
    if (value && dimension === 'client') label = clientLabel(value)
    if (value && dimension === 'platform') label = platformLabel(value)
    if (value && dimension === 'language') label = languageLabel(value)
    if (value && dimension === 'book') {
      label = bookNames.value[value] || value
      code = bookNames.value[value] ? value : null
    }
    return {
      key: value ?? '—',
      label,
      code,
      value: row.count,
      display: formatNumber(row.count),
      share: share(row.count, total),
      hint: dimension === 'language' && value ? value : undefined
    }
  })
}

const counters = computed(() => (top.data?.counters || []).slice(0, 8))

// --- Content ----------------------------------------------------------------

const contentGroups = computed(() => groupContent(content.data?.rows || []))
const CONTENT_CARDS = [
  { key: 'saints', title: 'Santos e datas', description: 'Santos, comemorações e tempos litúrgicos abertos (slug do CMS).', empty: 'Nenhum santo aberto no período.' },
  { key: 'documents', title: 'Documentos', description: 'Documentos dos livros de oração abertos.', empty: 'Nenhum documento aberto no período.' },
  { key: 'posts', title: 'Artigos', description: 'Posts do CMS abertos no app e na web.', empty: 'Nenhum artigo aberto no período.' }
] as const
const contentItems = (key: 'saints' | 'documents' | 'posts' | 'rosaries'): BarListItem[] => contentGroups.value[key].map(item => ({
  key: item.slug,
  label: item.slug,
  value: item.count,
  display: formatNumber(item.count),
  hint: `${formatNumber(item.userDays)} pessoas-dia`
}))
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 26px">
    <section v-if="notDeployed" class="op-state">
      <h2>O painel de uso ainda não está nesta API</h2>
      <p>As rotas <code>/api/v1/admin/usage/…</code> responderam 404. Elas chegam com a telemetria própria do Ordo (estevao-api #353 e #354); depois do deploy, os números aparecem aqui na madrugada seguinte.</p>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </section>

    <section v-else-if="allFailed" class="op-state op-state--error" role="alert">
      <h2>Não foi possível ler o uso</h2>
      <p>{{ errorText(top.error) }}</p>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </section>

    <template v-else>
      <div class="op-inline-note">
        <OrdoIcon name="info" :size="18" style="flex: 0 0 auto; margin-top: 1px; color: var(--op-action)" />
        <span>
          Telemetria própria do app e da web, lida dos resumos diários: cada dia fecha na madrugada seguinte, então hoje ainda aparece zerado.
          Quem ativou “Não enviar estatísticas de uso” não entra em nenhum número.
          <template v-if="range.clamped"><br><strong>O uso cobre no máximo 366 dias: mostrando de {{ formatDate(range.start_date) }} a {{ formatDate(range.end_date) }}.</strong></template>
        </span>
      </div>

      <section class="op-grid" style="--op-min: 220px" aria-label="Pessoas ativas">
        <OrdoMetricCard :loading="active.loading" title="Pessoas no dia" :value="formatNumber(latest?.dau)" scope="window" :scope-label="latestLabel" subtitle="ativas no último dia fechado (DAU)" />
        <OrdoMetricCard :loading="active.loading" title="Pessoas em 7 dias" :value="formatNumber(latest?.wau)" scope="window" :scope-label="latestLabel" subtitle="ativas nos 7 dias até esse dia (WAU)" />
        <OrdoMetricCard :loading="active.loading" title="Pessoas em 30 dias" :value="formatNumber(latest?.mau)" scope="window" :scope-label="latestLabel" subtitle="ativas nos 30 dias até esse dia (MAU)" />
        <OrdoMetricCard :loading="active.loading" title="No app e na web" :value="formatNumber(latest?.app_and_web?.mau)" scope="window" :scope-label="latestLabel" :subtitle="`em 30 dias · ${formatNumber(latest?.app_and_web?.wau)} em 7 · ${formatNumber(latest?.app_and_web?.dau)} no dia`" />
      </section>
      <p v-if="active.error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ errorText(active.error) }}</p>

      <section class="op-row">
        <OrdoChartCard :loading="active.loading" :skeleton-height="240" class="op-grow-2" eyebrow="Pessoas" :title="WINDOW_TITLE[activeWindow]" :description="monthly ? 'Média diária de cada mês.' : 'Cada ponto conta pessoas distintas na janela que termina naquele dia. Widgets, aparelhos e tarefas do servidor não contam.'">
          <template #actions>
            <div class="op-seg op-seg--small" role="group" aria-label="Janela de pessoas ativas">
              <button type="button" :class="{ 'is-on': activeWindow === 'dia' }" :aria-pressed="activeWindow === 'dia'" @click="activeWindow = 'dia'">Dia</button>
              <button type="button" :class="{ 'is-on': activeWindow === 'semana' }" :aria-pressed="activeWindow === 'semana'" @click="activeWindow = 'semana'">7 dias</button>
              <button type="button" :class="{ 'is-on': activeWindow === 'mes' }" :aria-pressed="activeWindow === 'mes'" @click="activeWindow = 'mes'">30 dias</button>
            </div>
          </template>
          <OrdoTrendChart v-if="latest" :points="activePoints" unit="pessoas" aria-label="Pessoas ativas no período" />
          <p v-else class="op-empty">{{ errorText(active.error) || 'Nenhuma pessoa ativa registrada no período.' }}</p>
        </OrdoChartCard>
        <OrdoChartCard :loading="active.loading" class="op-grow-1" eyebrow="Onde" title="Pessoas por cliente" :description="latest ? `No último dia fechado, ${formatDate(latest.date)}.` : undefined">
          <div v-if="clientRows.length" class="op-table-wrap">
            <table class="op-table">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col" class="is-num">Dia</th>
                  <th scope="col" class="is-num">7 dias</th>
                  <th scope="col" class="is-num">30 dias</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in clientRows" :key="row.key">
                  <th scope="row">{{ row.label }}</th>
                  <td class="is-num">{{ formatNumber(row.dau) }}</td>
                  <td class="is-num">{{ formatNumber(row.wau) }}</td>
                  <td class="is-num">{{ formatNumber(row.mau) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="op-empty">Nada registrado neste período.</p>
          <template v-if="clientRows.length" #footer><span>“App e web” é quem apareceu nos dois; uma instalação ligada a uma conta conta como a conta.</span></template>
        </OrdoChartCard>
      </section>

      <section class="op-row">
        <OrdoChartCard :loading="top.loading" class="op-grow-1" eyebrow="Recursos" title="Mais usados" description="Pedidos à API por recurso. Toque num recurso para ver a série dele.">
          <div v-if="top.data?.features.length" class="op-table-wrap">
            <table class="op-table">
              <thead>
                <tr>
                  <th scope="col">Recurso</th>
                  <th scope="col" class="is-num">Vezes</th>
                  <th scope="col" class="is-num">Erros</th>
                  <th scope="col" class="is-num">Pessoas-dia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in top.data.features" :key="row.feature">
                  <th scope="row"><button type="button" class="op-link" :aria-pressed="seriesFeature === row.feature" @click="showSeries(row.feature)">{{ featureLabel(row.feature) }}</button></th>
                  <td class="is-num">{{ formatNumber(row.count) }}</td>
                  <td class="is-num">{{ row.errors ? formatNumber(row.errors) : '—' }}</td>
                  <td class="is-num">{{ formatNumber(row.user_days) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="op-empty">{{ errorText(top.error) || 'Nenhum recurso usado no período.' }}</p>
          <template v-if="top.data?.features.length" #footer><span>Pessoas-dia soma as pessoas de cada dia: quem usou em três dias conta três vezes.</span></template>
        </OrdoChartCard>
        <OrdoChartCard :loading="series.loading && !series.data" :skeleton-height="240" class="op-grow-2" eyebrow="Série diária" :title="seriesTitle" :description="seriesFeature ? `Pedidos de ${featureLabel(seriesFeature).toLowerCase()} e as pessoas distintas de cada dia.` : 'Todos os pedidos e eventos; em pessoas, é o DAU.'">
          <template #actions>
            <select v-model="seriesFeature" class="op-field" aria-label="Recurso da série" style="width: auto; min-height: 34px">
              <option value="">Tudo</option>
              <option v-for="feature in FEATURES" :key="feature" :value="feature">{{ featureLabel(feature) }}</option>
            </select>
            <div class="op-seg op-seg--small" role="group" aria-label="Medida da série">
              <button type="button" :class="{ 'is-on': seriesMeasure === 'vezes' }" :aria-pressed="seriesMeasure === 'vezes'" @click="seriesMeasure = 'vezes'">Vezes</button>
              <button type="button" :class="{ 'is-on': seriesMeasure === 'pessoas' }" :aria-pressed="seriesMeasure === 'pessoas'" @click="seriesMeasure = 'pessoas'">Pessoas</button>
            </div>
          </template>
          <OrdoTrendChart v-if="seriesTotal" :points="seriesPoints" :unit="seriesUnit" :aria-label="`Série diária: ${seriesTitle}`" />
          <p v-else class="op-empty">{{ errorText(series.error) || 'Nada registrado neste período.' }}</p>
        </OrdoChartCard>
      </section>

      <OrdoChartCard :loading="top.loading" eyebrow="Eventos" title="Eventos mais frequentes" description="Ações que a API não vê sozinha (vindas do app e da web) e eventos do próprio servidor.">
        <div v-if="top.data?.events.length" class="op-table-wrap">
          <table class="op-table">
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Origem</th>
                <th scope="col" class="is-num">Vezes</th>
                <th scope="col" class="is-num">Pessoas-dia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in top.data.events" :key="`${row.event}-${row.source}`">
                <th scope="row">{{ eventLabel(row.event) }} <small class="op-faint" style="font-weight: 500">{{ row.event }}</small></th>
                <td>{{ SOURCE_LABELS[row.source] || row.source }}</td>
                <td class="is-num">{{ formatNumber(row.count) }}</td>
                <td class="is-num">{{ formatNumber(row.user_days) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="op-empty">{{ errorText(top.error) || 'Nenhum evento no período.' }}</p>
        <template v-if="counters.length" #footer>
          <span>Rotas consultadas em intervalos (contadas sem uma linha por pedido):
            {{ counters.map(item => `${featureLabel(item.feature)}${item.action ? ` · ${item.action}` : ''} (${clientLabel(item.client)}) ${formatNumber(item.count)}`).join(' · ') }}
          </span>
        </template>
      </OrdoChartCard>

      <section aria-label="Funis" style="display: flex; flex-direction: column; gap: 14px">
        <span v-if="funnels.loading" class="op-skeleton" style="height: 220px; border-radius: 20px" aria-hidden="true" />
        <p v-else-if="funnels.error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Funis: {{ errorText(funnels.error) }}</p>
        <div v-else class="op-grid" style="--op-min: 300px">
          <OrdoUsageFunnel v-for="funnel in funnels.data?.funnels || []" :key="funnel.key" :funnel="funnel" :raw-window="funnels.data?.raw_window ?? null" />
        </div>
      </section>

      <section class="op-grid" style="--op-min: 300px" aria-label="Recortes">
        <OrdoChartCard v-for="item in BREAKDOWNS" :key="item.dimension" :loading="breakdowns[item.dimension].loading" eyebrow="Recorte" :title="item.title" :description="item.description">
          <OrdoBarList :items="breakdownItems(item.dimension)" :limit="8" :thickness="6" :empty-message="errorText(breakdowns[item.dimension].error) || 'Nada registrado neste período.'" />
        </OrdoChartCard>
      </section>

      <section class="op-grid" style="--op-min: 300px" aria-label="Conteúdo mais aberto">
        <OrdoChartCard v-for="card in CONTENT_CARDS" :key="card.key" :loading="content.loading" eyebrow="Conteúdo" :title="card.title" :description="card.description">
          <OrdoBarList :items="contentItems(card.key)" :limit="10" :thickness="6" :empty-message="errorText(content.error) || card.empty" />
        </OrdoChartCard>
        <OrdoChartCard v-if="contentGroups.rosaries.length" :loading="content.loading" eyebrow="Conteúdo" title="Rosários do catálogo" description="Rosários do catálogo começados.">
          <OrdoBarList :items="contentItems('rosaries')" :limit="10" :thickness="6" />
        </OrdoChartCard>
      </section>
    </template>
  </div>
</template>
