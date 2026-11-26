<script setup lang="ts">
import OrdoAudioBookCoverage from './AudioBookCoverage.vue'
import OrdoAudioClips from './AudioClips.vue'
import OrdoAudioCoverageMatrix from './AudioCoverageMatrix.vue'
import OrdoAudioCoverageList from './AudioCoverageList.vue'
import OrdoAudioMaintenance from './AudioMaintenance.vue'
import OrdoAudioNewGeneration from './AudioNewGeneration.vue'
import OrdoAudioOverview from './AudioOverview.vue'
import OrdoAudioRuns from './AudioRuns.vue'
import OrdoIcon from './Icon.vue'
import { createAudioStore, provideAudioStore, type AudioSection } from '../../composables/useAudioStore'
import { usePortalHead, type PortalHeadAction } from '../../composables/usePortalHead'
import { usePortalQuery } from '../../composables/usePortalQuery'
import { plural } from '../../utils/audio'
import type { DashboardAudio } from '../../types/dashboard'

// The Áudio tab, organised around three questions: is something wrong or
// waiting for me, do the offices of the next weeks have voice, and what is
// running and what did it cost. Each section lives in its own component; this
// one loads the shared data, keeps it fresh while there is work, and sets the
// page head for the section on screen.
const props = defineProps<{
  /** Bumped by the page's refresh button. */
  reloadKey: number
}>()

const emit = defineEmits<{ summary: [summary: DashboardAudio | null] }>()

const store = provideAudioStore(createAudioStore())
const query = usePortalQuery()

const SECTIONS: Array<{ id: AudioSection; label: string }> = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'cobertura', label: 'Cobertura' },
  { id: 'execucoes', label: 'Execuções' },
  { id: 'clips', label: 'Clips' },
  { id: 'manutencao', label: 'Manutenção' }
]

const section = computed(() => store.section.value)
const counts = computed<Partial<Record<AudioSection, { value: number; quiet: boolean }>>>(() => {
  const live = store.activeRuns.value.length + store.waitingRuns.value.length
  return {
    execucoes: live ? { value: live, quiet: !store.incident.value } : undefined,
    clips: store.pendingCandidates.value ? { value: store.pendingCandidates.value, quiet: false } : undefined
  }
})

// --- The page head -------------------------------------------------------------
const DESCRIPTIONS: Record<AudioSection, string> = {
  'visao-geral': 'O que os ofícios vão tocar nas próximas semanas, o que está sendo gerado agora e o que pede você.',
  cobertura: 'Quanto dos ofícios das próximas semanas já tem voz, livro por livro e Bíblia por Bíblia.',
  execucoes: 'Tudo o que foi pedido ao provedor de voz: o que roda, o que esperou, o que falhou e quanto custou.',
  clips: 'Ouça, ajuste e aprove as tentativas de cada texto narrado.',
  manutencao: 'Limpar vozes antigas, reindexar os usos e cuidar da fila de processamento.',
  'nova-geracao': 'Escolha o que narrar, veja quanto já existe e quanto vai custar, e só então peça ao provedor de voz.'
}

const newGeneration: PortalHeadAction = { key: 'new', label: 'Nova geração', icon: 'plus', variant: 'primary', onClick: () => store.openGeneration({}) }

