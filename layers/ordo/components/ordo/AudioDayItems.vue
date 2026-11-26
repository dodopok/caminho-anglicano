<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioApi } from '../../composables/useAudioApi'
import { createReport } from '../../composables/useReport'
import { longDay, number, OFFICE_TITLES, sourceShort } from '../../utils/audio'
import type { AudioCoverageCount, AudioEstimateDetail, AudioEstimateItem } from '../../types/audio'

// The trechos of one office on one day, in the order the office says them:
// which have voice (with a play button) and which are missing. The list
// comes from the estimate with `include_items`; an API from before it
// returns only the totals, and the card says the list is on its way.
const props = defineProps<{
  book: string
  bible: string
  bibleName: string
  date: string
  office: string
  cell?: AudioCoverageCount | null
}>()

const emit = defineEmits<{ generate: [date: string, office: string] }>()

const api = useAudioApi()
const report = createReport<{ estimate: AudioEstimateDetail }>(() => api.estimate({
  prayer_book_code: props.book,
  start_date: props.date,
  days: 1,
  offices: [props.office],
  preferences: props.bible ? { bible_version: props.bible } : {},
  include_items: true
}))

watch(() => [props.book, props.bible, props.date, props.office].join('|'), () => { void report.load() }, { immediate: true })

const items = computed<AudioEstimateItem[] | null>(() => {
  const rows = report.state.data?.estimate.rows
  if (!rows) return null
  const withItems = rows.filter(row => Array.isArray(row.items))
  return withItems.length ? withItems.flatMap(row => row.items || []) : null
})
const showAll = ref(false)
const shown = computed(() => showAll.value ? items.value || [] : (items.value || []).slice(0, 6))
const totals = computed(() => {
  const estimate = report.state.data?.estimate
  const ready = props.cell?.ready_clips ?? estimate?.ready_clips ?? 0
  const missing = props.cell?.missing_clips ?? estimate?.missing_clips ?? 0
  return { ready, missing, total: ready + missing }
})

const STATUS: Record<string, { label: string; tone: string }> = {
  ready: { label: 'Pronto', tone: 'ok' },
  partial: { label: 'Em parte', tone: 'gold' },
  missing: { label: 'Falta', tone: 'warn' }
}

let player: HTMLAudioElement | null = null
const playing = ref<string | null>(null)
const play = (item: AudioEstimateItem) => {
  if (!item.audio_url) return
  player?.pause()
  if (playing.value === item.section) {
    playing.value = null
    return
  }
  player = new Audio(item.audio_url)
  playing.value = item.section
  player.addEventListener('ended', () => { playing.value = null })
  void player.play().catch(() => { playing.value = null })
}
onBeforeUnmount(() => player?.pause())
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">{{ longDay(date) }}</p>
        <h3>{{ OFFICE_TITLES[office] || office }}</h3>
        <p>{{ number(totals.total) }} trechos · {{ number(totals.ready) }} prontos<template v-if="totals.missing"> · <strong style="color: var(--op-warn)">{{ number(totals.missing) }} faltando</strong></template></p>
      </div>
    </div>

    <span v-if="report.state.loading && !report.state.data" class="op-skeleton" style="height: 220px" aria-hidden="true" />
    <OrdoSoonState v-else-if="report.state.settled && !items" title="Em breve: os trechos de cada ofício" text=" Esta API devolve só os totais por dia e ofício; a lista de trechos chega com a próxima versão." />
    <table v-else-if="items?.length" class="op-table">
      <thead><tr><th scope="col">Trecho</th><th scope="col">Fonte</th><th scope="col">Situação</th><th scope="col" class="is-num">Ouvir</th></tr></thead>
      <tbody>
        <tr v-for="item in shown" :key="item.section">
          <th scope="row">{{ item.label }}</th>
          <td>{{ sourceShort(item.source, bibleName) }}</td>
          <td><span class="op-pill" :class="`op-pill--${STATUS[item.status]?.tone || 'quiet'}`">{{ STATUS[item.status]?.label || item.status }}</span></td>
          <td class="is-num">
            <button v-if="item.audio_url" type="button" class="op-icon-btn" style="width: 32px; height: 32px" :aria-label="`${playing === item.section ? 'Parar' : 'Ouvir'} ${item.label}`" @click="play(item)"><OrdoIcon :name="playing === item.section ? 'close' : 'play'" :size="14" /></button>
            <span v-else class="op-faint">—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="items" class="op-empty">Este ofício não tem trechos narráveis neste dia.</p>

    <div class="op-panel__foot">
      <span v-if="items && items.length > 6">Mostrando {{ shown.length }} de {{ items.length }} trechos · <button type="button" class="op-link" @click="showAll = !showAll">{{ showAll ? 'ver menos' : 'ver todos' }}</button></span>
      <span v-else />
      <button v-if="totals.missing" type="button" class="op-btn op-btn--small" @click="emit('generate', date, office)">Gerar só este dia</button>
    </div>
  </section>
</template>
