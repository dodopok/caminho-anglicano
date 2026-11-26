<script setup lang="ts">
import OrdoBookCover from './BookCover.vue'
import OrdoIcon, { type OrdoIconName } from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoSoonState from './SoonState.vue'
import OrdoTrendChart from './TrendChart.vue'
import { comparePeriods } from '../../utils/compare'
import { buildSeries, officeMeta } from '../../utils/series'
import { shortDate, windowLabel } from '../../utils/usage'
import {
  COMPARE_METRICS,
  documentRows,
  formatBytes,
  formatCount,
  formatPerPerson,
  formatRate,
  languageLabel,
  missingForLaunch,
  narrationCell,
  narrationColor,
  narrationRows,
  officeShares,
  retentionFor,
  switchBars,
  type BookRow,
  type CompareMetric
} from '../../utils/books'
import type { Report } from '../../composables/useReport'
import type { PortalLocation } from '../../utils/portalRoute'
import type { AudioReadinessBook } from '../../types/audio'
import type { AdminPrayerBookDetailResponse, CmsPrayerBookDocument } from '../../types/books'
import type { DashboardData } from '../../types/dashboard'
import type { UsageContentResponse, UsageQuery } from '../../types/usage'

// One book: the cover beside its facts and shortcuts, five numbers, who prays
// with it day by day, whether those who arrive stay, the narration, the PDF
// and documents, and what the community makes of it. Each section reads the
// best source it has and says "em breve" where the API has nothing yet.
const props = defineProps<{
  book: BookRow
  detail: Report<AdminPrayerBookDetailResponse>
  readiness: AudioReadinessBook | null
  readinessLoading: boolean
  cmsDocuments: Report<CmsPrayerBookDocument[]>
  documentOpens: Report<UsageContentResponse>
  dashboard: DashboardData
  window: UsageQuery
  previousWindow: UsageQuery | null
  previousLabel: string
  metric: CompareMetric
  /** Labels of the other books, for "vieram de" and "foram para". */
  labels: Record<string, string>
  pdfUrl: string | null
  cmsUrl: string
}>()

const emit = defineEmits<{
  navigate: [location: PortalLocation]
  metric: [metric: CompareMetric]
}>()

const data = computed(() => props.detail.data)
const soon = computed(() => props.detail.soon)
const loading = computed(() => props.detail.loading && !props.detail.data)
const failed = computed(() => Boolean(props.detail.error) && !props.detail.soon && !props.detail.data)

// --- Facts -------------------------------------------------------------------

const offices = computed(() => {
  const list = data.value?.readiness?.offices || props.book.offices
  return list.length ? list.map(office => officeMeta(office).label).join(', ') : '—'
})
const bibles = computed(() => {
  const list = props.readiness?.bibles || []
  const main = list.find(bible => bible.default) || null
  const others = list.filter(bible => !bible.default && bible.featured).length
  const name = main?.name || props.book.defaultBible?.toUpperCase() || '—'
  return others ? `${name} · mais ${others} ${others === 1 ? 'escolhida' : 'escolhidas'}` : name
})

const documents = computed(() => {
  const fromApi = data.value?.documents
  if (fromApi) return fromApi
  return props.cmsDocuments.data
})
const documentCount = computed<number | null>(() => {
  if (documents.value) return documents.value.length
  return props.book.documents ?? null
})
const documentList = computed(() => documentRows(documents.value, props.documentOpens.data?.rows || null))
const maxOpens = computed(() => Math.max(1, ...documentList.value.map(row => row.opens || 0)))

const flagText = computed(() => {
  const flag = props.book.flag
  if (!flag) return ''
  const people = flag.users_count ?? 0
  if (flag.rule === 'on') return 'ligada para todos'
  return people ? `ligada para ${formatCount(people)} ${people === 1 ? 'pessoa' : 'pessoas'}` : 'desligada para todos'
})

