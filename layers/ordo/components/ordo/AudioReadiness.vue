<script setup lang="ts">
import OrdoBookPicker from './BookPicker.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { toDateInput } from '../../utils/period'
import { isSessionError, type AudioEstimate, type AudioPrayerBook } from '../../types/dashboard'

// How much of the next four weeks of offices already has narration. It reuses
// the generation estimate, which assembles the real offices of each day, so
// the answer is about what people will actually open, not about the catalogue.
//
// Assembling 28 days of offices takes a while, so it runs only when asked.
// The last answer for each book is kept on this device and shown with its age.
const props = defineProps<{
  codes: string[]
  books: AudioPrayerBook[]
}>()

const emit = defineEmits<{ generate: [code: string] }>()

const DAYS = 28
const STORAGE_PREFIX = 'ordo-portal:audio-readiness:'
const { estimateAudioGeneration } = useOrdoApi()
const { formatNumber, formatPercent, formatTimestamp } = useOrdoDashboardPresentation()

interface SavedEstimate {
  estimate: AudioEstimate
  at: string
  from: string
}

const code = ref(props.codes[0] || '')
const saved = ref<SavedEstimate | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let request = 0

const read = (value: string): SavedEstimate | null => {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${value}`)
    return raw ? JSON.parse(raw) as SavedEstimate : null
  } catch {
    return null
  }
}

const write = (value: string, entry: SavedEstimate) => {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${value}`, JSON.stringify(entry))
  } catch {
    // Private mode or a full storage: the answer still shows until the page closes.
  }
}

const estimate = computed(() => saved.value?.estimate || null)
const ready = computed(() => estimate.value?.ready_clips || 0)
const missing = computed(() => estimate.value?.missing_clips || 0)
const rate = computed(() => ready.value + missing.value ? ready.value / (ready.value + missing.value) * 100 : 0)
// An answer from another day describes another four weeks.
const stale = computed(() => Boolean(saved.value && saved.value.from !== toDateInput(new Date())))

const run = async () => {
  if (!code.value) return
  const requestId = ++request
  const requested = code.value
  loading.value = true
  error.value = null
  try {
    const from = toDateInput(new Date())
    const response = await estimateAudioGeneration({ prayer_book_code: requested, start_date: from, days: DAYS })
    const entry = { estimate: response.estimate, at: new Date().toISOString(), from }
    write(requested, entry)
    if (requestId === request) saved.value = entry
  } catch (caught) {
    if (requestId === request && !isSessionError(caught)) error.value = caught instanceof Error ? caught.message : 'Não foi possível calcular.'
  } finally {
    if (requestId === request) loading.value = false
  }
}

watch(() => props.codes, codes => {
  if (!code.value && codes[0]) code.value = codes[0]
})

watch(code, value => {
  request += 1
  loading.value = false
  error.value = null
  saved.value = value ? read(value) : null
}, { immediate: true })
</script>

<template>
  <section class="op-card op-panel" aria-labelledby="audio-readiness-title">
    <div class="op-panel__head readiness__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Próximas 4 semanas</p>
        <h3 id="audio-readiness-title">Narração pronta para os ofícios</h3>
        <p>Dos clips que os ofícios dos próximos {{ DAYS }} dias vão pedir, quantos já existem.</p>
      </div>
      <OrdoBookPicker v-model="code" class="readiness__picker" :books="books" :codes="codes" :disabled="loading" />
    </div>

    <p v-if="error" class="op-inline-error" style="margin: 0">{{ error }}</p>

    <div v-if="loading" class="readiness__running" role="status">
      <span class="readiness__spinner" aria-hidden="true" />
      <span>Montando os ofícios dos próximos {{ DAYS }} dias de <strong>{{ books.find(book => book.code === code)?.name || code }}</strong>… isso leva alguns segundos.</span>
    </div>

    <div v-else-if="estimate" style="display: flex; flex-direction: column; gap: 10px">
      <div style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 16px">
        <span class="op-metric__value">{{ formatPercent(Math.round(rate * 10) / 10) }}</span>
        <span class="op-muted" style="font-size: 14px">{{ formatNumber(ready) }} prontos · <strong :style="{ color: missing ? 'var(--op-warn)' : 'var(--op-ok)' }">{{ formatNumber(missing) }} faltando</strong></span>
        <OrdoLocBadge :code="code" />
      </div>
      <div class="op-track" style="height: 10px" aria-hidden="true"><span :style="{ width: `${rate}%`, background: rate >= 95 ? 'var(--op-ok)' : 'var(--op-action)' }" /></div>
      <div class="readiness__foot">
        <span class="op-faint" style="font-size: 12.5px">
          {{ missing ? `Narrar o que falta: ${formatNumber(estimate.missing_characters)} caracteres${estimate.estimated_cost != null ? `, cerca de US$ ${estimate.estimated_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}.` : 'Tudo pronto para as próximas semanas.' }}
        </span>
        <div class="readiness__actions">
          <span class="readiness__age" :class="{ 'is-stale': stale }">
            <OrdoIcon name="clock" :size="13" />
            {{ stale ? 'Calculado em' : 'Calculado' }} {{ formatTimestamp(saved?.at) }}
          </span>
          <button type="button" class="op-btn op-btn--small op-btn--ghost" @click="run">
            <OrdoIcon name="refresh" :size="14" /> Recalcular
          </button>
          <button v-if="missing" type="button" class="op-btn op-btn--small" @click="emit('generate', code)">Gerar o que falta</button>
        </div>
      </div>
    </div>

    <div v-else class="readiness__empty">
      <span>Ainda não calculado para este livro. A conta monta os ofícios reais de cada dia e leva alguns segundos.</span>
      <button type="button" class="op-btn op-btn--small op-btn--primary" :disabled="!code" @click="run">Calcular agora</button>
    </div>
  </section>
</template>

<style scoped>
.readiness__head { flex-wrap: wrap; }
.readiness__picker { flex: 0 1 320px; min-width: 240px; }
.readiness__foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.readiness__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.readiness__age { display: inline-flex; align-items: center; gap: 5px; color: var(--op-ink-faint); font-size: 12px; }
.readiness__age.is-stale { color: var(--op-warn); }
.readiness__empty { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border: 1px dashed rgba(13, 39, 68, .18); border-radius: 12px; color: var(--op-ink-soft); font-size: 13.5px; line-height: 1.5; }
.readiness__running { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; background: var(--op-wash); color: var(--op-ink-soft); font-size: 13.5px; line-height: 1.5; }
.readiness__spinner { flex: 0 0 auto; width: 18px; height: 18px; border: 2px solid rgba(23, 84, 207, .2); border-top-color: var(--op-action); border-radius: 999px; animation: readiness-spin .8s linear infinite; }
@keyframes readiness-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .readiness__spinner { animation-duration: 2.4s; } }
</style>
