<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { eventLabel, featureEvents, featureLabel } from '../../utils/usage'
import type { UsageQuery } from '../../types/usage'

// The events inside one feature, with the window before. An API that filters
// `top` by feature answers exactly those; until then the portal keeps the
// list of each feature's events and says so.
const props = defineProps<{ feature: string }>()

const api = useUsageApi()
const { appEvents } = useUsageContext()
// The office's own events and the "prayed" ones the server records under
// `completion`, as the mockup lists them together.
const features = props.feature === 'office' ? ['office', 'completion'] : [props.feature]
const merge = async (range: UsageQuery) => {
  const answers = await Promise.all(features.map(feature => api.top(range, 100, feature)))
  const lists = answers.map((answer, index) => featureEvents(answer, features[index]))
  // An API that does not filter answers the same list twice: one row per event.
  const unique = new Map(lists.flatMap(list => list.events).map(row => [`${row.event}|${row.source}`, row]))
  return { events: [...unique.values()].sort((a, b) => b.count - a.count), filtered: lists.every(list => list.filtered) }
}
const top = useWindowReport(range => merge(range))
const topPrevious = useWindowReport((_, before) => before ? merge(before) : Promise.resolve(null))

const rows = computed(() => top.data || { events: [], filtered: true })
const before = computed(() => topPrevious.data?.events || null)
const delta = (event: string, source: string, count: number) => {
  if (!before.value) return null
  const was = before.value.find(item => item.event === event && item.source === source)
  return comparePeriods(count, was?.count ?? 0)
}
const SOURCES: Record<string, string> = { client: 'Cliente', domain: 'Servidor' }
const fmt = (value: number) => value.toLocaleString('pt-BR')
const title = computed(() => props.feature === 'office' ? 'O que acontece dentro do ofício' : `O que acontece em ${featureLabel(props.feature).toLowerCase()}`)
</script>

<template>
  <OrdoChartCard :loading="top.loading && !top.data" eyebrow="Eventos deste recurso" :title="title" description="Ações vindas do app e da web; a API não vê sozinha.">
    <div v-if="rows.events.length" class="op-table-wrap">
      <table class="op-table">
        <thead>
          <tr>
            <th scope="col">Evento</th>
            <th scope="col">Origem</th>
            <th scope="col" class="is-num">Vezes</th>
            <th scope="col" class="is-num">Pessoas-dia</th>
            <th scope="col" class="is-num">vs. ant.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows.events" :key="`${row.event}-${row.source}`">
            <th scope="row">{{ eventLabel(row.event) }} <small class="op-faint op-mono">{{ row.event }}</small></th>
            <td>{{ SOURCES[row.source] || row.source }}</td>
            <td class="is-num">{{ fmt(row.count) }}</td>
            <td class="is-num">{{ fmt(row.user_days) }}</td>
            <td class="is-num"><OrdoDeltaChip v-if="delta(row.event, row.source, row.count)" :delta="delta(row.event, row.source, row.count)!" /><span v-else class="op-faint">—</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="op-empty">{{ errorText(top.error) || 'Nenhum evento deste recurso no período.' }}</p>
    <template #footer>
      <span>
        <template v-if="!appEvents">Eventos de cliente vêm hoje só da web; os do app chegam com a versão 1.46.</template>
        <template v-if="!rows.filtered"> Lista de eventos de cada recurso mantida no portal até a API filtrar por recurso.</template>
      </span>
      <span v-if="!rows.filtered" class="op-soon" title="A API ainda não filtra os eventos por recurso">filtro na API em breve</span>
    </template>
  </OrdoChartCard>
</template>