interface LinkItem {
  key: string
  icon: OrdoIconName
  tone: string
  title: string
  sub: string
  href?: string
  go?: () => void
  soon?: boolean
}

const links = computed<LinkItem[]>(() => {
  const book = props.book
  const items: LinkItem[] = []
  items.push({
    key: 'audio',
    icon: 'audio',
    tone: book.narration === null ? 'op-tone-quiet' : book.narration >= 100 ? 'op-tone-ok' : 'op-tone-warn',
    title: book.narration === null ? 'Narração —' : `Narração ${formatRate(Math.floor(book.narration))}`,
    sub: 'próximas 4 semanas',
    go: () => emit('navigate', { tab: 'audio', params: { secao: 'cobertura', livro: book.code } })
  })
  items.push({
    key: 'usage',
    icon: 'activity',
    tone: 'op-tone-info',
    title: 'Uso deste livro',
    sub: 'app, web e livros em Uso › Público',
    go: () => emit('navigate', { tab: 'usage', params: { secao: 'publico' } })
  })
  if (book.pdf === null) {
    items.push({ key: 'pdf', icon: 'file', tone: 'op-tone-warn', title: 'Sem PDF', sub: 'nada publicado ainda' })
  } else if (props.pdfUrl && (book.pdf?.published || book.pdf === undefined)) {
    const pages = book.pdf?.pages ? ` · ${formatCount(book.pdf.pages)} páginas` : ''
    items.push({ key: 'pdf', icon: 'file', tone: 'op-tone-quiet', title: `PDF${pages}`, sub: book.pdfOpens !== null ? `aberto ${formatCount(book.pdfOpens)} ${book.pdfOpens === 1 ? 'vez' : 'vezes'}` : 'abrir o arquivo', href: props.pdfUrl })
  }
  if (documentCount.value !== null) {
    items.push({
      key: 'docs',
      icon: 'book',
      tone: documentCount.value ? 'op-tone-quiet' : 'op-tone-warn',
      title: documentCount.value ? `${formatCount(documentCount.value)} ${documentCount.value === 1 ? 'documento' : 'documentos'}` : 'Nenhum documento',
      sub: 'no CMS',
      href: props.cmsUrl
    })
  }
  if (book.flag) items.push({ key: 'flag', icon: 'flag', tone: book.gated ? 'op-tone-warn' : 'op-tone-quiet', title: book.flag.key, sub: flagText.value })
  else if (book.flag === null) items.push({ key: 'flag', icon: 'flag', tone: 'op-tone-quiet', title: 'Sem flag', sub: 'aberto a todos' })
  return items
})

// --- Pre-release -------------------------------------------------------------

const launch = computed(() => {
  if (!props.book.gated) return null
  const readiness = data.value?.readiness
  const ready = [
    readiness?.cover || props.book.cover ? 'capa' : '',
    (readiness?.offices || props.book.offices).length ? 'ofícios' : '',
    readiness?.lectionary_until ? `lecionário até ${shortDate(readiness.lectionary_until)}` : ''
  ].filter(Boolean)
  const missing = missingForLaunch(props.book, documentCount.value)
  return { ready, missing }
})

// --- Numbers -----------------------------------------------------------------

const metrics = computed(() => {
  const book = props.book
  return {
    newUsers: comparePeriods(book.newUsers, book.newUsersPrevious),
    praying: comparePeriods(book.praying, book.prayingPrevious),
    completions: comparePeriods(book.completions, book.completionsPrevious)
  }
})

// --- Series ------------------------------------------------------------------

