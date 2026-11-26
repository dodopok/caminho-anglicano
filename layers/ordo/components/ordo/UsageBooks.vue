<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { shareText, total } from '../../utils/usage'

// The books people pray with, against the window before, and how much of the
// next four weeks of each one already has narration (Áudio's stored
// coverage): a book that grows without a voice is a good next step.
const api = useUsageApi()
const { bookNames, previous } = useUsageContext()
const books = useWindowReport(range => api.breakdown(range, 'book'))
const booksPrevious = useWindowReport((_, before) => before ? api.breakdown(before, 'book') : Promise.resolve(null))
const coverage = useWindowReport(() => api.narrationCoverage())

const LIMIT = 6
const all = ref(false)
const rows = computed(() => {
  const list = (books.data?.rows || []).filter(row => row.value)
  const sum = total(list.map(row => row.count))
  const top = Math.max(...list.map(row => row.count), 1)
  const before = new Map<string | null, number>((booksPrevious.data?.rows || []).map(row => [row.value, row.count] as const))
  return list.map(row => ({
    code: row.value as string,
    name: bookNames.value[row.value as string] || (row.value as string),
    count: row.count,
    bar: row.count / top * 100,
    share: shareText(row.count, sum),
    delta: previous.value && booksPrevious.data ? comparePeriods(row.count, before.get(row.value) ?? 0) : null
  }))
})
const visible = computed(() => all.value ? rows.value : rows.value.slice(0, LIMIT))

const narration = (code: string) => {
  const book = coverage.data?.books?.find(item => item.prayer_book_code === code)
  const bible = book?.bibles?.find(item => item.default) || book?.bibles?.[0]
  const value = bible?.computed ? bible.totals?.percentage : null
  if (value === null || value === undefined) return null
  if (value >= 99.95) return { text: '100%', tone: 'op-pill--ok' }
  const text = `${Math.floor(value)}%`
  if (value >= 90) return { text, tone: 'op-pill--info' }
  if (value > 0) return { text, tone: 'op-pill--warn' }
  return { text: 'sem voz', tone: 'op-pill--danger' }
}
const fmt = (value: number) => value.toLocaleString('pt-BR')
</script>

<template>
  <OrdoChartCard :loading="books.loading && !books.data" eyebrow="Livro" title="Por livro de oração" description="Pedidos que levaram um livro, no período, com a mudança contra o anterior.">
    <template v-if="rows.length > LIMIT" #actions>
      <button type="button" class="op-link" @click="all = !all">{{ all ? 'Ver menos' : `Ver os ${rows.length}` }} <OrdoIcon :name="all ? 'chevron-up' : 'arrow'" :size="14" /></button>
    </template>
    <div v-if="rows.length" class="op-table-wrap">
      <table class="op-rank">
        <thead>
          <tr>
            <th><span class="op-sr-only">Posição</span></th>
            <th scope="col">Livro</th>
            <th scope="col" class="is-num">Pedidos</th>
            <th><span class="op-sr-only">Proporção</span></th>
            <th scope="col" class="is-num">Parte</th>
            <th scope="col" class="is-num">vs. anterior</th>
            <th scope="col">Narração <span v-if="coverage.soon" class="op-soon" title="A cobertura guardada do Áudio ainda não está na API">em breve</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in visible" :key="row.code">
            <td class="op-rank__n">{{ index + 1 }}</td>
            <td><span class="op-rank__name">{{ row.name }} <OrdoLocBadge :code="row.code !== row.name ? row.code : null" /></span></td>
            <td class="is-num"><strong>{{ fmt(row.count) }}</strong></td>
            <td class="op-rank__bar"><div class="op-track" style="height: 6px" aria-hidden="true"><span :style="{ width: `${Math.max(row.bar, 1)}%` }" /></div></td>
            <td class="is-num">{{ row.share }}</td>
            <td class="is-num"><OrdoDeltaChip v-if="row.delta" :delta="row.delta" /><span v-else class="op-faint">—</span></td>
            <td><span v-if="narration(row.code)" class="op-pill" :class="narration(row.code)!.tone">{{ narration(row.code)!.text }}</span><span v-else class="op-faint">—</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="op-empty">{{ errorText(books.error) || 'Nenhum livro registrado neste período.' }}</p>
    <template v-if="rows.length" #footer>
      <span>A coluna Narração vem da cobertura de Áudio (Bíblia padrão, próximas 4 semanas): um livro que cresce e não tem voz é um bom próximo passo.</span>
    </template>
  </OrdoChartCard>
</template>
