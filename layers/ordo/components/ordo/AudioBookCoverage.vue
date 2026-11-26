<script setup lang="ts">
import OrdoAudioCoverageCalendar from './AudioCoverageCalendar.vue'
import OrdoAudioDayItems from './AudioDayItems.vue'
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioApi } from '../../composables/useAudioApi'
import { useAudioStore } from '../../composables/useAudioStore'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { createReport, errorText, isNotDeployed } from '../../composables/useReport'
import { toDateInput } from '../../utils/period'
import {
  calendarColumns,
  calendarFromDays,
  calendarFromRows,
  clock,
  coverageText,
  costOf,
  firstGap,
  liturgicalDaysFrom,
  number,
  officeOrder,
  percentOf,
  pricePer1k,
  pricePerThousand,
  providerName,
  sourceLabel,
  usd,
  visibleBibles
} from '../../utils/audio'
import type { AudioCatalogTranslation } from '../../types/dashboard'
import type { AudioEstimateDetail, AudioReadinessBible, AudioReadinessDetail, AudioSourceCount } from '../../types/audio'

// One book (`?secao=cobertura&livro=loc_2015&biblia=naa`): pick the Bible,
// see day by day where voice is missing, open a day's trechos and generate
// only what is missing. It reads the coverage the API stores each night; for
// a Bible the night does not compute, or an API without that endpoint, it
// asks the generation estimate, which assembles the same offices on the spot.
const store = useAudioStore()
const api = useAudioApi()
const ordo = useOrdoApi()

const days = ref<7 | 28>(28)
const showAllBibles = ref(false)
const picked = ref<{ date: string; office: string } | null>(null)
const today = toDateInput(new Date())
const code = computed(() => store.book.value)
const bible = computed(() => store.bible.value)

const detail = createReport<AudioReadinessDetail>(() => api.fetchReadinessBook(code.value, { bibleVersion: bible.value || undefined, days: days.value }))
const estimate = createReport<{ estimate: AudioEstimateDetail }>(() => api.estimate({
  prayer_book_code: code.value,
  start_date: today,
  days: days.value,
  preferences: bible.value ? { bible_version: bible.value } : {}
}))
const translations = ref<AudioCatalogTranslation[]>([])

const stored = computed(() => detail.state.data?.computed ? detail.state.data : null)
const source = computed<'stored' | 'estimate' | null>(() => stored.value ? 'stored' : estimate.state.data ? 'estimate' : null)

const load = async () => {
  estimate.reset()
  await detail.load()
  if (!detail.state.data?.computed && (detail.state.data || isNotDeployed(detail.state.error) || detail.state.error)) await estimate.load()
}

const loadTranslations = async () => {
  try {
    translations.value = ((await ordo.fetchAudioCatalogTranslations(code.value)).translations || []).filter(item => item.kind === 'bible')
  } catch {
    translations.value = []
  }
}

watch([code, bible, days], () => { picked.value = null; void load() })
watch(code, () => { showAllBibles.value = false; void loadTranslations() })
onMounted(() => { void load(); void loadTranslations() })

// --- The Bibles ------------------------------------------------------------
interface Chip { version: string; name: string; percentage: number | null; isDefault: boolean; featured: boolean; share?: number }
const bibles = computed<Chip[]>(() => {
  const fromDetail = detail.state.data?.bibles
  const fromNight = store.readiness.data?.books.find(book => book.prayer_book_code === code.value)?.bibles
  const list: AudioReadinessBible[] | undefined = fromDetail?.length ? fromDetail : fromNight
  if (list?.length) {
    return list.map(item => ({
      version: item.bible_version,
      name: item.name,
      percentage: item.percentage ?? item.totals?.percentage ?? null,
      isDefault: item.default,
      featured: item.featured,
      share: item.share
    }))
  }
  // Without the stored list, the Bibles of the book's language, the
  // recommended ones up front.
  return [{ version: '', name: 'Padrão do livro', percentage: null, isDefault: true, featured: true },
    ...translations.value.map(item => ({ version: item.code, name: item.name, percentage: null, isDefault: false, featured: Boolean(item.is_recommended) }))]
})
const visible = computed(() => visibleBibles(bibles.value.map(item => ({ ...item, default: item.isDefault })), showAllBibles.value).map(item => item as Chip & { default: boolean }))
const defaultVersion = computed(() => bibles.value.find(item => item.isDefault)?.version || '')
const current = computed(() => bibles.value.find(item => bible.value ? item.version === bible.value : item.isDefault) || null)
const bibleName = computed(() => stored.value?.bible_name || current.value?.name || (bible.value ? bible.value.toUpperCase() : 'padrão'))
const chooseBible = (version: string) => store.setParams({ biblia: !version || version === defaultVersion.value ? null : version })

