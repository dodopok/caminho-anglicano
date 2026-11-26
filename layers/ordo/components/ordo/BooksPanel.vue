<script setup lang="ts">
import OrdoBookDetail from './BookDetail.vue'
import OrdoBooksGallery, { type BooksKpis } from './BooksGallery.vue'
import OrdoBooksRanking, { type CompareLine } from './BooksRanking.vue'
import OrdoIcon from './Icon.vue'
import { useBooksApi } from '../../composables/useBooksApi'
import { useDashboardContext } from '../../composables/useDashboardContext'
import { usePortalHead, type PortalHead } from '../../composables/usePortalHead'
import { usePortalQuery } from '../../composables/usePortalQuery'
import { createReport, errorText } from '../../composables/useReport'
import { comparedWindow, periodPhrase, usagePeriod, usageWindow } from '../../utils/usage'
import {
  booksCsv,
  buildBookRows,
  catalogCounts,
  COMPARE_METRICS,
  compareToQuery,
  filterBooks,
  languageLabel,
  languagesOf,
  parseBooksQuery,
  sortBooks,
  toggleCompare,
  type CompareMetric,
  type RankingSort
} from '../../utils/books'
import type { PortalLocation } from '../../utils/portalRoute'
import type { PeriodValue } from '../../utils/period'
import type { AdminPrayerBookDetailResponse } from '../../types/books'
import type { DashboardData } from '../../types/dashboard'

// The "Livros" tab: the gallery, the ranking and each book's page. The admin
// endpoint (`/admin/prayer_books`, API-livros.md) is preferred for every
// number it has, books in pre-release included. Until it is deployed it
// answers 404 and the tab is drawn from the public catalog, Áudio's stored
// coverage (whose `readers` is "usam hoje"), the dashboard and the usage
// telemetry, with "em breve" where nothing has the number yet.
const props = withDefaults(defineProps<{
  dashboard: DashboardData
  period: PeriodValue
  /** Bumped by the page's refresh button. */
  reloadKey: number
  /** Today, for tests and screenshots; the real clock otherwise. */
  now?: Date | null
}>(), { now: null })

const emit = defineEmits<{ navigate: [location: PortalLocation] }>()

const api = useBooksApi()
const portalQuery = usePortalQuery()
const context = useDashboardContext()
const address = computed(() => parseBooksQuery(portalQuery.values.value))

const today = () => props.now ? new Date(props.now) : new Date()
// The admin endpoints take at most 366 days, up to today; the telemetry
// (opens) reads up to yesterday, the last day its nightly rollup closed.
const window = computed(() => usagePeriod(props.period))
const compare = computed(() => props.period.preset !== 'all')
const previousWindow = computed(() => compare.value ? comparedWindow(props.period, window.value) : null)
const telemetry = computed(() => usageWindow(props.period, today()))
const windowKey = computed(() => `${window.value.start_date}|${window.value.end_date}|${props.reloadKey}`)

// --- Reports -------------------------------------------------------------------

const admin = createReport(() => api.list(window.value, compare.value), { lazy: false })
const catalog = createReport(() => api.catalog())
const readiness = createReport(() => api.readiness(), { lazy: false })
const pdfOpens = createReport(() => api.opensByBook(telemetry.value, 'pdf_opened'))
const documentOpens = createReport(() => api.opensByBook(telemetry.value, 'document_opened'))

const bookCode = computed(() => address.value.book)
const detail = createReport(() => api.detail(bookCode.value as string, window.value, compare.value))
const cmsDocuments = createReport(() => api.cmsDocuments(bookCode.value as string))
const documentOpensBySlug = createReport(() => api.documentOpens(telemetry.value, bookCode.value as string))

const perBook = computed(() => Boolean(admin.state.data))

const loadList = async () => {
  await admin.load()
  // Without the admin endpoint the books come from the public catalog.
  if (!admin.state.data && !catalog.state.data) await catalog.load()
}

const load = () => Promise.all([
  loadList(),
  readiness.load(),
  pdfOpens.load(),
  documentOpens.load()
])

const loadBook = async () => {
  if (!bookCode.value) {
    detail.reset()
    cmsDocuments.reset()
    documentOpensBySlug.reset()
    return
  }
  documentOpensBySlug.load()
  await detail.load()
  // The detail brings the CMS documents; ask the CMS only when it cannot.
  if (!detail.state.data?.documents) cmsDocuments.load()
  else cmsDocuments.reset()
}

watch(windowKey, () => {
  load()
  if (bookCode.value) loadBook()
}, { immediate: true })
watch(bookCode, () => loadBook(), { immediate: true })

