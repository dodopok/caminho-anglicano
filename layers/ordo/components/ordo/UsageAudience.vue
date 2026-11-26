<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoDeltaChip from './DeltaChip.vue'
import OrdoUsageBars, { type UsageBar } from './UsageBars.vue'
import OrdoUsageBooks from './UsageBooks.vue'
import OrdoUsageHiddenDimensions from './UsageHiddenDimensions.vue'
import OrdoIcon from './Icon.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import { useQueryParam } from '../../composables/usePortalQuery'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { comparePeriods } from '../../utils/compare'
import {
  audienceSplit,
  compactNumber,
  latestActiveDay,
  NON_PERSON_CLIENTS,
  platformLabel,
  shareText,
  shortDate,
  total,
  versionGroups
} from '../../utils/usage'
import type { UsageBreakdownResponse } from '../../types/usage'

// Público: app only, web only or both; the device, the language, the book and
// the app version people have in their hands.
const api = useUsageApi()
const { core, appEvents } = useUsageContext()
const { languageLabel } = useOrdoDashboardPresentation()
const activeWindow = useQueryParam<'dia' | 'semana' | 'mes'>('ativos', 'mes', ['dia', 'semana', 'mes'])

const platform = useWindowReport(range => api.breakdown(range, 'platform'))
const language = useWindowReport(range => api.breakdown(range, 'language'))
const client = useWindowReport(range => api.breakdown(range, 'client'))
const versions = useWindowReport(range => api.breakdown(range, 'app_version'))

const latest = computed(() => latestActiveDay(core.active.data?.series || []))
const latestBefore = computed(() => latestActiveDay(core.activePrevious.data?.series || []))
const split = computed(() => audienceSplit(latest.value, activeWindow.value))
const splitBefore = computed(() => audienceSplit(latestBefore.value, activeWindow.value))

const fmt = (value: number | null | undefined) => value === null || value === undefined ? '—' : value.toLocaleString('pt-BR')
const pct = (value: number, whole: number) => whole ? Math.round(value / whole * 100) : 0
const WINDOW_WORDS = { dia: 'no dia', semana: '7 dias', mes: '30 dias' } as const

const eyebrow = computed(() => latest.value ? `App ou web · ${WINDOW_WORDS[activeWindow.value]} até ${shortDate(latest.value.date)}` : 'App ou web')
const headline = computed(() => {
  const value = split.value
  if (!value || !value.people) return 'Ninguém contado nesta janela'
  const lead = value.appOnly / value.people > 0.5 ? 'a maioria só no app' : value.webOnly / value.people > 0.5 ? 'a maioria só na web' : 'entre o app e a web'
  return `${fmt(value.people)} pessoas, ${lead}`
})

const others = (clientKey: 'app' | 'web') => {
  const windows = latest.value?.by_client?.[clientKey]
  if (!windows) return ''
  const parts = (['mes', 'semana', 'dia'] as const).filter(item => item !== activeWindow.value)
    .map(item => item === 'dia' ? `${fmt(windows.dau)} no dia` : item === 'semana' ? `${fmt(windows.wau)} em 7 dias` : `${fmt(windows.mau)} em 30 dias`)
  return parts.join(' · ')
}
const notPeople = computed(() => total((client.data?.rows || []).filter(row => row.value && NON_PERSON_CLIENTS.includes(row.value)).map(row => row.count)))
const numbers = computed(() => {
  const now = split.value
  const before = splitBefore.value
  return [
    { key: 'app', label: 'No app', value: fmt(now?.app), delta: before ? comparePeriods(now?.app, before.app) : null, note: others('app') },
    { key: 'web', label: 'Na web', value: fmt(now?.web), delta: before ? comparePeriods(now?.web, before.web) : null, note: others('web') },
    { key: 'both', label: 'Nos dois', value: fmt(now?.both), delta: before ? comparePeriods(now?.both, before.both) : null, note: 'aparecem no app e na web, contados uma vez' },
    { key: 'others', label: 'Fora das pessoas', value: client.data ? fmt(notPeople.value) : '—', delta: null, note: 'pedidos de chaves de API, widgets, aparelhos e MCP; não contam como pessoas' }
  ]
})

const WEB_PLATFORMS = ['web_desktop', 'web_mobile', 'webview_ios', 'webview_android']
const bars = (response: UsageBreakdownResponse | null, kind: 'platform' | 'language'): UsageBar[] => {
  const rows = response?.rows || []
  const sum = total(rows.map(row => row.count))
  return rows.map(row => ({
    key: row.value ?? '—',
    label: !row.value ? 'Não informado' : kind === 'platform' ? platformLabel(row.value) : languageLabel(row.value),
    hint: kind === 'language' && row.value ? row.value : undefined,
    value: row.count,
    share: shareText(row.count, sum),
    display: compactNumber(row.count),
    color: !row.value ? 'var(--op-ink-faint)' : kind === 'platform' && WEB_PLATFORMS.includes(row.value) ? 'var(--op-s2)' : undefined,
    faint: !row.value
  }))
}
const platformBars = computed(() => bars(platform.data, 'platform'))
const languageBars = computed(() => bars(language.data, 'language'))