// --- Numbers ---------------------------------------------------------------
const estimateData = computed(() => estimate.state.data?.estimate || null)
const totals = computed(() => {
  if (stored.value?.totals) return stored.value.totals
  const data = estimateData.value
  if (!data) return null
  return { ready_clips: data.ready_clips || 0, missing_clips: data.missing_clips || 0, missing_characters: data.missing_characters || 0, percentage: percentOf(data.ready_clips, data.missing_clips) }
})
const price = computed(() => pricePer1k(stored.value?.cost, estimateData.value?.cost, store.price.value))
const costUsd = computed(() => {
  if (stored.value?.cost?.usd !== undefined && stored.value?.cost?.usd !== null) return stored.value.cost.usd
  if (estimateData.value?.cost?.usd !== undefined && estimateData.value?.cost?.usd !== null) return estimateData.value.cost.usd
  if (estimateData.value?.estimated_cost !== undefined && estimateData.value?.estimated_cost !== null) return estimateData.value.estimated_cost
  return totals.value ? costOf(totals.value.missing_characters, price.value) : null
})
const providerText = computed(() => {
  const name = stored.value?.cost?.provider_name || estimateData.value?.cost?.provider_name || (estimateData.value?.provider?.provider ? providerName(estimateData.value.provider.provider) : store.providerLabel.value)
  const each = pricePerThousand(price.value)
  return each ? `${name} · ${each}` : name
})
const bySource = computed<AudioSourceCount[] | null>(() => {
  const list = stored.value?.by_source?.length ? stored.value.by_source : estimateData.value?.by_source
  return list?.length ? [...list].sort((a, b) => b.missing_characters - a.missing_characters) : null
})
const missingNote = computed(() => {
  const list = bySource.value
  const missing = totals.value?.missing_clips || 0
  if (!missing) return 'nada falta nesta janela'
  if (!list) return 'trechos sem voz ainda'
  const top = list[0]
  if (top && top.missing_clips / missing >= 0.8) return `quase todos ${sourceLabel(top.source).toLowerCase().replace(/ \(.*\)$/, '')}`
  return `em ${list.filter(item => item.missing_clips).length} tipos de texto`
})
const sourceMax = computed(() => Math.max(...(bySource.value || []).map(item => item.missing_clips), 1))

// --- Calendar --------------------------------------------------------------
const book = computed(() => store.bookOf(code.value))
const offices = computed(() => officeOrder(stored.value?.offices?.length ? stored.value.offices : estimateData.value?.offices?.length ? estimateData.value.offices : book.value?.available_offices?.length ? book.value.available_offices : ['morning', 'midday', 'evening', 'compline']))
const cells = computed(() => stored.value ? calendarFromDays(stored.value.calendar) : calendarFromRows(estimateData.value?.rows || []))
// The day's name in the book's calendar comes with the stored detail; the
// estimate and an API from before the field have none, and the day shows by
// its date.
const liturgical = computed(() => liturgicalDaysFrom(stored.value?.calendar))
const start = computed(() => stored.value?.start_date || today)
const columns = computed(() => calendarColumns(start.value, days.value, today))
const pick = computed(() => picked.value || firstGap(cells.value, columns.value, offices.value))
const pickedCell = computed(() => pick.value ? cells.value[pick.value.date]?.[pick.value.office] || null : null)

const generateDay = (date: string, office: string) => store.openGeneration({
  mode: 'office', prayer_book_code: code.value, bible_version: bible.value || undefined, start_date: date, days: 1, offices: [office], step: 3
})