usePortalHead(() => {
  const current = section.value
  const book = store.book.value
  const running = store.runningRuns.value.length
  const live = store.incident.value
    ? { text: 'Conferindo a cada minuto enquanto o provedor estiver fora', tone: 'idle' as const }
    : running
      ? { text: `Ao vivo · ${plural(running, 'geração rodando', 'gerações rodando')}`, tone: 'busy' as const }
      : { text: 'Nenhuma geração rodando', tone: 'idle' as const }
  const disabled = store.providerDown.value
  if (current === 'nova-geracao') {
    return {
      title: 'Nova geração',
      description: DESCRIPTIONS['nova-geracao'],
      crumb: 'Nova geração',
      live,
      actions: [{ key: 'cancel', label: 'Cancelar', icon: 'close', variant: 'ghost', onClick: () => store.go('visao-geral') }]
    }
  }
  if (current === 'cobertura' && book) {
    return {
      title: store.bookFullName(book),
      description: 'Quanto dos ofícios das próximas 4 semanas já tem voz, dia a dia, para cada Bíblia que os leitores deste livro escolhem.',
      crumb: `Cobertura · ${book}`,
      live,
      actions: [
        { key: 'all', label: 'Todos os livros', icon: 'chevron-left', variant: 'link', onClick: () => store.go('cobertura') },
        { key: 'missing', label: 'Gerar o que falta', icon: 'plus', variant: 'primary', disabled, onClick: () => store.openGeneration({ mode: 'office', prayer_book_code: book, bible_version: store.bible.value || undefined, days: 28, step: 3 }) }
      ]
    }
  }
  const crumbs: Partial<Record<AudioSection, string>> = { cobertura: 'Cobertura', execucoes: 'Execuções', clips: 'Clips', manutencao: 'Manutenção' }
  return {
    title: 'Narração do ofício',
    description: DESCRIPTIONS[current],
    crumb: crumbs[current],
    live,
    actions: [{ ...newGeneration, disabled }]
  }
})

// --- Loading -----------------------------------------------------------------------
watch(() => store.summary.data, summary => emit('summary', summary), { immediate: true })
watch(() => props.reloadKey, () => { void store.refresh() })

// A link that asked for a card (`foco=fila`) scrolls to it once the data is
// there, then drops the key so later reloads open the section from the top.
const focusRequestedCard = async () => {
  const focus = query.get('foco')
  if (!focus) return
  await nextTick()
  if (import.meta.client) document.getElementById(`audio-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  query.set({ foco: null })
}

onMounted(async () => {
  await store.loadAll()
  await focusRequestedCard()
})

const changeBook = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  store.go('cobertura', { livro: value || null })
}
</script>

<template>
  <div class="op-tabbar">
    <div class="op-seg" role="tablist" aria-label="Seções do áudio">
      <button
        v-for="item in SECTIONS"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="section === item.id"
        :class="{ 'is-on': section === item.id }"
        @click="store.go(item.id)"
      >
        {{ item.label }}<span v-if="counts[item.id]" class="op-count" :class="{ 'op-count--quiet': counts[item.id]?.quiet }">{{ counts[item.id]?.value }}</span>
      </button>
    </div>
    <label v-if="section === 'cobertura'" class="op-flex">
      <span class="op-faint" style="font-size: 13px">Livro</span>
      <select class="op-field" style="width: min(300px, 100%); min-height: 38px" :value="store.book.value" aria-label="Livro" @change="changeBook">
        <option value="">Todos os livros</option>
        <option v-for="book in store.books.value" :key="book.code" :value="book.code">{{ book.code }} · {{ book.name }}</option>
      </select>
    </label>
  </div>

  <p v-if="store.runsError.value && section !== 'execucoes' && section !== 'visao-geral'" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ store.runsError.value }}</p>

  <OrdoAudioOverview v-if="section === 'visao-geral'" />
  <template v-else-if="section === 'cobertura'">
    <OrdoAudioBookCoverage v-if="store.book.value" :key="store.book.value" />
    <template v-else>
      <!-- The book × Bible × office table is wider than a phone; phones get the
           same list the overview uses, so the page never grows sideways. -->
      <div class="op-only-wide"><OrdoAudioCoverageMatrix /></div>
      <div class="op-only-narrow"><OrdoAudioCoverageList :limit="999" /></div>
    </template>
  </template>
  <OrdoAudioRuns v-else-if="section === 'execucoes'" />
  <OrdoAudioClips v-else-if="section === 'clips'" />
  <OrdoAudioMaintenance v-else-if="section === 'manutencao'" />
  <OrdoAudioNewGeneration v-else-if="section === 'nova-geracao'" />
</template>
