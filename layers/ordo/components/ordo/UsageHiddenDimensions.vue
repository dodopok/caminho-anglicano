<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoUsageBars, { type UsageBar } from './UsageBars.vue'
import { useUsageApi } from '../../composables/useUsageApi'
import { useWindowReport } from '../../composables/useUsageContext'
import { officeMeta } from '../../utils/series'
import { shareText, total } from '../../utils/usage'
import type { UsageBreakdownResponse, UsageNewDimension } from '../../types/usage'

// Ordo+ or free, signed in or not, which office: the events carry them, the
// nightly rollup does not split them yet (PROPOSTA §2, item 3). Each one
// shows as soon as the API answers its dimension.
const api = useUsageApi()
const premium = useWindowReport(range => api.breakdown(range, 'premium'))
const loggedIn = useWindowReport(range => api.breakdown(range, 'logged_in'))
const officeType = useWindowReport(range => api.breakdown(range, 'office_type'))

const DIMENSIONS: Array<{ key: UsageNewDimension; title: string; label: (value: string) => string }> = [
  { key: 'premium', title: 'Ordo+ ou gratuito', label: value => value === 'premium' ? 'Ordo+' : value === 'free' ? 'Gratuito' : value },
  { key: 'logged_in', title: 'Com conta ou sem conta', label: value => value === 'logged_in' ? 'Com conta' : value === 'anonymous' ? 'Sem conta' : value },
  { key: 'office_type', title: 'Por ofício', label: value => officeMeta(value).label }
]
const reports = { premium, logged_in: loggedIn, office_type: officeType }

const bars = (response: UsageBreakdownResponse | null, label: (value: string) => string): UsageBar[] => {
  const rows = response?.rows || []
  const sum = total(rows.map(row => row.count))
  return rows.map(row => ({ key: row.value ?? '—', label: row.value ? label(row.value) : 'Não informado', value: row.count, share: shareText(row.count, sum), faint: !row.value }))
}
const available = computed(() => DIMENSIONS.filter(item => reports[item.key].data))
const settled = computed(() => DIMENSIONS.every(item => !reports[item.key].loading))
</script>

<template>
  <section v-if="settled && !available.length" class="op-card op-panel op-usage__proposed">
    <div class="op-between">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Ainda não dá para ver</p>
        <h3>Ordo+ ou gratuito · com conta ou sem conta · por ofício</h3>
        <p>Os eventos já guardam <code>premium</code>, <code>logged_in</code> e <code>office_type</code>, mas o resumo noturno não os separa.</p>
      </div>
      <span class="op-soon" title="Chegam quando a API separar estas dimensões">em breve</span>
    </div>
  </section>
  <section v-else-if="available.length" class="op-grid" style="--op-min: 300px">
    <OrdoChartCard v-for="item in DIMENSIONS" :key="item.key" eyebrow="Recorte" :title="item.title" :loading="reports[item.key].loading && !reports[item.key].data">
      <OrdoUsageBars v-if="reports[item.key].data" :items="bars(reports[item.key].data, item.label)" />
      <p v-else class="op-empty">Em breve: o resumo noturno ainda não separa esta dimensão.</p>
    </OrdoChartCard>
  </section>
</template>
