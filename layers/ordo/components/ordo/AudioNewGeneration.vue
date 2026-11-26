<script setup lang="ts">
import OrdoAudioGenerationReceipt from './AudioGenerationReceipt.vue'
import OrdoBookPicker from './BookPicker.vue'
import OrdoCorpusPicker from './CorpusPicker.vue'
import OrdoIcon from './Icon.vue'
import { useAudioApi } from '../../composables/useAudioApi'
import { useAudioStore } from '../../composables/useAudioStore'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { errorText } from '../../composables/useReport'
import { toDateInput } from '../../utils/period'
import { OFFICE_META } from '../../utils/series'
import { alreadyRunning, runningNowCount, spanLabel } from '../../utils/audio'
import type { AudioCatalogTranslation } from '../../types/dashboard'
import type { AudioEstimateDetail } from '../../types/audio'

// "Nova geração", three steps: what to narrate (the offices of a period, or
// a whole book), its scope, and the receipt to confirm. Nothing is bought
// before the last button, which says the amount.
const store = useAudioStore()
const api = useAudioApi()
const ordo = useOrdoApi()

const DEFAULT_OFFICES = ['morning', 'midday', 'evening', 'compline']
const draft = store.draft.value || {}
store.draft.value = null

const mode = ref<'office' | 'catalog'>(draft.mode || 'office')
const step = ref<1 | 2 | 3>(draft.step || (store.book.value ? 2 : 1))
const startDate = ref(draft.start_date || toDateInput(new Date()))
const days = ref(draft.days || 28)
const offices = ref<string[]>(draft.offices || [])

// The book and the Bible live in the URL, so a reload keeps the scope.
const bookCode = computed({
  get: () => store.book.value || draft.prayer_book_code || store.books.value.find(book => book.is_recommended)?.code || store.books.value[0]?.code || '',
  set: value => store.setParams({ livro: value || null, biblia: null })
})
const bible = computed({
  get: () => store.bible.value,
  set: value => store.setParams({ biblia: value || null })
})

const book = computed(() => store.bookOf(bookCode.value))
const officeOptions = computed(() => book.value?.available_offices?.length ? book.value.available_offices : DEFAULT_OFFICES)
watch(officeOptions, allowed => {
  const kept = offices.value.filter(office => allowed.includes(office))
  offices.value = kept.length ? kept : [...allowed]
}, { immediate: true })

const toggleOffice = (office: string) => {
  if (offices.value.includes(office)) {
    if (offices.value.length > 1) offices.value = offices.value.filter(item => item !== office)
  } else offices.value = [...offices.value, office]
}

// --- Bibles and corpora ------------------------------------------------------
const translations = ref<AudioCatalogTranslation[]>([])
const translationsLoading = ref(false)
const translationsError = ref<string | null>(null)
const corpora = ref<string[]>([])
const textsOnly = ref(false)
let translationsRequest = 0
const loadTranslations = async () => {
  const id = ++translationsRequest
  translations.value = []
  corpora.value = []
  textsOnly.value = false
  translationsError.value = null
  if (!bookCode.value) return
  translationsLoading.value = true
  try {
    const response = await ordo.fetchAudioCatalogTranslations(bookCode.value)
    if (id === translationsRequest) translations.value = response.translations || []
  } catch (error) {
    if (id === translationsRequest) translationsError.value = errorText(error) || 'erro desconhecido'
  } finally {
    if (id === translationsRequest) translationsLoading.value = false
  }
}
watch(bookCode, () => { void loadTranslations() }, { immediate: true })
const bibles = computed(() => translations.value.filter(item => item.kind === 'bible'))
const bibleName = computed(() => bibles.value.find(item => item.code === bible.value)?.name || (bible.value ? bible.value.toUpperCase() : 'Bíblia padrão'))

// --- Estimate and order --------------------------------------------------------
const estimate = ref<AudioEstimateDetail | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
/** The identical generation already running (409): a run to open, not an error. */
const duplicate = ref<{ id: number | string | null } | null>(null)

// The API refuses a twin of a running generation and names it.
const failed = (caught: unknown, fallback: string) => {
  const twin = alreadyRunning(caught)
  if (twin) {
    if (twin.operation) store.track(twin.operation)
    duplicate.value = { id: twin.id }
    return
  }
  error.value = errorText(caught) || fallback
}
const openDuplicate = () => {
  if (duplicate.value?.id !== null && duplicate.value?.id !== undefined) store.go('execucoes', { execucao: duplicate.value.id })
  else store.go('execucoes')
}

// Other generations sharing the worker right now.
const runningNow = computed(() => runningNowCount(estimate.value, store.summary.data?.active_operations, store.runs.value))

const generation = () => ({
  prayer_book_code: bookCode.value,
  start_date: startDate.value,
  days: Math.min(Math.max(Number(days.value) || 1, 1), 31),
  offices: [...offices.value],
  preferences: bible.value ? { bible_version: bible.value } : {}
})