const METRIC_LABELS: Record<CompareMetric, string> = { pessoas: 'Pessoas', oficios: 'Ofícios', chegadas: 'Chegadas' }
const FIELD: Record<CompareMetric, 'praying_users' | 'completions' | 'new_users'> = { pessoas: 'praying_users', oficios: 'completions', chegadas: 'new_users' }
const seriesPoints = computed(() => {
  const series = data.value?.series
  if (!series?.length) return []
  const field = FIELD[props.metric]
  const start = data.value?.period?.start_date || props.window.start_date
  const end = data.value?.period?.end_date || props.window.end_date
  return buildSeries(series.map(day => ({ date: day.date, value: day[field] ?? 0 })), start, end)
})
const seriesPrevious = computed(() => {
  const previous = data.value?.previous_series
  if (!previous?.length) return null
  const field = FIELD[props.metric]
  return previous.map(day => day[field] ?? null)
})
const SERIES_WORDS: Record<CompareMetric, string> = {
  pessoas: 'Pessoas distintas que rezaram ao menos um ofício nele, por dia.',
  oficios: 'Ofícios rezados nele, por dia.',
  chegadas: 'Contas novas que o escolheram no primeiro acesso, por dia.'
}
const currentLabel = computed(() => windowLabel(data.value?.period || props.window))
const previousRange = computed(() => windowLabel(data.value?.previous_period || props.previousWindow))

// --- Habit -------------------------------------------------------------------

const retention = computed(() => retentionFor(data.value?.retention, props.dashboard, props.book.code))
const hours = computed(() => officeShares(data.value?.by_office_type))

// --- Switches ----------------------------------------------------------------

const switches = computed(() => {
  const value = data.value?.switches
  if (!value) return null
  return {
    from: switchBars(value.came_from?.books, props.labels, 3, value.came_from?.total),
    to: switchBars(value.went_to?.books, props.labels, 3, value.went_to?.total),
    chosen: value.onboarding_users ?? null,
    current: value.users_current ?? null
  }
})

// --- Narration ---------------------------------------------------------------

const narration = computed(() => narrationRows(props.readiness))
const narrationOffices = computed(() => narration.value[0]?.cells.map(cell => cell.office) || [])
const SHORT_OFFICES: Record<string, string> = { compline: 'Compl.', midday: 'M.-dia' }
const shortOffice = (office: string) => SHORT_OFFICES[office] || officeMeta(office).label

// --- Community ---------------------------------------------------------------

const clients = computed(() => {
  const value = data.value?.clients
  const total = value?.total || ((value?.app || 0) + (value?.web || 0) + (value?.other || 0))
  if (!value || !total) return null
  return `${formatRate((value.app || 0) / total * 100)} · ${formatRate((value.web || 0) / total * 100)}`
})

const pdfSize = computed(() => [
  props.book.pdf?.pages ? `${formatCount(props.book.pdf.pages)} páginas` : '',
  formatBytes(props.book.pdf?.bytes) || ''
].filter(Boolean).join(' · '))
</script>

