<script setup lang="ts">
import OrdoBookCover from './BookCover.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoSparkline from './Sparkline.vue'
import { formatCount, narrationPill, type BookRow } from '../../utils/books'

// One book on the gallery's shelf: the cover edge to edge, then how many use
// it today, who prayed and arrived, the period's line and what it has.
const props = defineProps<{
  book: BookRow
  href: string
  /** The admin endpoint is deployed: "rezaram" and the line exist. */
  perBook: boolean
}>()

const emit = defineEmits<{ open: [code: string] }>()

const change = computed(() => {
  const { newUsers, newUsersPrevious } = props.book
  if (newUsers === null || newUsersPrevious === null || newUsersPrevious < 1) return null
  const value = Math.round((newUsers - newUsersPrevious) / newUsersPrevious * 100)
  return value ? value : null
})
const pill = computed(() => narrationPill(props.book.narration))

const open = (event: MouseEvent) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  emit('open', props.book.code)
}
</script>

<template>
  <a class="op-book" :href="href" @click="open">
    <div class="op-book__shelf">
      <OrdoBookCover :src="book.cover" :name="book.name" decorative />
      <div v-if="book.isDefault || book.gated || book.premium" class="op-book__flags">
        <span v-if="book.isDefault" class="op-pill op-pill--info">Padrão</span>
        <span v-if="book.gated" class="op-pill op-pill--warn"><OrdoIcon name="flag" :size="11" />Pré-lançamento</span>
        <span v-if="book.premium" class="op-pill op-pill--gold"><OrdoIcon name="lock" :size="11" />Ordo+</span>
      </div>
    </div>
    <div class="op-book__body">
      <h3 class="op-book__name">{{ book.label }}</h3>
      <span class="op-book__meta"><OrdoLocBadge :code="book.code" />{{ book.year || '' }}</span>
      <span class="op-book__big">{{ formatCount(book.usingToday) }}<small>usam hoje</small></span>
      <span class="op-book__line">
        <template v-if="book.praying !== null"><b>{{ formatCount(book.praying) }}</b> rezaram · </template>
        <template v-if="book.newUsers !== null"><b>+{{ formatCount(book.newUsers) }}</b> novas</template>
        <template v-else>novas —</template>
        <span v-if="change" :class="change > 0 ? 'is-up' : 'is-down'"> {{ change > 0 ? '↑' : '↓' }}{{ Math.abs(change) }}%</span>
      </span>
      <OrdoSparkline v-if="book.spark" :values="book.spark" :height="22" />
      <span v-else-if="!perBook" class="op-soon" title="A linha de quem rezou com o livro chega com a API nova">Linha em breve</span>
      <div class="op-book__foot">
        <span class="op-pill" :class="pill.tone">{{ pill.text }}</span>
        <span v-if="book.pdf?.published" class="op-pill op-pill--quiet">PDF</span>
        <span v-if="book.documents" class="op-pill op-pill--quiet">{{ book.documents }} {{ book.documents === 1 ? 'doc' : 'docs' }}</span>
      </div>
    </div>
  </a>
</template>