const runEstimate = async () => {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    estimate.value = (await api.estimate(generation())).estimate
    step.value = 3
  } catch (caught) {
    estimate.value = null
    error.value = errorText(caught) || 'Não foi possível calcular.'
  } finally {
    busy.value = false
  }
}

const submit = async (budget: number | null) => {
  // A second click while the order is on its way does nothing.
  if (busy.value) return
  busy.value = true
  error.value = null
  duplicate.value = null
  try {
    const response = await api.enqueueGeneration({ ...generation(), ...(budget ? { character_budget: budget } : {}) })
    store.track(response.operation)
    store.go('execucoes', { execucao: response.operation.id })
  } catch (caught) {
    failed(caught, 'Não foi possível enfileirar.')
  } finally {
    busy.value = false
  }
}

const catalogReady = computed(() => textsOnly.value || corpora.value.length > 0)
const enqueueCatalog = async (dryRun: boolean) => {
  if (!catalogReady.value || busy.value) return
  busy.value = true
  error.value = null
  duplicate.value = null
  try {
    const response = await api.enqueueCatalog({ prayer_book_code: bookCode.value, dry_run: dryRun, translations: textsOnly.value ? [] : [...corpora.value] })
    store.track(response.operation)
    store.go('execucoes', { execucao: response.operation.id })
  } catch (caught) {
    failed(caught, 'Não foi possível enfileirar.')
  } finally {
    busy.value = false
  }
}

// A link that opened the wizard on the receipt ("Gerar o que falta") asks
// for the estimate once the books (and so the book's offices) are known.
onMounted(() => {
  if (step.value !== 3 || mode.value !== 'office') return
  const known = () => store.books.value.length > 0 || !store.loading.value
  if (known()) {
    void runEstimate()
    return
  }
  const stop = watch(known, ready => {
    if (!ready) return
    stop()
    void runEstimate()
  })
})

// --- Words ---------------------------------------------------------------------
const officeNames = computed(() => {
  const names = offices.value.map(office => OFFICE_META[office]?.label || office)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : names[0] || ''
})
const scopeLine = computed(() => mode.value === 'catalog'
  ? `${bookCode.value} · ${textsOnly.value ? 'só textos' : corpora.value.length ? corpora.value.map(code => code.toUpperCase()).join(', ') : 'escolha as Bíblias'}`
  : `${bookCode.value} · ${bible.value ? bibleName.value : 'Bíblia padrão'} · ${days.value} ${Number(days.value) === 1 ? 'dia' : 'dias'} · ${offices.value.length} ${offices.value.length === 1 ? 'ofício' : 'ofícios'}`)
const receiptTitle = computed(() => `Ofícios de ${spanLabel(startDate.value, Number(days.value) || 1)} no ${store.bookName(bookCode.value)}, com a ${bible.value ? bibleName.value : 'Bíblia padrão'}`)
const receiptText = computed(() => `${officeNames.value} · cada dia montado como o leitor vai abrir · só o que falta é narrado.`)

const steps = computed(() => [
  { n: 1, title: 'O que narrar', detail: mode.value === 'office' ? 'Ofícios de um período' : 'Livro inteiro' },
  { n: 2, title: 'Escopo', detail: step.value > 1 ? scopeLine.value : 'livro, Bíblia e dias' },
  { n: 3, title: mode.value === 'office' ? 'Conferir e confirmar' : 'Simular ou gerar', detail: mode.value === 'office' ? 'custo, limite e provedor' : 'a simulação mostra o custo' }
])
const goStep = (n: number) => { if (n < step.value) step.value = n as 1 | 2 | 3 }
const choose = (value: 'office' | 'catalog') => {
  mode.value = value
  step.value = 2
}
</script>