<template>
  <section v-if="launch" class="op-summary op-summary--warn" aria-label="Pré-lançamento">
    <span class="op-summary__mark"><OrdoIcon name="flag" :size="26" /></span>
    <div class="op-summary__copy">
      <strong>{{ launch.missing.length ? 'Em pré-lançamento.' : 'Pronto para lançar.' }}</strong>
      <span>
        <template v-if="launch.ready.length">{{ launch.ready.join(', ').replace(/^./, letter => letter.toUpperCase()) }} {{ launch.ready.length === 1 ? 'está' : 'estão' }} no lugar. </template>
        <template v-if="launch.missing.length">
          {{ launch.missing.length === 1 ? 'Falta' : 'Faltam' }}
          <template v-for="(item, index) in launch.missing" :key="index"><template v-for="(part, j) in item" :key="j"><b v-if="part.strong">{{ part.text }}</b><template v-else>{{ part.text }}</template></template>{{ index < launch.missing.length - 2 ? ', ' : index === launch.missing.length - 2 ? ' e ' : '.' }}</template>
        </template>
        <template v-if="book.flag?.users_count"> {{ formatCount(book.flag.users_count) }} {{ book.flag.users_count === 1 ? 'pessoa de teste vê' : 'pessoas de teste veem' }} o livro<template v-if="book.completions !== null"> e {{ book.completions === 1 ? 'rezou' : 'rezaram' }} {{ formatCount(book.completions) }} {{ book.completions === 1 ? 'ofício' : 'ofícios' }} no período</template>.</template>
      </span>
    </div>
    <div v-if="book.narration !== null && book.narration < 100" class="op-summary__actions">
      <button type="button" class="op-btn op-btn--small" @click="emit('navigate', { tab: 'audio', params: { secao: 'nova-geracao', livro: book.code } })">Gerar o que falta</button>
    </div>
  </section>

  <section class="op-card op-bookhero" aria-label="O livro">
    <div class="op-bookhero__shelf"><OrdoBookCover :src="book.cover" :name="book.name" /></div>
    <div class="op-bookhero__copy">
      <div class="op-flex">
        <span v-if="book.isDefault" class="op-pill op-pill--info">Padrão do app</span>
        <span v-if="book.recommended" class="op-pill op-pill--ok"><OrdoIcon name="star" :size="12" />Recomendado</span>
        <span v-if="book.premium" class="op-pill op-pill--gold"><OrdoIcon name="lock" :size="12" />Ordo+</span>
        <span v-else class="op-pill op-pill--quiet">Grátis</span>
        <span v-if="book.gated" class="op-pill op-pill--warn"><OrdoIcon name="flag" :size="12" />Pré-lançamento<template v-if="book.flag?.users_count"> · {{ formatCount(book.flag.users_count) }} {{ book.flag.users_count === 1 ? 'pessoa' : 'pessoas' }}</template></span>
        <span v-else-if="book.flag !== undefined" class="op-pill op-pill--quiet"><OrdoIcon name="globe" :size="12" />Aberto a todos</span>
        <span v-if="book.externalOnly" class="op-pill op-pill--quiet">Só pela API</span>
      </div>
      <p v-if="book.description" class="op-bookhero__desc">{{ book.description }}</p>
      <dl class="op-facts">
        <div><dt>Código</dt><dd><OrdoLocBadge :code="book.code" /></dd></div>
        <div><dt>Idioma</dt><dd>{{ languageLabel(book.language) }}</dd></div>
        <div><dt>Ano</dt><dd>{{ book.year || '—' }}</dd></div>
        <div><dt>Ofícios</dt><dd>{{ offices }}</dd></div>
        <div><dt>Bíblia padrão</dt><dd>{{ bibles }}</dd></div>
      </dl>
      <div class="op-links">
        <template v-for="item in links" :key="item.key">
          <a v-if="item.href" class="op-attn__item" :href="item.href" target="_blank" rel="noopener">
            <span class="op-attn__icon" :class="item.tone"><OrdoIcon :name="item.icon" :size="18" /></span>
            <span class="op-attn__copy"><strong>{{ item.title }}</strong><span>{{ item.sub }}</span></span>
            <span class="op-attn__go"><OrdoIcon name="external" :size="14" /></span>
          </a>
          <button v-else-if="item.go" type="button" class="op-attn__item" @click="item.go()">
            <span class="op-attn__icon" :class="item.tone"><OrdoIcon :name="item.icon" :size="18" /></span>
            <span class="op-attn__copy"><strong>{{ item.title }}</strong><span>{{ item.sub }}</span></span>
            <span class="op-attn__go"><OrdoIcon name="arrow" :size="14" /></span>
          </button>
          <div v-else class="op-attn__item is-static">
            <span class="op-attn__icon" :class="item.tone"><OrdoIcon :name="item.icon" :size="18" /></span>
            <span class="op-attn__copy"><strong :class="{ 'op-mono': item.key === 'flag' && book.flag }">{{ item.title }}</strong><span>{{ item.sub }}</span></span>
          </div>
        </template>
      </div>
    </div>
  </section>

  <section class="op-tiles op-tiles--5" aria-label="Números do livro">
    <OrdoMetricCard title="Usam hoje" :value="formatCount(book.usingToday)" scope="lifetime" subtitle="pessoas com este livro escolhido hoje" />
    <OrdoMetricCard title="Escolheram ao chegar" :value="formatCount(book.chosenAtStart)" scope="lifetime" subtitle="no primeiro acesso, desde sempre" />
    <OrdoMetricCard title="Chegaram" :value="formatCount(book.newUsers)" scope="period" :delta="metrics.newUsers" :delta-label="previousLabel" subtitle="contas novas que escolheram este livro" />
    <OrdoMetricCard title="Rezaram" :value="formatCount(book.praying)" :scope="book.praying !== null ? 'period' : null" :delta="metrics.praying" :delta-label="previousLabel" :subtitle="book.praying !== null ? 'pessoas com ao menos um ofício nele' : 'pessoas por livro chegam em breve'">
      <template v-if="book.praying === null" #badge><OrdoSoonState compact title="Em breve" /></template>
    </OrdoMetricCard>
    <OrdoMetricCard title="Ofícios" :value="formatCount(book.completions)" scope="period" :delta="metrics.completions" :delta-label="previousLabel" :subtitle="book.praying ? `${formatPerPerson(book.completions, book.praying)} por pessoa` : 'rezados neste livro'" />
  </section>

  <div class="op-row">
    <section class="op-card op-panel op-grow-2" aria-labelledby="livro-dia-a-dia">
      <div class="op-panel__head">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Dia a dia</p>
          <h2 id="livro-dia-a-dia">Quem reza com este livro</h2>
          <p>{{ SERIES_WORDS[metric] }}<template v-if="seriesPrevious"> A linha tracejada é o mesmo dia do período anterior.</template></p>
        </div>
        <div v-if="!soon" class="op-seg op-seg--small" role="group" aria-label="O que mostrar">
          <button v-for="item in COMPARE_METRICS" :key="item" type="button" :class="{ 'is-on': metric === item }" :aria-pressed="metric === item" @click="emit('metric', item)">{{ METRIC_LABELS[item] }}</button>
        </div>
      </div>
      <OrdoSoonState v-if="soon" title="Em breve" text="A série diária de cada livro chega com a API nova." />
      <div v-else-if="loading" class="op-skeleton" style="height: 220px; border-radius: 14px" aria-hidden="true" />
      <p v-else-if="failed" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Não foi possível ler os números deste livro.</p>
      <template v-else-if="seriesPoints.length">
        <OrdoTrendChart :points="seriesPoints" :previous="seriesPrevious" :previous-label="previousLabel" :height="220" :aria-label="`${METRIC_LABELS[metric]} por dia`" />
        <div class="op-legend"><span><i class="op-legend-line" />{{ currentLabel }}</span><span v-if="seriesPrevious"><i class="op-legend-line op-legend-line--prev" />{{ previousRange }}</span></div>
      </template>
      <p v-else class="op-empty">Ninguém rezou com este livro no período.</p>
    </section>

    <section class="op-card op-panel op-grow-1" aria-labelledby="livro-habito">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Hábito</p>
        <h3 id="livro-habito">Quem chegou, voltou?</h3>
        <p>De quem escolheu este livro ao chegar, quantos voltaram a rezar.</p>
      </div>
      <div v-if="loading && !retention" class="op-skeleton" style="height: 96px; border-radius: 14px" aria-hidden="true" />
      <div v-else-if="retention?.tooFew" class="op-soon-state" role="note">
        <OrdoIcon name="people" :size="18" />
        <div><strong>Poucas pessoas para medir</strong>O retorno aparece quando 20 ou mais pessoas que chegaram por este livro tiverem completado 7 dias.</div>
      </div>
      <ul v-else-if="retention" class="op-hbars">
        <li v-for="row in retention.rows" :key="row.label">
          <b>{{ row.label }}</b>
          <div class="op-track"><span :style="{ width: `${Math.min(100, row.rate || 0)}%` }" /></div>
          <span><strong>{{ formatRate(row.rate) }}</strong><template v-if="row.overall !== null"> · todos {{ formatRate(row.overall) }}</template></span>
        </li>
      </ul>
      <OrdoSoonState v-else-if="soon" title="Em breve" text="Hoje o retorno por livro só existe para os 8 livros com mais gente." />
      <p v-else class="op-empty">Ninguém chegou por este livro no período.</p>

      <hr class="op-hr">
      <div class="op-panel__heading"><h3 style="font-size: 18px">Hora do ofício</h3></div>
      <OrdoSoonState v-if="soon" compact title="Em breve" text="Os ofícios por hora em cada livro chegam com a API nova." />
      <template v-else-if="hours.length">
        <div class="op-split" aria-hidden="true"><span v-for="hour in hours" :key="hour.office" :style="{ width: `${hour.share}%`, background: hour.color }" /></div>
        <div class="op-legend"><span v-for="hour in hours" :key="hour.office"><i class="op-swatch" :style="{ background: hour.color }" />{{ hour.label }} {{ formatRate(hour.share) }}</span></div>
      </template>
      <p v-else-if="!loading" class="op-empty">Nenhum ofício no período.</p>
    </section>
  </div>

  <div class="op-row">
    <section v-if="book.gated" class="op-card op-panel op-grow-2" aria-labelledby="livro-quem-ve">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Pré-lançamento</p>
        <h3 id="livro-quem-ve">Quem já vê este livro</h3>
        <p v-if="book.flag">As pessoas com regra própria na flag <span class="op-mono">{{ book.flag.key }}</span>. Chaves de API sempre veem.</p>
      </div>
      <dl v-if="book.flag" class="op-statlist">
        <div class="op-statlist__row"><dt>Pessoas com a flag ligada<small>regra própria</small></dt><dd>{{ formatCount(book.flag.users_count ?? 0) }}</dd></div>
        <div class="op-statlist__row"><dt>Regra geral<small>vale para todos os outros</small></dt><dd>{{ book.flag.rule === 'on' ? 'ligada' : 'desligada' }}</dd></div>
      </dl>
      <p v-else class="op-empty">Sem flag para este livro.</p>
    </section>
    <section v-else class="op-card op-panel op-grow-2" aria-labelledby="livro-trocas">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Ficam ou trocam</p>
        <h3 id="livro-trocas">De onde vêm e para onde vão</h3>
        <p>Quem escolheu outro livro ao chegar e usa este hoje, e o contrário.</p>
      </div>
      <OrdoSoonState v-if="soon" title="Em breve" text="As trocas entre livros chegam com a API nova." />
      <div v-else-if="loading" class="op-skeleton" style="height: 120px; border-radius: 14px" aria-hidden="true" />
      <template v-else-if="switches">
        <div class="op-flow">
          <div class="op-flow__side">
            <small>Vieram de</small>
            <ul v-if="switches.from.rows.length" class="op-hbars">
              <li v-for="row in switches.from.rows" :key="row.label"><b>{{ row.label }}</b><div class="op-track"><span :style="{ width: `${row.width}%`, background: 'var(--op-s3)' }" /></div><span><strong>{{ formatCount(row.users) }}</strong></span></li>
            </ul>
            <p v-else class="op-empty">Ninguém.</p>
          </div>
          <div class="op-flow__mid">
            <span>vieram</span><strong>+{{ formatCount(switches.from.total) }}</strong>
            <span style="margin-top: 6px">foram</span><strong :class="{ 'is-down': switches.to.total > 0 }">−{{ formatCount(switches.to.total) }}</strong>
          </div>
          <div class="op-flow__side">
            <small>Foram para</small>
            <ul v-if="switches.to.rows.length" class="op-hbars">
              <li v-for="row in switches.to.rows" :key="row.label"><b>{{ row.label }}</b><div class="op-track"><span :style="{ width: `${row.width}%`, background: 'var(--op-s2)' }" /></div><span><strong>{{ formatCount(row.users) }}</strong></span></li>
            </ul>
            <p v-else class="op-empty">Ninguém.</p>
          </div>
        </div>
        <div v-if="switches.chosen !== null && switches.current !== null" class="op-panel__foot">
          <span>{{ formatCount(switches.chosen) }} escolheram ao chegar − {{ formatCount(switches.to.total) }} que trocaram + {{ formatCount(switches.from.total) }} que vieram = {{ formatCount(switches.current) }} que usam hoje.</span>
        </div>
      </template>
      <p v-else-if="failed" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Não foi possível ler as trocas.</p>
    </section>

    <section class="op-card op-panel op-grow-1" aria-labelledby="livro-narracao">
      <div class="op-panel__head">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Narração</p>
          <h3 id="livro-narracao">Próximas 4 semanas</h3>
        </div>
        <button type="button" class="op-link" @click="emit('navigate', { tab: 'audio', params: { secao: 'cobertura', livro: book.code } })">Abrir no Áudio <OrdoIcon name="arrow" :size="14" /></button>
      </div>
      <div v-if="readinessLoading && !narration.length" class="op-skeleton" style="height: 120px; border-radius: 14px" aria-hidden="true" />
      <p v-else-if="!narration.length" class="op-empty">A narração deste livro ainda não foi calculada.</p>
      <template v-else>
        <ul class="op-covlist op-only-narrow">
          <li v-for="row in narration" :key="row.bible">
            <button type="button" @click="emit('navigate', { tab: 'audio', params: { secao: 'cobertura', livro: book.code, biblia: row.bible } })">
              <span class="op-covlist__name"><strong style="color: var(--op-ink)">{{ row.name }}</strong> {{ row.note }}</span>
              <span class="op-covlist__rate" :style="{ color: narrationColor(row.total) }">{{ formatRate(row.total === null ? null : Math.floor(row.total)) }}</span>
              <OrdoIcon name="chevron-right" :size="16" />
              <div class="op-track"><span :style="{ width: `${row.total || 0}%`, background: narrationColor(row.total) }" /></div>
            </button>
          </li>
        </ul>
        <table class="op-matrix op-matrix--compact op-only-wide">
          <thead><tr><th>Bíblia</th><th /><th v-for="office in narrationOffices" :key="office" :title="officeMeta(office).label">{{ shortOffice(office) }}</th></tr></thead>
          <tbody>
            <tr v-for="row in narration" :key="row.bible" @click="emit('navigate', { tab: 'audio', params: { secao: 'cobertura', livro: book.code, biblia: row.bible } })">
              <td class="op-matrix__bible" colspan="2"><strong>{{ row.name }}</strong><small>{{ row.note }}</small></td>
              <td v-for="cell in row.cells" :key="cell.office">
                <span class="op-cell" :class="cell.value === null ? 'op-cell--na' : narrationCell(cell.value)">{{ cell.value === null ? '—' : formatRate(Math.floor(cell.value)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </section>
  </div>

  <div class="op-row">
    <section class="op-card op-panel op-grow-2" aria-labelledby="livro-ler">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Para ler</p>
        <h3 id="livro-ler">PDF e documentos</h3>
        <p>O PDF publicado e os documentos do livro no CMS, com quantas vezes foram abertos no período.</p>
      </div>
      <div v-if="book.pdf === null" class="op-soon-state" role="note">
        <OrdoIcon name="file" :size="18" />
        <div><strong>Nenhum PDF publicado</strong>O link do PDF responde "não encontrado" até o arquivo subir. O envio é feito no terminal da API, com <span class="op-mono">prayer_books:pdfs:upload</span>.</div>
      </div>
      <div v-else-if="pdfUrl" class="op-docfile">
        <span class="op-rank__name">
          <span class="op-ico op-tone-quiet"><OrdoIcon name="file" :size="16" /></span>
          <span>PDF do livro<small>{{ pdfSize || 'publicado' }}</small></span>
        </span>
        <span class="op-flex">
          <span class="op-faint" style="font-size: 13px"><b style="color: var(--op-ink)">{{ formatCount(book.pdfOpens) }}</b> aberturas</span>
          <a class="op-btn op-btn--small" :href="pdfUrl" target="_blank" rel="noopener"><OrdoIcon name="external" :size="14" />Abrir</a>
        </span>
      </div>

      <div v-if="!documents && cmsDocuments.loading" class="op-skeleton" style="height: 120px; border-radius: 14px" aria-hidden="true" />
      <div v-else-if="documentList.length === 0 && (documents || cmsDocuments.settled)" class="op-soon-state" role="note">
        <OrdoIcon name="book" :size="18" />
        <div>
          <strong>{{ documents ? 'Nenhum documento no CMS' : 'O CMS não respondeu' }}</strong>
          <template v-if="documents">Os documentos de <span class="op-loc">{{ book.code }}</span> aparecem aqui assim que forem publicados no CMS.</template>
          <template v-else>Não foi possível ler os documentos agora.</template>
          <a class="op-link" style="font-size: 13px" :href="cmsUrl" target="_blank" rel="noopener">{{ documents ? 'Criar no CMS' : 'Abrir o CMS' }} <OrdoIcon name="external" :size="13" /></a>
        </div>
      </div>
      <table v-else-if="documentList.length" class="op-rank">
        <thead><tr><th scope="col">Documento</th><th scope="col" class="is-num">Aberto</th><th><span class="op-sr-only">Proporção</span></th></tr></thead>
        <tbody>
          <tr v-for="doc in documentList" :key="doc.slug">
            <td><span class="op-rank__name">{{ doc.title }}</span></td>
            <td class="is-num"><strong>{{ formatCount(doc.opens) }}</strong></td>
            <td class="op-rank__bar"><div class="op-track" style="height: 6px"><span :style="{ width: `${(doc.opens || 0) / maxOpens * 100}%` }" /></div></td>
          </tr>
        </tbody>
      </table>
      <div v-if="documentList.length" class="op-panel__foot">
        <span>{{ formatCount(documentList.length) }} {{ documentList.length === 1 ? 'documento publicado' : 'documentos publicados' }}<template v-if="book.documentOpens !== null"> · {{ formatCount(book.documentOpens) }} aberturas no período</template>.</span>
        <a class="op-link" :href="cmsUrl" target="_blank" rel="noopener">Editar no CMS <OrdoIcon name="external" :size="14" /></a>
      </div>
    </section>

    <section class="op-card op-panel op-grow-1" aria-labelledby="livro-comunidade">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Comunidade</p>
        <h3 id="livro-comunidade">O que sai deste livro</h3>
      </div>
      <dl class="op-statlist">
        <div class="op-statlist__row"><dt>Ofícios compartilhados<small>no período</small></dt><dd>{{ formatCount(book.shares) }}</dd></div>
        <div class="op-statlist__row"><dt>Orações semanais geradas<small>no período</small></dt><dd>{{ formatCount(book.weeklyPrayers) }}</dd></div>
        <div class="op-statlist__row">
          <dt>Pessoas com Ordo+<small>usam este livro hoje</small></dt>
          <dd><OrdoSoonState v-if="soon" compact title="Em breve" /><template v-else>{{ formatCount(data?.premium_users ?? null) }}</template></dd>
        </div>
        <div class="op-statlist__row">
          <dt>No app · na web<small>pedidos com este livro</small></dt>
          <dd><OrdoSoonState v-if="soon" compact title="Em breve" /><template v-else>{{ clients || '—' }}</template></dd>
        </div>
      </dl>
    </section>
  </div>
</template>
