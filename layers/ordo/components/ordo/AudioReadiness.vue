<script setup lang="ts">
import OrdoLocBadge from './LocBadge.vue'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { toDateInput } from '../../utils/period'
import { isSessionError, type AudioEstimate, type AudioPrayerBook } from '../../types/dashboard'

// How much of the next four weeks of offices already has narration. It reuses
// the generation estimate, which assembles the real offices of each day, so
// the answer is about what people will actually open, not about the catalogue.
const props = defineProps<{
  codes: string[]
  books: AudioPrayerBook[]
}>()

const emit = defineEmits<{ generate: [code: string] }>()

const DAYS = 28
const { estimateAudioGeneration } = useOrdoApi()
const { formatNumber, formatPercent } = useOrdoDashboardPresentation()

const code = ref(props.codes[0] || '')
const estimate = ref<AudioEstimate | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let request = 0

const nameFor = (value: string) => props.books.find(book => book.code === value)?.name || value
const ready = computed(() => estimate.value?.ready_clips || 0)
const missing = computed(() => estimate.value?.missing_clips || 0)
const rate = computed(() => ready.value + missing.value ? ready.value / (ready.value + missing.value) * 100 : 0)

const load = async () => {
  if (!code.value) return
  const requestId = ++request
  loading.value = true
  error.value = null
  try {
    const response = await estimateAudioGeneration({ prayer_book_code: code.value, start_date: toDateInput(new Date()), days: DAYS })
    if (requestId === request) estimate.value = response.estimate
  } catch (caught) {
    if (requestId === request && !isSessionError(caught)) error.value = caught instanceof Error ? caught.message : 'Não foi possível estimar.'
  } finally {
    if (requestId === request) loading.value = false
  }
}

watch(() => props.codes, codes => {
  if (!code.value && codes[0]) code.value = codes[0]
})
watch(code, load, { immediate: true })
</script>

<template>
  <section class="op-card op-panel" aria-labelledby="audio-readiness-title">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Próximas 4 semanas</p>
        <h3 id="audio-readiness-title">Narração pronta para os ofícios</h3>
        <p>Dos clips que os ofícios dos próximos {{ DAYS }} dias vão pedir, quantos já existem.</p>
      </div>
      <label class="op-label" style="min-width: 220px">
        <span class="op-sr-only">Livro de oração</span>
        <select v-model="code" class="op-field" :disabled="loading">
          <option v-for="item in codes" :key="item" :value="item">{{ nameFor(item) }}</option>
        </select>
      </label>
    </div>
    <p v-if="error" class="op-inline-error">{{ error }}</p>
    <div v-else-if="loading && !estimate" class="op-skeleton" style="height: 70px" />
    <div v-else-if="estimate" style="display: flex; flex-direction: column; gap: 10px" :style="{ opacity: loading ? .55 : 1 }">
      <div style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 16px">
        <span class="op-metric__value">{{ formatPercent(Math.round(rate * 10) / 10) }}</span>
        <span class="op-muted" style="font-size: 14px">{{ formatNumber(ready) }} prontos · <strong :style="{ color: missing ? 'var(--op-warn)' : 'var(--op-ok)' }">{{ formatNumber(missing) }} faltando</strong></span>
        <OrdoLocBadge :code="code" />
      </div>
      <div class="op-track" style="height: 10px" aria-hidden="true"><span :style="{ width: `${rate}%`, background: rate >= 95 ? 'var(--op-ok)' : 'var(--op-action)' }" /></div>
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px">
        <span class="op-faint" style="font-size: 12.5px">
          {{ missing ? `Narrar o que falta: ${formatNumber(estimate.missing_characters)} caracteres${estimate.estimated_cost != null ? `, cerca de US$ ${estimate.estimated_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}.` : 'Tudo pronto para as próximas semanas.' }}
        </span>
        <button v-if="missing" type="button" class="op-btn op-btn--small" @click="emit('generate', code)">Gerar o que falta</button>
      </div>
    </div>
  </section>
</template>