const failed = computed(() => !source.value && !detail.state.loading && !estimate.state.loading && (estimate.state.error || (detail.state.error && !isNotDeployed(detail.state.error))))
const failedText = computed(() => errorText(estimate.state.error) || errorText(detail.state.error) || 'Não foi possível calcular a cobertura deste livro.')
const loading = computed(() => !source.value && !failed.value)
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-between">
      <div class="op-flex">
        <span class="op-eyebrow">Bíblia das leituras</span>
        <button v-for="item in visible" :key="item.version || 'default'" type="button" class="op-chip" :class="{ 'is-on': current ? current.version === item.version : item.isDefault }" :aria-pressed="current ? current.version === item.version : item.isDefault" @click="chooseBible(item.version)">
          {{ item.name }}<template v-if="item.percentage !== null"> · {{ coverageText(item.percentage) }}</template>
        </button>
        <button v-if="bibles.length > visible.length || showAllBibles" type="button" class="op-link" @click="showAllBibles = !showAllBibles">{{ showAllBibles ? 'só as escolhidas' : `mostrar todas (${bibles.length})` }}</button>
      </div>
      <div class="op-seg op-seg--small" role="group" aria-label="Janela">
        <button type="button" :class="{ 'is-on': days === 28 }" :aria-pressed="days === 28" @click="days = 28">28 dias</button>
        <button type="button" :class="{ 'is-on': days === 7 }" :aria-pressed="days === 7" @click="days = 7">7 dias</button>
      </div>
    </div>
    <hr class="op-hr">
    <div v-if="loading" class="op-grid" style="--op-min: 200px" aria-hidden="true">
      <span v-for="n in 4" :key="n" class="op-skeleton" style="height: 86px" />
    </div>
    <p v-else-if="failed" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ failedText }}</p>
    <div v-else-if="totals" class="op-grid" style="--op-min: 200px">
      <div class="op-metric"><span class="op-metric__label">Prontos</span><span class="op-metric__value">{{ number(totals.ready_clips) }}</span><span class="op-metric__sub">trechos que já têm voz</span></div>
      <div class="op-metric"><span class="op-metric__label">Faltando</span><span class="op-metric__value">{{ number(totals.missing_clips) }}</span><span class="op-metric__sub">{{ missingNote }}</span></div>
      <div class="op-metric"><span class="op-metric__label">Caracteres a narrar</span><span class="op-metric__value">{{ number(totals.missing_characters) }}</span><span class="op-metric__sub">só o que falta; o resto é reaproveitado</span></div>
      <div class="op-metric"><span class="op-metric__label">Custo estimado</span><span class="op-metric__value">{{ usd(costUsd) }}</span><span class="op-metric__sub">{{ providerText }}</span></div>
    </div>
  </section>

  <section v-if="source" class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Dia a dia · {{ bibleName }}</p>
        <h2>Onde falta voz</h2>
        <p>Cada quadrado é um ofício de um dia. Clique para ver os trechos.</p>
      </div>
      <span v-if="source === 'stored'" class="op-pill op-pill--quiet"><OrdoIcon name="clock" :size="14" />Calculado às {{ clock(stored?.computed_at) }}</span>
      <span v-else class="op-pill op-pill--ok"><OrdoIcon name="check" :size="14" />Calculado agora pela estimativa</span>
    </div>
    <OrdoAudioCoverageCalendar :columns="columns" :offices="offices" :cells="cells" :liturgical="liturgical" :picked="pick" @pick="(date, office) => picked = { date, office }" />
    <div class="op-panel__foot">
      <span class="op-legend">
        <span><i class="op-swatch op-c4" />tudo pronto</span>
        <span><i class="op-swatch op-c3" />quase (90%+)</span>
        <span><i class="op-swatch op-c2" />metade ou mais</span>
        <span><i class="op-swatch op-c1" />pouco</span>
        <span><i class="op-swatch op-c0" />nada</span>
      </span>
      <span>Domingo em vermelho, como no calendário. Contorno: hoje.</span>
    </div>
  </section>

  <section v-if="source" class="op-row" style="align-items: stretch">
    <section class="op-card op-panel op-grow-1">
      <div class="op-panel__heading">
        <p class="op-eyebrow">O que falta</p>
        <h3>Por tipo de texto</h3>
      </div>
      <ul v-if="bySource" class="op-barlist">
        <li v-for="item in bySource" :key="item.source" class="op-barlist__row">
          <div class="op-barlist__body">
            <div class="op-barlist__line">
              <span class="op-barlist__label">{{ sourceLabel(item.source, bibleName) }}</span>
              <span class="op-barlist__value"><strong>{{ number(item.missing_clips) }}</strong> · {{ item.missing_clips ? `${number(item.missing_characters)} car.` : 'pronto' }}</span>
            </div>
            <div class="op-track"><span :style="{ width: `${item.missing_clips / sourceMax * 100}%`, background: 'var(--op-warn)' }" /></div>
          </div>
        </li>
      </ul>
      <OrdoSoonState v-else title="Em breve" text=" Esta API devolve só os totais por dia e ofício; separar o que falta por tipo de texto chega com a próxima versão." />
    </section>
    <OrdoAudioDayItems
      v-if="pick"
      class="op-grow-2"
      :book="code"
      :bible="bible"
      :bible-name="bibleName"
      :date="pick.date"
      :office="pick.office"
      :cell="pickedCell"
      :liturgical-day="liturgical[pick.date] || null"
      @generate="generateDay"
    />
  </section>
</template>
