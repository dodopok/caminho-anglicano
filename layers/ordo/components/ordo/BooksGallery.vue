<script setup lang="ts">
import OrdoBookCard from './BookCard.vue'
import OrdoIcon from './Icon.vue'
import OrdoMetricCard from './MetricCard.vue'
import { comparePeriods } from '../../utils/compare'
import { booksSummary, formatCount, groupBooks, type BookRow, type RankingSort } from '../../utils/books'

export interface BooksKpis {
  total: number
  open: number
  prerelease: number
  premium: number
  usingToday: number | null
  newUsers: number | null
  newUsersPrevious: number | null
  praying: number | null
  prayingPrevious: number | null
}

// The gallery: a sentence written from the data, four numbers for the whole
// catalog, then the books on shelves by language.
const props = defineProps<{
  /** The books the filters let through. */
  rows: BookRow[]
  /** Every book, for the sentence on top. */
  allRows: BookRow[]
  kpis: BooksKpis
  loading: boolean
  /** The admin endpoint is deployed: "rezaram" and the line exist per book. */
  perBook: boolean
  phrase: string
  previousLabel: string
  filtered: boolean
  hrefFor: (code: string) => string
}>()

const emit = defineEmits<{
  open: [code: string]
  ranking: [sort?: RankingSort]
}>()

const summary = computed(() => booksSummary(props.allRows, props.phrase))
const groups = computed(() => groupBooks(props.rows))
const openGroups = ref<string[]>([])
const toggleGroup = (id: string) => {
  openGroups.value = openGroups.value.includes(id) ? openGroups.value.filter(item => item !== id) : [...openGroups.value, id]
}
const hasNarration = computed(() => props.allRows.some(row => row.narration !== null))

const catalogSub = computed(() => [
  `${formatCount(props.kpis.open)} ${props.kpis.open === 1 ? 'aberto' : 'abertos'}`,
  props.kpis.prerelease ? `${formatCount(props.kpis.prerelease)} em pré-lançamento` : '',
  props.kpis.premium ? `${formatCount(props.kpis.premium)} com Ordo+` : ''
].filter(Boolean).join(' · '))
</script>

<template>
  <section v-if="allRows.length" class="op-summary" aria-label="Resumo">
    <span class="op-summary__mark"><OrdoIcon name="shelf" :size="26" /></span>
    <div class="op-summary__copy">
      <strong>{{ summary.headline }}</strong>
      <span v-if="summary.detail.length"><template v-for="(part, index) in summary.detail" :key="index"><b v-if="part.strong">{{ part.text }}</b><template v-else>{{ part.text }}</template></template></span>
    </div>
    <div class="op-summary__actions">
      <button type="button" class="op-btn op-btn--small" @click="emit('ranking')">Ver ranking</button>
      <button v-if="hasNarration" type="button" class="op-btn op-btn--small" @click="emit('ranking', 'voz')">Livros sem voz</button>
    </div>
  </section>

  <section class="op-tiles op-tiles--4" aria-label="Catálogo">
    <OrdoMetricCard :loading="loading && !allRows.length" title="No catálogo" :value="formatCount(kpis.total)" scope="lifetime" scope-label="Agora" :subtitle="catalogSub" />
    <OrdoMetricCard :loading="loading && kpis.usingToday === null" title="Com um livro escolhido" :value="formatCount(kpis.usingToday)" scope="lifetime" subtitle="pela preferência de hoje" />
    <OrdoMetricCard
      :loading="loading && kpis.newUsers === null"
      title="Chegaram"
      :value="formatCount(kpis.newUsers)"
      scope="period"
      :delta="comparePeriods(kpis.newUsers, kpis.newUsersPrevious)"
      :delta-label="previousLabel"
      subtitle="contas novas, pelo livro do 1º acesso"
    />
    <OrdoMetricCard
      :loading="loading && kpis.praying === null"
      title="Rezaram"
      :value="formatCount(kpis.praying)"
      scope="period"
      :delta="comparePeriods(kpis.praying, kpis.prayingPrevious)"
      :delta-label="previousLabel"
      subtitle="em algum livro"
    />
  </section>

  <div v-if="loading && !allRows.length" class="op-books" aria-hidden="true">
    <span v-for="n in 6" :key="n" class="op-skeleton" style="height: 380px; border-radius: 18px" />
  </div>

  <p v-else-if="!rows.length" class="op-empty">
    <OrdoIcon name="search" :size="18" />{{ filtered ? 'Nenhum livro com esses filtros.' : 'Nenhum livro no catálogo.' }}
  </p>

  <section v-for="group in groups" :key="group.id" class="op-section" :aria-label="group.title">
    <div class="op-section__head">
      <h2>{{ group.title }} <span class="op-faint" style="font-family: var(--op-font-ui); font-size: 15px; font-weight: 600">{{ group.books.length }}</span></h2>
      <p>{{ group.note }}</p>
    </div>
    <ul class="op-books" :class="{ 'is-open': openGroups.includes(group.id) }">
      <li v-for="book in group.books" :key="book.code">
        <OrdoBookCard :book="book" :href="hrefFor(book.code)" :per-book="perBook" @open="emit('open', $event)" />
      </li>
    </ul>
    <button v-if="group.books.length > 4" type="button" class="op-btn op-btn--small op-books__more" :aria-expanded="openGroups.includes(group.id)" @click="toggleGroup(group.id)">
      {{ openGroups.includes(group.id) ? 'Mostrar menos' : `Ver os ${group.books.length}` }}
      <OrdoIcon :name="openGroups.includes(group.id) ? 'chevron-up' : 'chevron-down'" :size="14" />
    </button>
  </section>

  <p v-if="rows.length" class="op-note">
    Cada capa abre o livro. "Usam hoje" conta as pessoas com o livro escolhido hoje, na preferência.
    <template v-if="perBook">"Rezaram" e a linha contam quem rezou ao menos um ofício nele, no período.</template>
    "Novas" são as contas criadas no período que o escolheram no primeiro acesso.
  </p>
</template>
