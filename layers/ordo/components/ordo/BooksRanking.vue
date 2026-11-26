<script setup lang="ts">
import OrdoBookCover from './BookCover.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoSoonState from './SoonState.vue'
import OrdoSparkline from './Sparkline.vue'
import { comparePeriods } from '../../utils/compare'
import {
  chartLines,
  COMPARE_METRICS,
  formatCount,
  formatPerPerson,
  formatRate,
  MAX_COMPARED,
  narrationPill,
  prayingShare,
  RANKING_SORT_LABELS,
  RANKING_SORTS,
  type BookRow,
  type CompareMetric,
  type RankingSort
} from '../../utils/books'

export interface CompareLine {
  code: string
  label: string
  values: Array<number | null>
}

// Parte de quem reza, the books side by side day by day, and every book in
// one table (a list on phones) that sorts by any number.
const props = defineProps<{
  rows: BookRow[]
  sort: RankingSort
  compare: string[]
  compareLines: CompareLine[]
  compareDates: string[]
  /** 'soon': the API has no per-book series yet. */
  compareState: 'soon' | 'loading' | 'ready' | 'error'
  metric: CompareMetric
  indexed: boolean
  perBook: boolean
  previousLabel: string
  hrefFor: (code: string) => string
}>()

const emit = defineEmits<{
  open: [code: string]
  sort: [sort: RankingSort]
  toggle: [code: string]
  metric: [metric: CompareMetric]
  indexed: [value: boolean]
  export: []
}>()

const METRIC_LABELS: Record<CompareMetric, string> = { pessoas: 'Pessoas', oficios: 'Ofícios', chegadas: 'Chegadas' }
const METRIC_WORDS: Record<CompareMetric, string> = { pessoas: 'Pessoas que rezaram por dia.', oficios: 'Ofícios rezados por dia.', chegadas: 'Contas novas por dia, pelo livro do primeiro acesso.' }

const share = computed(() => prayingShare(props.rows))
const shareHeadline = computed(() => {
  const rows = share.value
  if (!rows) return ''
  const top = rows.filter(row => row.code)
  const total = top.reduce((sum, row) => sum + row.share, 0)
  const words = ['Um livro reúne', 'Dois livros reúnem', 'Três livros reúnem', 'Quatro livros reúnem', 'Cinco livros reúnem']
  return `${words[top.length - 1] || `${top.length} livros reúnem`} ${formatRate(total)} de quem reza`
})

