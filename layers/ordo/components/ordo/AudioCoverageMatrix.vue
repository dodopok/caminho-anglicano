<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import {
  coverageBucket,
  coverageRows,
  coverageText,
  hiddenBibleCount,
  matrixOffices,
  totalBibleCount,
  type CoverageRow
} from '../../utils/audio'
import { OFFICE_META } from '../../utils/series'

// Of the trechos the offices of the next weeks will ask for, how many already
// have voice: a row per book × Bible, a column per office. It reads the
// coverage the API stores every night; until that endpoint exists the card
// says so and points to Cobertura, where one book is computed on the spot.
const store = useAudioStore()
const showAll = ref(false)

const report = computed(() => store.readiness)
const data = computed(() => report.value.data)
const offices = computed(() => matrixOffices(data.value))
const rows = computed(() => coverageRows(data.value, { showAll: showAll.value, runningFor: store.runningFor }))
const hidden = computed(() => hiddenBibleCount(data.value))
const total = computed(() => totalBibleCount(data.value))
const weeks = computed(() => Math.round((store.readinessDays.value) / 7))

const open = (row: CoverageRow) => store.go('cobertura', { livro: row.book.prayer_book_code, biblia: row.bible.default ? null : row.bible.bible_version })
const generate = (row: CoverageRow) => store.openGeneration({
  mode: 'office',
  prayer_book_code: row.book.prayer_book_code,
  bible_version: row.bible.default ? undefined : row.bible.bible_version,
  days: store.readinessDays.value,
  step: 3
})

const legend = [
  { key: '100', label: '100%', color: '#d7e8d5' },
  { key: '90', label: '90–99%', color: '#e4efe3' },
  { key: '70', label: '60–89%', color: '#f2e9d2' },
  { key: '40', label: '1–59%', color: '#fbebdc' },
  { key: '0', label: 'nada', color: 'var(--op-danger-wash)' }
]
</script>

<template>
  <section class="op-card op-panel" aria-labelledby="audio-coverage-title">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Próximas {{ weeks }} semanas</p>
        <h2 id="audio-coverage-title">Cobertura por livro e Bíblia</h2>
        <p>Dos trechos que os ofícios dos próximos {{ store.readinessDays.value }} dias vão pedir, quantos já têm narração. Clique numa linha para ver dia a dia.</p>
      </div>
      <div v-if="!report.soon" class="op-seg op-seg--small" role="group" aria-label="Janela da cobertura">
        <button type="button" :class="{ 'is-on': store.readinessDays.value === 28 }" :aria-pressed="store.readinessDays.value === 28" @click="store.readinessDays.value = 28">28 dias</button>
        <button type="button" :class="{ 'is-on': store.readinessDays.value === 7 }" :aria-pressed="store.readinessDays.value === 7" @click="store.readinessDays.value = 7">7 dias</button>
      </div>
    </div>

    <span v-if="report.loading && !data" class="op-skeleton" style="height: 320px" aria-hidden="true" />

    <OrdoSoonState v-else-if="report.soon" title="Em breve: a cobertura de todos os livros numa tabela">
      <span>A API ainda não guarda a cobertura calculada à noite. Enquanto isso, abra um livro e o portal calcula na hora:</span>
      <span class="op-flex" style="margin-top: 10px">
        <button v-for="book in store.books.value.slice(0, 12)" :key="book.code" type="button" class="op-chip" @click="store.go('cobertura', { livro: book.code })">{{ book.name }}</button>
      </span>
    </OrdoSoonState>

    <p v-else-if="report.error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Não foi possível ler a cobertura.</p>

    <OrdoSoonState v-else-if="data && !data.computed_at" title="A cobertura aparece depois da primeira rodada noturna" text=" A API calcula os próximos 28 dias toda madrugada (00:45). Até lá, abra um livro em Cobertura para calcular na hora." />

    <template v-else-if="data">
      <div class="op-table-wrap">
        <table class="op-matrix">
          <thead>
            <tr>
              <th scope="col">Livro</th>
              <th scope="col">Bíblia das leituras</th>
              <th v-for="office in offices" :key="office" scope="col">{{ OFFICE_META[office]?.label || office }}</th>
              <th scope="col">Total</th>
              <th scope="col"><span class="op-sr-only">Ação</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" :class="{ 'is-first': row.first }" tabindex="0" @click="open(row)" @keydown.enter="open(row)">
              <td class="op-matrix__book"><OrdoLocBadge v-if="row.first" :code="row.book.prayer_book_code" /></td>
              <td class="op-matrix__bible"><strong>{{ row.bible.name }}</strong><small>{{ row.note }}</small></td>
              <td v-for="office in offices" :key="office">
                <span v-if="!row.book.offices.includes(office)" class="op-cell op-cell--na">não tem</span>
                <span v-else-if="!row.bible.computed" class="op-cell op-cell--na">—</span>
                <span v-else class="op-cell" :class="`op-cell--${coverageBucket(row.bible.by_office?.[office]?.percentage)}`">{{ coverageText(row.bible.by_office?.[office]?.percentage) }}</span>
              </td>
              <td><span class="op-cell op-cell--total">{{ row.bible.computed ? coverageText(row.bible.totals?.percentage) : '—' }}</span></td>
              <td style="text-align: right" @click.stop>
                <span v-if="row.running !== null" class="op-pill op-pill--info">{{ row.running }}% rodando</span>
                <button v-else-if="!row.bible.computed" type="button" class="op-btn op-btn--small op-btn--ghost" @click="open(row)">Calcular</button>
                <button v-else-if="(row.bible.totals?.percentage ?? 100) < 100" type="button" class="op-btn op-btn--small" @click="generate(row)">Gerar o que falta</button>
                <button v-else type="button" class="op-icon-btn" style="width: 32px; height: 32px; border: 0; background: none; color: var(--op-action)" :aria-label="`Ver ${row.book.prayer_book_code} dia a dia`" @click="open(row)"><OrdoIcon name="chevron-right" :size="16" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="op-panel__foot">
        <span class="op-legend">
          <span v-for="item in legend" :key="item.key"><i class="op-swatch" :style="{ background: item.color }" />{{ item.label }}</span>
        </span>
        <span v-if="hidden || showAll">
          {{ showAll ? 'Mostrando todas as Bíblias' : 'Bíblias que ninguém escolheu ficam escondidas' }} ·
          <button type="button" class="op-link" @click="showAll = !showAll">{{ showAll ? 'só as escolhidas' : `mostrar todas (${total})` }}</button>
        </span>
      </div>
    </template>
  </section>
</template>