// --- Rows ----------------------------------------------------------------------

const rows = computed(() => buildBookRows({
  admin: admin.state.data,
  catalog: catalog.state.data,
  readiness: readiness.state.data,
  dashboard: props.dashboard,
  previous: context.previous.value,
  pdfOpens: pdfOpens.state.data,
  documentOpens: documentOpens.state.data
}))
const filtered = computed(() => filterBooks(rows.value, address.value.filters))
const ranked = computed(() => sortBooks(filtered.value, address.value.sort))
const isFiltered = computed(() => {
  const filters = address.value.filters
  return Boolean(filters.search || filters.language || filters.premium || filters.prerelease)
})
const languages = computed(() => languagesOf(rows.value))

const listLoading = computed(() => !admin.state.settled || admin.state.loading || (!admin.state.data && (catalog.state.loading || !catalog.state.settled)))
const listFailed = computed(() => !listLoading.value && !rows.value.length && Boolean(catalog.state.error) && !admin.state.data)
const adminError = computed(() => admin.state.soon ? null : errorText(admin.state.error))

const kpis = computed<BooksKpis>(() => {
  const counts = catalogCounts(rows.value)
  const totals = admin.state.data?.totals || null
  const previous = context.previous.value
  return {
    total: totals?.books ?? counts.total,
    open: counts.open,
    prerelease: counts.prerelease,
    premium: counts.premium,
    usingToday: totals?.users_current ?? counts.usingToday,
    newUsers: totals?.new_users ?? counts.newUsers,
    newUsersPrevious: totals?.previous?.new_users ?? counts.newUsersPrevious,
    praying: totals?.praying_users ?? props.dashboard.users?.active_users_in_period ?? null,
    prayingPrevious: totals?.previous?.praying_users ?? previous?.users?.active_users_in_period ?? null
  }
})
const kpisLoading = computed(() => listLoading.value || (!perBook.value && context.isPending('onboarding', 'users')))

const book = computed(() => bookCode.value ? rows.value.find(row => row.code === bookCode.value) || null : null)
const readinessBook = computed(() => readiness.state.data?.books?.find(item => item.prayer_book_code === bookCode.value) || null)
const labels = computed(() => Object.fromEntries(rows.value.map(row => [row.code, row.label])))
const pdfUrlFor = (code: string) => {
  const row = rows.value.find(item => item.code === code)
  if (!row) return null
  if (row.pdf === undefined) return row.pdfUrl
  return row.pdf?.published ? api.pdfUrl(code) : null
}

// --- Address -------------------------------------------------------------------

const hrefFor = (code: string) => `?${new URLSearchParams({ ...portalQuery.values.value, livro: code }).toString()}`
const scrollTop = () => {
  if (import.meta.client) globalThis.window?.scrollTo({ top: 0, behavior: 'smooth' })
}
const openBook = (code: string) => {
  portalQuery.set({ livro: code }, { push: true })
  scrollTop()
}
const closeBook = () => portalQuery.set({ livro: null }, { push: true })
const setView = (view: 'galeria' | 'ranking', sort?: RankingSort) => {
  const patch: Record<string, string | null> = { vista: view === 'galeria' ? null : view }
  if (sort) patch.ordem = sort === 'rezaram' ? null : sort
  portalQuery.set(patch, { push: true })
}
const setSort = (sort: RankingSort) => portalQuery.set({ ordem: sort === 'rezaram' ? null : sort })
const setFilter = (patch: Record<string, string | null>) => portalQuery.set(patch)
const onSearch = (event: Event) => setFilter({ busca: (event.target as HTMLInputElement).value || null })
const onLanguage = (event: Event) => setFilter({ idioma: (event.target as HTMLSelectElement).value || null })

const metric = computed<CompareMetric>(() => {
  const value = portalQuery.values.value.metrica as CompareMetric
  return (COMPARE_METRICS as readonly string[]).includes(value) ? value : 'pessoas'
})
const setMetric = (value: CompareMetric) => portalQuery.set({ metrica: value === 'pessoas' ? null : value })
const indexed = computed(() => portalQuery.values.value.escala === 'indice')
const setIndexed = (value: boolean) => portalQuery.set({ escala: value ? 'indice' : null })

// --- Comparison ----------------------------------------------------------------

// Until someone picks, the three books most people prayed with.
const compared = computed(() => {
  if (address.value.compare.length) return address.value.compare
  return sortBooks(rows.value, 'rezaram').filter(row => row.praying).slice(0, 3).map(row => row.code)
})
const toggle = (code: string) => portalQuery.set({ comparar: compareToQuery(toggleCompare(compared.value, code)) })

