<script setup lang="ts">
import OrdoAudioRunActions from './AudioRunActions.vue'
import OrdoAudioRunDetail from './AudioRunDetail.vue'
import OrdoAudioRunRow from './AudioRunRow.vue'
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioApi } from '../../composables/useAudioApi'
import { useAudioStore } from '../../composables/useAudioStore'
import { errorText } from '../../composables/useReport'
import { isSessionError } from '../../types/dashboard'
import { groupRunsByDay, isWaiting, KIND_LABELS, number } from '../../utils/audio'
import type { AudioRun, AudioRunCounts, AudioRunStatusFilter } from '../../types/audio'

// Every run, filterable by status, book and kind, grouped by the day it was
// asked for; one opens beside the list with what happened and what to do.
// An API from before the filters returns the latest runs: the list then
// filters those on this side and says paging is on its way.
const store = useAudioStore()
const api = useAudioApi()

type Tab = 'all' | 'running' | 'waiting' | 'failed' | 'completed'
const TABS: Array<{ id: Tab; label: string; status: AudioRunStatusFilter | ''; count?: keyof AudioRunCounts }> = [
  { id: 'all', label: 'Todas', status: '' },
  { id: 'running', label: 'Rodando', status: 'running', count: 'running' },
  { id: 'waiting', label: 'Esperando o provedor', status: 'waiting', count: 'waiting' },
  { id: 'failed', label: 'Com erro', status: 'failed', count: 'failed' },
  { id: 'completed', label: 'Concluídas', status: 'completed' }
]

const tab = ref<Tab>('all')
const kind = ref('')
const bookFilter = ref('')
const list = ref<AudioRun[]>([])
const counts = ref<AudioRunCounts | null>(null)
const nextBefore = ref<number | string | null>(null)
const hasMore = ref(false)
const paged = ref(true)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const matches = (run: AudioRun, which: Tab) => {
  if (which === 'all') return true
  if (which === 'waiting') return isWaiting(run)
  if (which === 'running') return run.status === 'running'
  return run.status === which
}

// The old API answers the latest runs whatever the filters say.
const localFilter = (runs: AudioRun[]) => runs.filter(run => matches(run, tab.value)
  && (!kind.value || run.kind === kind.value)
  && (!bookFilter.value || run.prayer_book_code === bookFilter.value))

let request = 0
const load = async (more = false) => {
  const id = ++request
  if (more) loadingMore.value = true
  else loading.value = true
  error.value = null
  try {
    const status = TABS.find(item => item.id === tab.value)?.status || ''
    const page = await api.fetchRuns({
      status,
      kind: kind.value,
      prayer_book_code: bookFilter.value,
      before: more ? nextBefore.value ?? undefined : undefined,
      limit: paged.value ? 20 : 100
    })
    if (id !== request) return
    paged.value = Boolean(page.pagination)
    if (page.pagination) {
      list.value = more ? [...list.value, ...page.operations] : page.operations
      nextBefore.value = page.pagination.next_before
      hasMore.value = page.pagination.has_more
      counts.value = page.counts
    } else {
      const all = page.operations
      list.value = localFilter(all)
      hasMore.value = false
      counts.value = {
        running: all.filter(run => run.status === 'running').length,
        waiting: all.filter(isWaiting).length,
        failed: all.filter(run => run.status === 'failed').length
      }
    }
  } catch (caught) {
    if (id === request && !isSessionError(caught)) error.value = errorText(caught) || 'Não foi possível ler as execuções.'
  } finally {
    if (id === request) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

watch([tab, kind, bookFilter], () => load())
// A refresh rereads the first page; pages loaded with "Carregar mais" stay as they are.
watch(() => store.tick.value, () => { if (list.value.length <= 20) void load() })
onMounted(() => load())

const groups = computed(() => groupRunsByDay(list.value, store.now.value))
const books = computed(() => [...new Set([...store.runs.value, ...list.value].map(run => run.prayer_book_code).filter(Boolean))] as string[])

const selected = computed(() => store.runId.value)
const select = (run: AudioRun) => store.setParams({ execucao: String(run.id) === selected.value ? null : String(run.id) })
const selectedRun = computed(() => list.value.find(run => String(run.id) === selected.value) || store.runs.value.find(run => String(run.id) === selected.value) || null)
</script>

<template>
  <section class="op-row" style="align-items: flex-start">
    <section class="op-card op-panel op-grow-2">
      <div class="op-between">
        <div class="op-seg op-seg--small" role="group" aria-label="Situação">
          <button v-for="item in TABS" :key="item.id" type="button" :class="{ 'is-on': tab === item.id }" :aria-pressed="tab === item.id" @click="tab = item.id">
            {{ item.label }}<template v-if="item.count && counts && counts[item.count] !== undefined"> · {{ number(counts[item.count]) }}</template>
          </button>
        </div>
        <div class="op-filters">
          <select v-model="bookFilter" class="op-field" aria-label="Livro">
            <option value="">Todos os livros</option>
            <option v-for="code in books" :key="code" :value="code">{{ store.bookName(code) }} · {{ code }}</option>
          </select>
          <select v-model="kind" class="op-field" aria-label="Tipo">
            <option value="">Todos os tipos</option>
            <option v-for="(label, key) in KIND_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <OrdoSoonState v-if="!paged" compact title="páginas em breve" text="Esta API devolve só as execuções mais recentes; filtros e páginas no servidor chegam com a próxima versão." />
        </div>
      </div>

      <div v-if="loading && !list.length" class="op-panel__skeleton" aria-hidden="true"><span class="op-skeleton" style="height: 320px" /></div>
      <p v-else-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }}</p>
      <p v-else-if="!list.length" class="op-empty">Nenhuma execução com estes filtros.</p>
      <ul v-else class="op-runs" :style="{ opacity: loading ? .6 : 1 }">
        <template v-for="group in groups" :key="group.label">
          <li class="op-runs__day">{{ group.label }}</li>
          <OrdoAudioRunRow v-for="run in group.runs" :key="run.id" :run="run" selectable :selected="String(run.id) === selected" @select="select">
            <template #actions><OrdoAudioRunActions :run="run" :primary="run.status === 'failed' ? 'retry' : null" /></template>
          </OrdoAudioRunRow>
        </template>
      </ul>

      <div class="op-panel__foot">
        <span>Custo = caracteres narrados × preço do provedor configurado na API.</span>
        <button v-if="hasMore" type="button" class="op-btn op-btn--small" :disabled="loadingMore" @click="load(true)">{{ loadingMore ? 'Carregando…' : 'Carregar mais' }}</button>
      </div>
    </section>

    <OrdoAudioRunDetail v-if="selected" :id="selected" :initial="selectedRun" class="op-grow-1" @close="store.setParams({ execucao: null })" />
  </section>
</template>
