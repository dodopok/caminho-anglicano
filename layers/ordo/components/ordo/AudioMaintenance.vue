<script setup lang="ts">
import OrdoAudioQueueCard from './AudioQueueCard.vue'
import OrdoBookPicker from './BookPicker.vue'
import OrdoIcon from './Icon.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { errorText } from '../../composables/useReport'
import { number } from '../../utils/audio'
import type { AudioCleanupPreview, AudioClipFilters, AudioProfileStatus } from '../../types/dashboard'

// Destructive and bookkeeping work: remove clips of an old voice (preview
// first), see the current voice of each language, reindex where a book's
// texts use the clips, and clear the worker queue.
const store = useAudioStore()
const ordo = useOrdoApi()
const { formatDuration } = useOrdoDashboardPresentation()

const cleanupBook = ref('')
const cleanupStatus = ref<AudioProfileStatus>('legacy')
const preview = ref<AudioCleanupPreview | null>(null)
const cleanupBusy = ref(false)
const cleanupError = ref<string | null>(null)
const reindexBook = ref('')
const reindexBusy = ref(false)
const reindexError = ref<string | null>(null)
const notice = ref<string | null>(null)

watch(() => store.books.value, books => {
  if (!reindexBook.value) reindexBook.value = books.find(book => book.is_recommended)?.code || books[0]?.code || ''
}, { immediate: true })
watch([cleanupBook, cleanupStatus], () => { preview.value = null })

const filters = (): AudioClipFilters => ({ profile_status: cleanupStatus.value, ...(cleanupBook.value ? { prayer_book_code: cleanupBook.value } : {}) })

const runPreview = async () => {
  cleanupBusy.value = true
  cleanupError.value = null
  try {
    preview.value = await ordo.previewAudioCleanup(filters())
  } catch (caught) {
    preview.value = null
    cleanupError.value = errorText(caught) || 'Não foi possível calcular.'
  } finally {
    cleanupBusy.value = false
  }
}

const runCleanup = async () => {
  if (!preview.value?.total_clips) return
  if (!window.confirm(`Remover ${number(preview.value.total_clips)} clips e seus arquivos do storage? Essa ação não pode ser desfeita.`)) return
  cleanupBusy.value = true
  cleanupError.value = null
  try {
    const response = await ordo.enqueueAudioCleanup(filters())
    store.track(response.operation)
    preview.value = null
    notice.value = 'Limpeza enfileirada: acompanhe em Execuções.'
  } catch (caught) {
    cleanupError.value = errorText(caught) || 'Não foi possível enfileirar.'
  } finally {
    cleanupBusy.value = false
  }
}

const reindex = async () => {
  reindexBusy.value = true
  reindexError.value = null
  try {
    const response = await ordo.reindexAudioCatalog(reindexBook.value)
    store.track(response.operation)
    notice.value = 'Reindexação enfileirada: acompanhe em Execuções.'
  } catch (caught) {
    reindexError.value = errorText(caught) || 'Não foi possível reindexar.'
  } finally {
    reindexBusy.value = false
  }
}

const current = computed(() => (store.summary.data?.profiles || []).filter(profile => profile.profile_status === 'current'))
const short = (value?: string | null) => value ? value.slice(0, 12) : '—'
</script>

<template>
  <p v-if="notice" class="op-inline-note" role="status"><OrdoIcon name="check" :size="18" />{{ notice }} <button type="button" class="op-link" @click="store.go('execucoes')">Ver execuções</button></p>
  <section class="op-grid" style="--op-min: 340px; align-items: start">
    <section class="op-card op-panel">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Manutenção destrutiva</p>
        <h3>Limpar perfis antigos</h3>
        <p>Pré-visualize antes de apagar. A operação remove o arquivo do storage e o registro do banco.</p>
      </div>
      <div class="op-grid" style="--op-min: 180px">
        <label class="op-label">Quais áudios
          <select v-model="cleanupStatus" class="op-field">
            <option value="legacy">Sem registro de versão</option>
            <option value="stale">Instruções antigas</option>
          </select>
        </label>
        <OrdoBookPicker v-model="cleanupBook" label="Só neste livro" empty-label="Todos os livros" :books="store.books.value" />
      </div>
      <p v-if="cleanupError" class="op-inline-error" role="alert">{{ cleanupError }}</p>
      <div v-if="preview" class="op-band op-band--gold">
        <strong class="op-display" style="font-size: 20px">{{ number(preview.total_clips) }} clips selecionados</strong>
        <p class="op-note" style="margin: 4px 0 0">{{ number(preview.total_characters) }} caracteres · {{ formatDuration(preview.total_duration_seconds) }}</p>
      </div>
      <div class="op-flex" style="justify-content: flex-end">
        <button type="button" class="op-btn op-btn--small" :disabled="cleanupBusy" @click="runPreview">{{ cleanupBusy ? 'Calculando…' : 'Pré-visualizar' }}</button>
        <button type="button" class="op-btn op-btn--small op-btn--danger" :disabled="cleanupBusy || !preview?.total_clips" @click="runCleanup">Enfileirar limpeza</button>
      </div>
    </section>

    <section class="op-card op-panel">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Rastreabilidade</p>
        <h3>Voz e índice</h3>
        <p>A versão vem da configuração da voz e das instruções; o texto das instruções não aparece aqui.</p>
      </div>
      <table v-if="current.length" class="op-table">
        <tbody>
          <tr v-for="profile in current" :key="`${profile.language}-${profile.configuration_fingerprint}`">
            <th scope="row">{{ profile.provider }} · {{ profile.voice }}<br><small class="op-faint" style="font-weight: 500">{{ profile.language }} · {{ profile.model }}</small></th>
            <td class="is-num"><span class="op-mono">{{ short(profile.configuration_fingerprint) }}</span><br><small class="op-faint">{{ number(profile.clips) }} clips atuais</small></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="op-empty">A voz atual aparece depois do primeiro catálogo indexado.</p>
      <div class="op-grid" style="--op-min: 200px; align-items: end">
        <OrdoBookPicker v-model="reindexBook" label="Livro a reindexar" :books="store.books.value" :disabled="!store.books.value.length" />
        <button type="button" class="op-btn op-btn--small" :disabled="reindexBusy || !reindexBook" @click="reindex">{{ reindexBusy ? 'Indexando…' : 'Reindexar usos' }}</button>
      </div>
      <p v-if="reindexError" class="op-inline-error" role="alert">{{ reindexError }}</p>
    </section>

    <OrdoAudioQueueCard />
  </section>
</template>