const VERSION_COLORS = ['var(--op-ok)', 'var(--op-action)', 'var(--op-gold)', 'var(--op-warn)']
const versionView = computed(() => versionGroups(versions.data?.rows || []))
const versionBars = computed<UsageBar[]>(() => {
  const sum = total(versionView.value.rows.map(row => row.value))
  return versionView.value.rows.map((row, index) => ({ key: row.key, label: row.label, value: row.value, share: shareText(row.value, sum), color: VERSION_COLORS[index] || 'var(--op-warn)' }))
})
</script>

<template>
  <OrdoChartCard :loading="core.active.loading && !core.active.data" :eyebrow="eyebrow" :title="headline" description="Uma instalação ligada a uma conta conta como a conta; quem entrou nos dois aparece no meio.">
    <template #actions>
      <div class="op-seg op-seg--small" role="group" aria-label="Janela de pessoas ativas">
        <button type="button" :class="{ 'is-on': activeWindow === 'dia' }" :aria-pressed="activeWindow === 'dia'" @click="activeWindow = 'dia'">Dia</button>
        <button type="button" :class="{ 'is-on': activeWindow === 'semana' }" :aria-pressed="activeWindow === 'semana'" @click="activeWindow = 'semana'">7 dias</button>
        <button type="button" :class="{ 'is-on': activeWindow === 'mes' }" :aria-pressed="activeWindow === 'mes'" @click="activeWindow = 'mes'">30 dias</button>
      </div>
    </template>
    <template v-if="split && split.people">
      <div class="op-split op-split--tall" role="img" :aria-label="`Só no app ${pct(split.appOnly, split.people)}%, nos dois ${pct(split.both, split.people)}%, só na web ${pct(split.webOnly, split.people)}%`">
        <span v-if="split.appOnly" :style="{ flex: split.appOnly, background: 'var(--op-action)' }">{{ pct(split.appOnly, split.people) >= 25 ? `Só no app · ${fmt(split.appOnly)} · ${pct(split.appOnly, split.people)}%` : `${pct(split.appOnly, split.people)}%` }}</span>
        <span v-if="split.both" :style="{ flex: split.both, background: 'var(--op-s4)', justifyContent: 'center' }">{{ pct(split.both, split.people) >= 4 ? `${pct(split.both, split.people)}%` : '' }}</span>
        <span v-if="split.webOnly" :style="{ flex: split.webOnly, background: 'var(--op-s2)' }">{{ pct(split.webOnly, split.people) >= 25 ? `Só na web · ${fmt(split.webOnly)} · ${pct(split.webOnly, split.people)}%` : `${pct(split.webOnly, split.people)}%` }}</span>
      </div>
      <div class="op-grid" style="--op-min: 200px">
        <div v-for="item in numbers" :key="item.key" class="op-metric op-metric--compact">
          <span class="op-metric__label">{{ item.label }}</span>
          <span class="op-metric__value">{{ item.value }}</span>
          <span class="op-metric__delta">
            <OrdoDeltaChip v-if="item.delta" :delta="item.delta" />
            <span class="op-metric__delta-vs">{{ item.note }}</span>
          </span>
        </div>
      </div>
    </template>
    <p v-else class="op-empty">{{ errorText(core.active.error) || 'Nenhuma pessoa contada nesta janela.' }}</p>
  </OrdoChartCard>

  <section class="op-row">
    <OrdoChartCard class="op-grow-1" :loading="platform.loading && !platform.data" eyebrow="Aparelho" title="Por plataforma" description="Pedidos no período.">
      <OrdoUsageBars :items="platformBars" :empty-message="errorText(platform.error) || 'Nada registrado neste período.'" />
    </OrdoChartCard>
    <OrdoChartCard class="op-grow-1" :loading="language.loading && !language.data" eyebrow="Idioma" title="Por idioma da interface" description="Pedidos no período.">
      <OrdoUsageBars :items="languageBars" :empty-message="errorText(language.error) || 'Nada registrado neste período.'" />
    </OrdoChartCard>
  </section>

  <section class="op-row">
    <OrdoUsageBooks class="op-grow-2" />
    <OrdoChartCard class="op-grow-1" :loading="versions.loading && !versions.data" eyebrow="Versão" title="Versões do app" :description="versionView.people ? 'Pessoas do app por versão, no período.' : 'Pedidos do app por versão, no período.'">
      <OrdoUsageBars :items="versionBars" narrow-label :empty-message="errorText(versions.error) || 'Nenhuma versão registrada neste período.'" />
      <p v-if="!appEvents" class="op-inline-note">
        <OrdoIcon name="info" :size="18" />
        <span>Quando a <strong>1.46</strong> chegar às lojas, esta lista mostra quanto já atualizou: é a partir dela que o app manda eventos próprios (narração, funis).</span>
      </p>
    </OrdoChartCard>
  </section>

  <OrdoUsageHiddenDimensions />
</template>