const chart = computed(() => chartLines(props.compareLines, { index: props.indexed }))
const yTicks = computed(() => {
  const max = chart.value.max
  return [1, 2 / 3, 1 / 3, 0].map(fraction => ({ top: `${(1 - fraction) * 96 + 4}%`, label: props.indexed ? Math.round(max * fraction).toLocaleString('pt-BR') : compact(max * fraction) }))
})
const compact = (value: number) => value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(value).toLocaleString('pt-BR')
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const xTicks = computed(() => {
  const dates = props.compareDates
  if (dates.length < 2) return []
  const picks = [0, 0.25, 0.5, 0.75, 1].map(fraction => Math.round(fraction * (dates.length - 1)))
  return [...new Set(picks)].map((index, position, all) => {
    const date = new Date(`${dates[index]}T12:00:00`)
    const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`
    const left = index / (dates.length - 1) * 100
    return { key: dates[index], label, style: position === all.length - 1 ? { right: '0' } : position === 0 ? { left: '0' } : { left: `${left}%`, transform: 'translateX(-50%)' } }
  })
})
const lineColor = (code: string) => chart.value.lines.find(line => line.code === code)?.color || 'var(--op-ink-faint)'
const labelOf = (code: string) => props.rows.find(row => row.code === code)?.label || props.compareLines.find(line => line.code === code)?.label || code

const showAll = ref(false)
const WIDE = 14
const NARROW = 10
const wideRows = computed(() => showAll.value ? props.rows : props.rows.slice(0, WIDE))
const narrowRows = computed(() => showAll.value ? props.rows : props.rows.slice(0, NARROW))

const SORTABLE: Array<{ sort: RankingSort; label: string }> = [
  { sort: 'usam', label: 'Usam hoje' },
  { sort: 'chegaram', label: 'Chegaram' },
  { sort: 'rezaram', label: 'Rezaram' },
  { sort: 'oficios', label: 'Ofícios / pessoa' },
  { sort: 'retorno', label: 'Voltam em 7 dias' }
]
const SORT_COLUMNS = SORTABLE.map(item => item.sort)
const header = (sort: RankingSort) => SORTABLE.find(item => item.sort === sort)
const delta = (row: BookRow) => comparePeriods(row.newUsers, row.newUsersPrevious)
const isCompared = (code: string) => props.compare.includes(code)
const full = computed(() => props.compare.length >= MAX_COMPARED)

const pickSort = (event: Event) => emit('sort', (event.target as HTMLSelectElement).value as RankingSort)
const openRow = (event: MouseEvent, code: string) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  emit('open', code)
}
const narrationText = (row: BookRow) => narrationPill(row.narration).text.toLowerCase()
</script>

<template>
  <section class="op-card op-panel" aria-labelledby="livros-parte">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Parte de quem reza</p>
        <h2 id="livros-parte">{{ share ? shareHeadline : 'Quem reza com cada livro' }}</h2>
        <p>Pessoas que rezaram no período, por livro. Quem rezou em dois livros conta nos dois.</p>
      </div>
    </div>
    <template v-if="share">
      <div class="op-split op-split--tall" aria-hidden="true">
        <span v-for="row in share" :key="row.label" :style="{ width: `${row.share}%`, background: row.color }">{{ row.share > 7 ? formatRate(row.share) : '' }}</span>
      </div>
      <div class="op-legend">
        <span v-for="row in share" :key="row.label"><i class="op-swatch" :style="{ background: row.color }" />{{ row.label }} <OrdoLocBadge v-if="row.code" :code="row.code" /> {{ formatRate(row.share) }}</span>
      </div>
    </template>
    <OrdoSoonState v-else-if="!perBook" title="Em breve" text="Pessoas que rezaram por livro aparecem aqui quando a API contar quem reza com cada livro." />
    <p v-else class="op-empty">Ninguém rezou com estes livros no período.</p>
  </section>

  <section class="op-card op-panel" aria-labelledby="livros-comparar">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Comparar</p>
        <h2 id="livros-comparar">Lado a lado, dia a dia</h2>
        <p>Escolha até {{ MAX_COMPARED }} livros na tabela abaixo. {{ METRIC_WORDS[metric] }}</p>
      </div>
      <div class="op-seg op-seg--small" role="group" aria-label="O que comparar">
        <button v-for="item in COMPARE_METRICS" :key="item" type="button" :class="{ 'is-on': metric === item }" :aria-pressed="metric === item" @click="emit('metric', item)">{{ METRIC_LABELS[item] }}</button>
      </div>
    </div>
    <OrdoSoonState v-if="compareState === 'soon'" title="Em breve" text="A série diária de cada livro chega com a API nova." />
    <template v-else>
      <div class="op-between">
        <div class="op-flex">
          <button v-for="code in compare" :key="code" type="button" class="op-chip op-compare__chip" :aria-label="`Tirar ${labelOf(code)} da comparação`" @click="emit('toggle', code)">
            <i class="op-swatch" :style="{ background: lineColor(code) }" />{{ labelOf(code) }} <OrdoLocBadge :code="code" /><OrdoIcon name="close" :size="13" />
          </button>
          <span v-if="!compare.length" class="op-faint" style="font-size: 13px">Marque livros na tabela.</span>
        </div>
        <div class="op-seg op-seg--small" role="group" aria-label="Escala">
          <button type="button" :class="{ 'is-on': !indexed }" :aria-pressed="!indexed" @click="emit('indexed', false)">Números</button>
          <button type="button" :class="{ 'is-on': indexed }" :aria-pressed="indexed" @click="emit('indexed', true)">Índice (1º dia = 100)</button>
        </div>
      </div>
      <div v-if="compareState === 'loading'" class="op-skeleton" style="height: 240px; border-radius: 14px" aria-hidden="true" />
      <p v-else-if="compareState === 'error'" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Não foi possível ler a série de algum livro.</p>
      <div v-else-if="compareLines.length" class="op-chart" role="img" :aria-label="`${METRIC_LABELS[metric]} por dia: ${compareLines.map(line => line.label).join(', ')}`">
        <div class="op-chart__y" style="height: 220px"><span v-for="tick in yTicks" :key="tick.top" :style="{ top: tick.top }">{{ tick.label }}</span></div>
        <div class="op-chart__plot-wrap">
          <div class="op-chart__plot" style="height: 220px">
            <div v-for="tick in yTicks" :key="tick.top" class="op-chart__grid" :class="{ 'is-base': tick.top === '100%' }" :style="{ top: tick.top }" />
            <svg class="op-chart__svg" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
              <path v-for="line in chart.lines" :key="line.code" :d="line.path" fill="none" :stroke="line.color" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="op-chart__x"><span v-for="tick in xTicks" :key="tick.key" :style="tick.style">{{ tick.label }}</span></div>
        </div>
      </div>
    </template>
  </section>

  <section class="op-card op-panel" aria-labelledby="livros-ranking">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Ranking</p>
        <h2 id="livros-ranking">Todos os livros</h2>
        <p>Ordene por qualquer número e marque até {{ MAX_COMPARED }} livros para comparar no gráfico.</p>
      </div>
      <button type="button" class="op-btn op-btn--small" :disabled="!rows.length" @click="emit('export')"><OrdoIcon name="table" :size="15" />Exportar CSV</button>
    </div>

    <p v-if="!rows.length" class="op-empty"><OrdoIcon name="search" :size="18" />Nenhum livro com esses filtros.</p>
    <template v-else>
      <div class="op-flex op-only-narrow">
        <select class="op-field" style="flex: 1" aria-label="Ordenar" :value="sort" @change="pickSort">
          <option v-for="item in RANKING_SORTS" :key="item" :value="item">Ordenar: {{ RANKING_SORT_LABELS[item] }}</option>
        </select>
      </div>
      <ul class="op-rlist op-only-narrow">
        <li v-for="(row, index) in narrowRows" :key="row.code">
          <a :href="hrefFor(row.code)" @click="openRow($event, row.code)">
            <span class="op-rank__n">{{ index + 1 }}</span>
            <OrdoBookCover :src="row.cover" :name="row.name" mini decorative />
            <span class="op-rlist__copy">
              <strong>{{ row.label }}</strong>
              <span><OrdoLocBadge :code="row.code" /></span>
              <small>{{ formatCount(row.usingToday) }} usam hoje · +{{ formatCount(row.newUsers) }} novas<template v-if="delta(row)"> ({{ delta(row)?.text }})</template> · {{ narrationText(row) }}</small>
            </span>
            <span class="op-rlist__value">{{ formatCount(row.praying ?? row.usingToday) }}<small>{{ row.praying !== null ? 'rezaram' : 'usam hoje' }}</small></span>
          </a>
        </li>
      </ul>

      <div class="op-table-wrap op-only-wide">
        <table class="op-rank">
          <thead>
            <tr>
              <th><span class="op-sr-only">Comparar</span></th>
              <th><span class="op-sr-only">Posição</span></th>
              <th scope="col"><button type="button" class="op-rank__sort" :class="{ 'is-on': sort === 'nome' }" @click="emit('sort', 'nome')">Livro{{ sort === 'nome' ? ' ↓' : '' }}</button></th>
              <th scope="col">Idioma</th>
              <th v-for="item in SORT_COLUMNS" :key="item" scope="col" class="is-num" :aria-sort="sort === item ? 'descending' : undefined">
                <button type="button" class="op-rank__sort" :class="{ 'is-on': sort === item }" @click="emit('sort', item)">{{ header(item)?.label }}{{ sort === item ? ' ↓' : '' }}</button>
              </th>
              <th scope="col">Tendência</th>
              <th scope="col" :aria-sort="sort === 'voz' ? 'ascending' : undefined"><button type="button" class="op-rank__sort" :class="{ 'is-on': sort === 'voz' }" @click="emit('sort', 'voz')">Voz{{ sort === 'voz' ? ' ↑' : '' }}</button></th>
              <th scope="col">PDF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in wideRows" :key="row.code" class="is-link" :class="{ 'is-selected': isCompared(row.code) }" @click="emit('open', row.code)">
              <td @click.stop>
                <input type="checkbox" :checked="isCompared(row.code)" :disabled="!isCompared(row.code) && full" :aria-label="`Comparar ${row.label}`" @change="emit('toggle', row.code)">
              </td>
              <td class="op-rank__n">{{ index + 1 }}</td>
              <td>
                <span class="op-rank__name">
                  <OrdoBookCover :src="row.cover" :name="row.name" mini decorative />
                  <span><a :href="hrefFor(row.code)" @click.stop="openRow($event, row.code)">{{ row.label }}</a>
                    <small><OrdoLocBadge :code="row.code" /><span v-if="row.gated" class="op-pill op-pill--warn op-rank__mini-pill">pré</span><span v-if="row.premium" class="op-pill op-pill--gold op-rank__mini-pill">Ordo+</span></small>
                  </span>
                </span>
              </td>
              <td><span style="font-size: 13px">{{ row.language || '—' }}</span></td>
              <td class="is-num">{{ formatCount(row.usingToday) }}</td>
              <td class="is-num"><span class="op-flex" style="justify-content: flex-end; gap: 6px">{{ formatCount(row.newUsers) }}<OrdoDeltaChip v-if="delta(row)" :delta="delta(row)!" /></span></td>
              <td class="is-num"><strong>{{ formatCount(row.praying) }}</strong></td>
              <td class="is-num">{{ formatPerPerson(row.completions, row.praying) }}</td>
              <td class="is-num" :title="row.d7Eligible !== null && row.d7Eligible < 20 ? 'poucas pessoas para medir' : undefined">{{ row.d7Eligible !== null && row.d7Eligible < 20 ? '—' : formatRate(row.d7) }}</td>
              <td class="op-rank__spark"><OrdoSparkline v-if="row.spark" :values="row.spark" :height="24" /><span v-else class="op-faint">—</span></td>
              <td><span class="op-pill" :class="narrationPill(row.narration).tone">{{ narrationPill(row.narration).text.replace('Voz ', '') }}</span></td>
              <td>
                <OrdoIcon v-if="row.pdf?.published" name="check" :size="16" style="color: var(--op-ok)" />
                <span v-else class="op-faint">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="op-panel__foot">
        <span>
          <span class="op-only-wide">Mostrando {{ wideRows.length }} de {{ rows.length }}.</span>
          <span class="op-only-narrow">Mostrando {{ narrowRows.length }} de {{ rows.length }}.</span>
          "Usam hoje" é a preferência de hoje; "Voltam em 7 dias" conta quem chegou pelo livro e rezou no 7º dia.
          <template v-if="!perBook">Rezaram, ofícios por pessoa e tendência por livro chegam em breve; até lá, o retorno só existe para os 8 livros com mais gente.</template>
        </span>
        <button v-if="rows.length > NARROW" type="button" class="op-link" @click="showAll = !showAll">{{ showAll ? 'Mostrar menos' : `Ver os ${rows.length}` }} <OrdoIcon :name="showAll ? 'chevron-up' : 'arrow'" :size="14" /></button>
      </div>
    </template>
  </section>
</template>
