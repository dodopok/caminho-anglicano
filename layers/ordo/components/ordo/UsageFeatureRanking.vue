<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import OrdoSparkline from './Sparkline.vue'
import { useQueryParam } from '../../composables/usePortalQuery'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { compactNumber, dailyValues, daysBetween, movingAverage, rankFeatures, type RankedFeature } from '../../utils/usage'
import type { UsageSeriesPoint } from '../../types/usage'

// The features ranked by use, each with its bar, its trend over the window
// (a 7-day moving average, so Sundays do not saw the line), the change
// against the window before and its error rate. A row opens the feature.
const props = withDefaults(defineProps<{ limit?: number | null }>(), { limit: null })

const api = useUsageApi()
const { core, window, previous, reloadKey, open } = useUsageContext()
const measure = useQueryParam<'vezes' | 'pessoas'>('medida', 'vezes', ['vezes', 'pessoas'])

const all = computed(() => rankFeatures(core.top.data?.features || [], previous.value ? core.topPrevious.data?.features || null : null, measure.value))
const rows = computed(() => props.limit ? all.value.slice(0, props.limit) : all.value)
const days = computed(() => daysBetween(window.value.start_date, window.value.end_date))

const sparks = ref<Record<string, UsageSeriesPoint[]>>({})
let request = 0
const loadSparks = async () => {
  const features = rows.value.map(row => row.feature)
  const current = ++request
  try {
    const result = await api.featureSeries(window.value, features)
    if (current === request) sparks.value = result.series
  } catch {
    if (current === request) sparks.value = {}
  }
}
watch(() => [rows.value.map(row => row.feature).join(','), window.value.start_date, window.value.end_date, reloadKey.value], loadSparks, { immediate: true })

const sparkValues = (row: RankedFeature) => {
  const series = sparks.value[row.feature]
  if (!series) return []
  return movingAverage(dailyValues(series, window.value, point => measure.value === 'pessoas' ? point.users : point.count))
}
const delta = (row: RankedFeature) => row.previous === null ? null : comparePeriods(row.value, row.previous)
const sparkColor = (row: RankedFeature) => delta(row)?.tone === 'bad' ? 'var(--op-danger)' : 'var(--op-action)'
const errorRateText = (row: RankedFeature) => row.errorRate === null ? '—' : `${row.errorRate.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
const format = (value: number) => value.toLocaleString('pt-BR')
</script>

<template>
  <OrdoChartCard :loading="core.top.loading && !core.top.data" eyebrow="Recursos" title="O que mais se usa" description="Pedidos ao Ordo por recurso, com a tendência do período. Clique num recurso para abrir o detalhe.">
    <template #actions>
      <div class="op-seg op-seg--small" role="group" aria-label="Medida do ranking">
        <button type="button" :class="{ 'is-on': measure === 'vezes' }" :aria-pressed="measure === 'vezes'" @click="measure = 'vezes'">Vezes</button>
        <button type="button" :class="{ 'is-on': measure === 'pessoas' }" :aria-pressed="measure === 'pessoas'" @click="measure = 'pessoas'">Pessoas-dia</button>
      </div>
      <button v-if="limit && all.length > limit" type="button" class="op-link op-only-wide" @click="open('recursos')">Todos os {{ all.length }} <OrdoIcon name="arrow" :size="14" /></button>
    </template>

    <template v-if="rows.length">
      <div class="op-table-wrap op-only-wide">
        <table class="op-rank">
          <thead>
            <tr>
              <th><span class="op-sr-only">Posição</span></th>
              <th scope="col">Recurso</th>
              <th scope="col" class="is-num">Vezes</th>
              <th><span class="op-sr-only">Proporção</span></th>
              <th scope="col" class="is-num">Pessoas-dia</th>
              <th scope="col">Tendência · {{ days }} dias</th>
              <th scope="col" class="is-num">vs. anterior</th>
              <th scope="col" class="is-num">Erros</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="row.feature" class="is-link" @click="open('recursos', { recurso: row.feature })">
              <td class="op-rank__n">{{ index + 1 }}</td>
              <td>
                <button type="button" class="op-rank__name op-usage__row-link" @click.stop="open('recursos', { recurso: row.feature })">
                  <span class="op-ico"><OrdoIcon :name="row.icon" :size="16" /></span>{{ row.label }}
                </button>
              </td>
              <td class="is-num"><strong>{{ format(row.count) }}</strong></td>
              <td class="op-rank__bar"><div class="op-track" style="height: 6px" aria-hidden="true"><span :style="{ width: `${Math.max(row.bar, row.value ? 1 : 0)}%` }" /></div></td>
              <td class="is-num">{{ format(row.userDays) }}</td>
              <td class="op-rank__spark"><OrdoSparkline :values="sparkValues(row)" :color="sparkColor(row)" :height="26" /></td>
              <td class="is-num"><OrdoDeltaChip v-if="delta(row)" :delta="delta(row)!" /><span v-else class="op-faint">—</span></td>
              <td class="is-num" :class="(row.errorRate || 0) >= 1 ? 'op-usage__errors' : 'op-faint'">{{ errorRateText(row) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul class="op-usage__feats op-only-narrow">
        <li v-for="row in rows.slice(0, limit || rows.length)" :key="row.feature">
          <button type="button" @click="open('recursos', { recurso: row.feature })">
            <span><strong>{{ row.label }}</strong><small>{{ measure === 'pessoas' ? `${compactNumber(row.userDays)} pessoas-dia` : `${format(row.count)} vezes` }}</small></span>
            <OrdoSparkline :values="sparkValues(row)" :color="sparkColor(row)" :height="26" />
            <OrdoDeltaChip v-if="delta(row)" :delta="delta(row)!" />
          </button>
        </li>
      </ul>
    </template>
    <p v-else class="op-empty">{{ errorText(core.top.error) || 'Nenhum recurso usado no período.' }}</p>

    <template v-if="rows.length" #footer>
      <span class="op-only-wide">Pessoas-dia soma as pessoas de cada dia: quem usou em três dias conta três vezes.</span>
      <button v-if="limit && all.length > limit" type="button" class="op-link op-only-narrow" @click="open('recursos')">Todos os {{ all.length }} recursos <OrdoIcon name="arrow" :size="14" /></button>
    </template>
  </OrdoChartCard>
</template>
