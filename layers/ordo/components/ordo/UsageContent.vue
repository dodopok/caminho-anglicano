<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoIcon from './Icon.vue'
import OrdoSparkline from './Sparkline.vue'
import OrdoUsageUpcoming from './UsageUpcoming.vue'
import { errorText, isNotDeployed } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import { contentTitle, dailyValues, seriesTitle, dateInWindow, daysBetween, groupContent, shortDate, spikeInside, type ContentGroup, type ContentItem } from '../../utils/usage'

// Conteúdo: saints and dates, documents, articles and rosaries most opened,
// with their trend and the change against the window before. Each row's name
// is the `title` the API resolves from the CMS (the browser has no token for
// it), from the list or from `content?slug=`; when it is null, the slug is
// read as words.
const api = useUsageApi()
const { window, previous, reloadKey } = useUsageContext()
const content = useWindowReport(range => api.content(range, 100, true))
const contentPrevious = useWindowReport((_, before) => before ? api.content(before, 100) : Promise.resolve(null))

const groups = computed(() => groupContent(content.data?.rows || []))
const before = computed(() => contentPrevious.data ? groupContent(contentPrevious.data.rows || []) : null)
const TABS: Array<{ id: ContentGroup; label: string; column: string; empty: string }> = [
  { id: 'saints', label: 'Santos e datas', column: 'Santo ou data', empty: 'Nenhum santo aberto no período.' },
  { id: 'documents', label: 'Documentos', column: 'Documento', empty: 'Nenhum documento aberto no período.' },
  { id: 'posts', label: 'Artigos', column: 'Artigo', empty: 'Nenhum artigo aberto no período.' },
  { id: 'rosaries', label: 'Rosários', column: 'Rosário', empty: 'Nenhum rosário do catálogo começado no período.' }
]
const tab = ref<ContentGroup>('saints')
const search = ref('')
// Ten rows first, like the other rankings; the rest one click away.
const SHORT = 10
const expanded = ref(false)
watch([tab, search], () => { expanded.value = false })
const tabMeta = computed(() => TABS.find(item => item.id === tab.value) || TABS[0])

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Titles that came only with `content?slug=` (an API that names the slug
// but not the list's rows).
const fetchedTitles = ref<Record<string, string>>({})
const nameOf = (item: ContentItem) => contentTitle({ content_slug: item.slug, title: item.title || fetchedTitles.value[item.slug] })
const rows = computed(() => {
  const query = normalize(search.value.trim())
  const list = groups.value[tab.value]
  return (query ? list.filter(item => normalize(`${nameOf(item)} ${item.slug}`).includes(query)) : list).slice(0, 25)
})

// Each row's daily series comes with the list (`with_series=true`); an API
// without it is asked slug by slug (`content?slug=`); without that either,
// the trend column says "em breve".
const withSeries = computed(() => (content.data?.rows || []).some(row => Array.isArray(row.series)))
const fetched = ref<Record<string, number[]>>({})
const sparksSoon = ref(false)
const sparks = computed<Record<string, number[]>>(() => withSeries.value
  ? Object.fromEntries(groups.value[tab.value].filter(item => item.series).map(item => [item.slug, dailyValues(item.series!, window.value, point => point.count)]))
  : fetched.value)
let request = 0
const loadSparks = async () => {
  const current = ++request
  const slugs = rows.value.slice(0, 10).map(item => item.slug)
  if (!slugs.length || sparksSoon.value || withSeries.value || !content.data) return
  const next: Record<string, number[]> = {}
  for (const slug of slugs) {
    try {
      const response = await api.contentSeries(window.value, slug)
      if (current !== request) return
      const title = seriesTitle(response)
      if (title && fetchedTitles.value[slug] !== title) fetchedTitles.value = { ...fetchedTitles.value, [slug]: title }
      if (!Array.isArray(response?.series)) { sparksSoon.value = true; return }
      next[slug] = dailyValues(response.series, window.value, point => point.count || 0)
    } catch (error) {
      if (isNotDeployed(error)) { sparksSoon.value = true; return }
    }
  }
  if (current === request) fetched.value = next
}
watch(() => [rows.value.slice(0, 10).map(item => item.slug).join(','), window.value.start_date, window.value.end_date, reloadKey.value, Boolean(content.data)], loadSparks, { immediate: true })

const inWindow = (item: ContentItem) => item.date ? dateInWindow(item.date, window.value) : tab.value === 'saints' && spikeInside(sparks.value[item.slug])
const delta = (item: ContentItem) => {
  if (!before.value || !previous.value || inWindow(item)) return null
  const was = before.value[tab.value].find(row => row.slug === item.slug)
  return comparePeriods(item.count, was?.count ?? 0)
}
const caption = (item: ContentItem) => item.date ? shortDate(item.date.length === 5 ? `2000-${item.date}` : item.date) : ''
const fmt = (value: number) => value.toLocaleString('pt-BR')
const days = computed(() => daysBetween(window.value.start_date, window.value.end_date))
const topDocuments = computed(() => groups.value.documents.slice(0, 3))
</script>

<template>
  <section class="op-row" style="align-items: flex-start">
    <OrdoChartCard class="op-grow-2" :loading="content.loading && !content.data" eyebrow="Conteúdo" title="Mais abertos" description="Aberturas no app e na web, com a tendência e a mudança contra o período anterior.">
      <div class="op-between">
        <div class="op-seg op-seg--small" role="tablist" aria-label="Tipo de conteúdo">
          <button v-for="item in TABS" :key="item.id" type="button" role="tab" :aria-selected="tab === item.id" :class="{ 'is-on': tab === item.id }" @click="tab = item.id">{{ item.label }} · {{ groups[item.id].length }}</button>
        </div>
        <label class="op-search op-usage__search">
          <OrdoIcon name="search" :size="16" />
          <input v-model="search" class="op-field" type="search" placeholder="Buscar por nome" aria-label="Buscar por nome">
        </label>
      </div>
      <div v-if="rows.length" class="op-table-wrap">
        <table class="op-rank">
          <thead>
            <tr>
              <th><span class="op-sr-only">Posição</span></th>
              <th scope="col">{{ tabMeta.column }}</th>
              <th scope="col" class="is-num">Aberturas</th>
              <th scope="col" class="is-num">Pessoas-dia</th>
              <th scope="col">{{ days }} dias <span v-if="sparksSoon" class="op-soon" title="A série diária por conteúdo ainda não está na API">em breve</span></th>
              <th scope="col" class="is-num">vs. anterior</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in (expanded ? rows : rows.slice(0, SHORT))" :key="item.slug">
              <td class="op-rank__n">{{ index + 1 }}</td>
              <td>
                <span class="op-rank__name">
                  <span>{{ nameOf(item) }}<small><template v-if="caption(item)">{{ caption(item) }} · </template><span class="op-mono">{{ item.slug }}</span></small></span>
                </span>
              </td>
              <td class="is-num"><strong>{{ fmt(item.count) }}</strong></td>
              <td class="is-num">{{ fmt(item.userDays) }}</td>
              <td class="op-rank__spark"><OrdoSparkline v-if="sparks[item.slug]" :values="sparks[item.slug]" :height="26" /></td>
              <td class="is-num">
                <span v-if="inWindow(item)" class="op-faint" title="A data caiu dentro do período">—</span>
                <OrdoDeltaChip v-else-if="delta(item)" :delta="delta(item)!" />
                <span v-else class="op-faint">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="op-empty">{{ errorText(content.error) || (search ? 'Nada com esse nome.' : tabMeta.empty) }}</p>
      <button v-if="rows.length > SHORT && !expanded" type="button" class="op-btn op-btn--small" style="align-self: flex-start" @click="expanded = true">Mostrar os {{ rows.length }}</button>
      <template #footer>
        <span>O nome vem do CMS pela API; quando ela não o conhece, o slug é lido como nome. “—”: a data caiu dentro do período, comparar não diz nada.</span>
      </template>
    </OrdoChartCard>

    <div class="op-grow-1" style="display: flex; flex-direction: column; gap: 16px">
      <OrdoUsageUpcoming :saints="groups.saints" />
      <OrdoChartCard eyebrow="Documentos" :title="topDocuments.length ? `Os ${topDocuments.length} mais abertos` : 'Mais abertos'" :loading="content.loading && !content.data">
        <ol v-if="topDocuments.length" class="op-ranklist">
          <li v-for="(item, index) in topDocuments" :key="item.slug">
            <span class="op-ranklist__n">{{ index + 1 }}</span>
            <span class="op-ranklist__copy"><strong>{{ nameOf(item) }}</strong><span class="op-mono">{{ item.slug }}</span></span>
            <span class="op-ranklist__value">{{ fmt(item.count) }}</span>
          </li>
        </ol>
        <p v-else class="op-empty">Nenhum documento aberto no período.</p>
        <template v-if="groups.documents.length > 3" #footer>
          <button type="button" class="op-link" @click="tab = 'documents'">Ver documentos <OrdoIcon name="arrow" :size="14" /></button>
        </template>
      </OrdoChartCard>
    </div>
  </section>
</template>