const compareDetails = createReport(async () => {
  const codes = compared.value
  const settled = await Promise.allSettled(codes.map(code => api.detail(code, window.value, false)))
  if (settled.length && settled.every(result => result.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason
  return Object.fromEntries(codes.flatMap((code, index) => {
    const result = settled[index]
    return result.status === 'fulfilled' ? [[code, result.value]] : []
  })) as Record<string, AdminPrayerBookDetailResponse>
})
const compareKey = computed(() => address.value.view === 'ranking' && perBook.value && !bookCode.value ? `${compared.value.join(',')}|${windowKey.value}` : '')
watch(compareKey, (key) => { if (key) compareDetails.load() }, { immediate: true })

const FIELD: Record<CompareMetric, 'praying_users' | 'completions' | 'new_users'> = { pessoas: 'praying_users', oficios: 'completions', chegadas: 'new_users' }
const compareLines = computed<CompareLine[]>(() => {
  const details = compareDetails.state.data || {}
  return compared.value.flatMap((code) => {
    const series = details[code]?.series
    if (!series) return []
    return [{ code, label: labels.value[code] || code, values: series.map(day => day[FIELD[metric.value]] ?? null) }]
  })
})
const compareDates = computed(() => {
  const details = compareDetails.state.data || {}
  const first = compared.value.map(code => details[code]?.series).find(Boolean)
  return first ? first.map(day => day.date) : []
})
const compareState = computed<'soon' | 'loading' | 'ready' | 'error'>(() => {
  if (!perBook.value) return 'soon'
  if (compareDetails.state.soon) return 'soon'
  if (compareDetails.state.loading || (!compareDetails.state.settled && compared.value.length)) return 'loading'
  if (compareDetails.state.error) return 'error'
  return 'ready'
})

const exportCsv = () => {
  if (!import.meta.client) return
  const blob = new Blob([`\uFEFF${booksCsv(ranked.value)}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `livros-${window.value.start_date}-a-${window.value.end_date}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// --- Head ----------------------------------------------------------------------

const generatedAt = computed(() => (bookCode.value ? detail.state.data?.generated_at : null) || admin.state.data?.generated_at || null)
usePortalHead((): PortalHead => {
  const at = generatedAt.value ? new Date(generatedAt.value) : null
  const live = at && !Number.isNaN(at.getTime())
    ? { text: `Dados de ${at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · atualizam a cada 10 min`, tone: 'idle' as const }
    : undefined
  const current = book.value
  if (!current) return { live, crumb: address.value.view === 'ranking' && !bookCode.value ? 'Ranking' : bookCode.value || undefined }
  const pdf = pdfUrlFor(current.code)
  const where = current.jurisdiction || ''
  return {
    title: current.name,
    crumb: current.code,
    live,
    description: current.gated
      ? `${where ? `${where}. ` : ''}Em pré-lançamento: só aparece para quem a flag liberar.`
      : `${where ? `${where}. ` : ''}${languageLabel(current.language)}${current.year ? `, ${current.year}` : ''}.`,
    actions: [
      ...(pdf ? [{ key: 'pdf', label: 'Abrir PDF', icon: 'file' as const, variant: 'link' as const, onClick: () => { globalThis.window?.open(pdf, '_blank', 'noopener') } }] : []),
      { key: 'audio', label: 'Cobertura de áudio', icon: 'audio' as const, variant: 'secondary' as const, onClick: () => emit('navigate', { tab: 'audio', params: { secao: 'cobertura', livro: current.code } }) }
    ]
  }
})

const phrase = computed(() => periodPhrase(props.period, window.value))
</script>

<template>
  <div class="op-books-tab">
    <div v-if="bookCode" class="op-tabbar">
      <button type="button" class="op-link" @click="closeBook"><OrdoIcon name="chevron-left" :size="14" />Todos os livros</button>
    </div>
    <div v-else class="op-tabbar">
      <div class="op-seg" role="tablist" aria-label="Vista">
        <button type="button" role="tab" :aria-selected="address.view === 'galeria'" :class="{ 'is-on': address.view === 'galeria' }" @click="setView('galeria')"><OrdoIcon name="overview" :size="15" />Galeria</button>
        <button type="button" role="tab" :aria-selected="address.view === 'ranking'" :class="{ 'is-on': address.view === 'ranking' }" @click="setView('ranking')"><OrdoIcon name="table" :size="15" />Ranking</button>
      </div>
      <div class="op-filters">
        <label class="op-search op-books-tab__search">
          <OrdoIcon name="search" :size="18" />
          <input class="op-field" type="search" placeholder="Buscar livro ou código" aria-label="Buscar livro ou código" :value="address.filters.search" @input="onSearch">
        </label>
        <select class="op-field" aria-label="Idioma" :value="address.filters.language" @change="onLanguage">
          <option value="">Todos os idiomas</option>
          <option v-for="language in languages" :key="language" :value="language">{{ languageLabel(language) }}</option>
        </select>
        <button type="button" class="op-chip" :class="{ 'is-on': address.filters.premium }" :aria-pressed="address.filters.premium" @click="setFilter({ ordomais: address.filters.premium ? null : '1' })"><OrdoIcon name="lock" :size="14" />Ordo+</button>
        <button v-if="perBook" type="button" class="op-chip" :class="{ 'is-on': address.filters.prerelease }" :aria-pressed="address.filters.prerelease" @click="setFilter({ prelancamento: address.filters.prerelease ? null : '1' })"><OrdoIcon name="flag" :size="14" />Pré-lançamento</button>
      </div>
    </div>

    <p v-if="admin.state.soon && rows.length" class="op-inline-note">
      <OrdoIcon name="clock" :size="18" />
      <span>Em breve: quem rezou com cada livro, a linha do período, as trocas entre livros e os livros em pré-lançamento. Os outros números já são os de hoje.</span>
    </p>
    <p v-else-if="adminError && rows.length" class="op-inline-error" role="alert">
      <OrdoIcon name="alert" :size="18" />
      <span style="flex: 1">Não foi possível ler os números por livro ({{ adminError }}). Mostrando o catálogo público.</span>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </p>
    <p v-if="perBook && window.clamped" class="op-inline-note">
      <OrdoIcon name="info" :size="18" />
      <span>Os livros cobrem no máximo 366 dias: mostrando os 366 dias até hoje.</span>
    </p>

    <section v-if="listFailed" class="op-state op-state--error" role="alert">
      <h2>Não foi possível ler os livros</h2>
      <p>{{ errorText(catalog.state.error) || errorText(admin.state.error) || 'Tente de novo em instantes.' }}</p>
      <button type="button" class="op-btn op-btn--small" @click="load">Tentar de novo</button>
    </section>

    <template v-else-if="bookCode">
      <OrdoBookDetail
        v-if="book"
        :key="book.code"
        :book="book"
        :detail="detail.state"
        :readiness="readinessBook"
        :readiness-loading="readiness.state.loading"
        :cms-documents="cmsDocuments.state"
        :document-opens="documentOpensBySlug.state"
        :dashboard="dashboard"
        :window="window"
        :previous-window="previousWindow"
        :previous-label="context.previousLabel.value"
        :metric="metric"
        :labels="labels"
        :pdf-url="pdfUrlFor(book.code)"
        :cms-url="api.cmsEditorUrl(book.code)"
        @navigate="emit('navigate', $event)"
        @metric="setMetric"
      />
      <div v-else-if="listLoading" class="op-skeleton" style="height: 420px; border-radius: 24px" aria-hidden="true" />
      <section v-else class="op-state">
        <h2>Livro não encontrado</h2>
        <p v-if="perBook">Nenhum livro do catálogo tem o código <span class="op-loc">{{ bookCode }}</span>.</p>
        <p v-else>O código <span class="op-loc">{{ bookCode }}</span> não está no catálogo público. Livros em pré-lançamento aparecem aqui em breve.</p>
        <button type="button" class="op-btn op-btn--small" @click="closeBook">Ver todos os livros</button>
      </section>
    </template>

    <OrdoBooksRanking
      v-else-if="address.view === 'ranking'"
      :rows="ranked"
      :sort="address.sort"
      :compare="compared"
      :compare-lines="compareLines"
      :compare-dates="compareDates"
      :compare-state="compareState"
      :metric="metric"
      :indexed="indexed"
      :per-book="perBook"
      :previous-label="context.previousLabel.value"
      :href-for="hrefFor"
      @open="openBook"
      @sort="setSort"
      @toggle="toggle"
      @metric="setMetric"
      @indexed="setIndexed"
      @export="exportCsv"
    />

    <OrdoBooksGallery
      v-else
      :rows="filtered"
      :all-rows="rows"
      :kpis="kpis"
      :loading="kpisLoading"
      :per-book="perBook"
      :phrase="phrase"
      :previous-label="context.previousLabel.value"
      :filtered="isFiltered"
      :href-for="hrefFor"
      @open="openBook"
      @ranking="setView('ranking', $event)"
    />
  </div>
</template>