<template>
  <ol class="op-stepper" aria-label="Passos">
    <li v-for="item in steps" :key="item.n" :class="{ 'is-done': item.n < step, 'is-on': item.n === step }">
      <button type="button" :disabled="item.n >= step" :aria-current="item.n === step ? 'step' : undefined" @click="goStep(item.n)">
        <b><OrdoIcon v-if="item.n < step" name="check" :size="14" /><template v-else>{{ item.n }}</template></b>
        <span>{{ item.title }}<small>{{ item.detail }}</small></span>
      </button>
    </li>
  </ol>

  <section v-if="step === 1" class="op-grid" style="--op-min: 280px" aria-label="O que narrar">
    <button type="button" class="op-card op-panel op-audio-choice" :class="{ 'is-on': mode === 'office' }" @click="choose('office')">
      <span class="op-eyebrow">Ofícios de um período</span>
      <strong class="op-display">Os ofícios de alguns dias</strong>
      <span class="op-muted">Monta cada dia como o leitor vai abrir, na Bíblia escolhida, e narra só o que falta. Até 31 dias por vez.</span>
    </button>
    <button type="button" class="op-card op-panel op-audio-choice" :class="{ 'is-on': mode === 'catalog' }" @click="choose('catalog')">
      <span class="op-eyebrow">Livro inteiro</span>
      <strong class="op-display">Tudo o que o livro pode ler</strong>
      <span class="op-muted">Textos, coletas, saltério e as Bíblias escolhidas, independente de data. Simule primeiro: a simulação não compra nada.</span>
    </button>
  </section>

  <section v-else-if="step === 2 && mode === 'office'" class="op-card op-panel">
    <div class="op-panel__heading">
      <p class="op-eyebrow">Escopo</p>
      <h2>Quais ofícios narrar</h2>
      <p>Reaproveita os clips que já existem e só narra o que falta.</p>
    </div>
    <div class="op-audio-form">
      <OrdoBookPicker v-model="bookCode" class="op-audio-form__wide" :books="store.books.value" :disabled="!store.books.value.length" />
      <label class="op-label">Bíblia das leituras
        <select v-model="bible" class="op-field">
          <option value="">Padrão do livro</option>
          <option v-for="item in bibles" :key="item.code" :value="item.code">{{ item.name }} · {{ item.full_name || item.code }}</option>
        </select>
      </label>
      <label class="op-label">Data inicial
        <input v-model="startDate" class="op-field" type="date">
      </label>
      <label class="op-label">Dias
        <input v-model.number="days" class="op-field" type="number" min="1" max="31">
      </label>
    </div>
    <fieldset class="op-audio-offices">
      <legend class="op-label">Ofícios</legend>
      <button v-for="office in officeOptions" :key="office" type="button" class="op-chip" :class="{ 'is-on': offices.includes(office) }" :aria-pressed="offices.includes(office)" @click="toggleOffice(office)">{{ OFFICE_META[office]?.label || office }}</button>
    </fieldset>
    <p v-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }}</p>
    <div class="op-flex" style="justify-content: flex-end">
      <button type="button" class="op-btn" @click="step = 1">Voltar</button>
      <button type="button" class="op-btn op-btn--primary" :disabled="busy || !bookCode" @click="runEstimate">{{ busy ? 'Calculando…' : 'Conferir custo' }} <OrdoIcon v-if="!busy" name="arrow" :size="16" /></button>
    </div>
  </section>

  <section v-else-if="step === 2" class="op-card op-panel">
    <div class="op-panel__heading">
      <p class="op-eyebrow">Livro inteiro</p>
      <h2>Tudo o que o livro pode ler</h2>
      <p>Todo texto, coleta, saltério e corpus bíblico que o livro pode ler, independente de data.</p>
    </div>
    <OrdoBookPicker v-model="bookCode" :books="store.books.value" :disabled="!store.books.value.length" />
    <OrdoCorpusPicker v-model="corpora" v-model:texts-only="textsOnly" :corpora="translations" :loading="translationsLoading" :error="translationsError" />
    <p class="op-note">A contagem percorre corpora inteiros e roda em segundo plano. A simulação não compra nada: ela relata quantos clips faltariam e quanto custariam.</p>
    <p v-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }}</p>
    <p v-if="duplicate" class="op-inline-note" role="status"><OrdoIcon name="info" :size="18" /><span style="flex: 1">Já tem uma geração igual rodando</span><button type="button" class="op-link" @click="openDuplicate">Ver a execução</button></p>
    <div class="op-flex" style="justify-content: flex-end">
      <button type="button" class="op-btn" @click="step = 1">Voltar</button>
      <button type="button" class="op-btn" :disabled="busy || !catalogReady" @click="enqueueCatalog(true)">{{ busy ? 'Enfileirando…' : 'Simular catálogo' }}</button>
      <button type="button" class="op-btn op-btn--primary" :disabled="busy || !catalogReady" @click="enqueueCatalog(false)">Gerar catálogo <OrdoIcon name="arrow" :size="16" /></button>
    </div>
    <p v-if="!catalogReady && !translationsLoading" class="op-note" style="text-align: right">Escolha ao menos uma Bíblia ou “Só os textos do livro”.</p>
  </section>

  <template v-else-if="step === 3">
    <OrdoAudioGenerationReceipt
      v-if="estimate"
      :estimate="estimate"
      :title="receiptTitle"
      :description="receiptText"
      :start-date="startDate"
      :days="Number(days) || 1"
      :language="book?.language"
      :bible-name="bible ? bibleName : 'Bíblia padrão'"
      :busy="busy"
      :error="error"
      :running-now="runningNow"
      :duplicate="Boolean(duplicate)"
      @open-duplicate="openDuplicate"
      @back="step = 2"
      @scope="step = 2"
      @submit="submit"
    />
    <span v-else-if="busy" class="op-skeleton" style="height: 420px" aria-hidden="true" />
    <p v-else-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }} <button type="button" class="op-btn op-btn--small" @click="step = 2">Voltar</button></p>
  </template>
</template>
