<script setup lang="ts">
import OrdoIcon, { type OrdoIconName } from './Icon.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoSoonState from './SoonState.vue'
import OrdoSummaryBand from './SummaryBand.vue'
import { useUsageContext } from '../../composables/useUsageContext'
import { shortDate, statusSource } from '../../utils/usage'
import type { UsageSourceStatus } from '../../types/usage'

// Before the first nightly rollup every report is empty. That is not a broken
// screen: say when the first number arrives, what is already being received
// and where to look meanwhile.
const { core, openTab, appEvents } = useUsageContext()
const status = computed(() => core.status.data)

const longDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}
const timeOf = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const started = computed(() => longDate(status.value?.rollup?.first_event_at || status.value?.rollup?.first_day))
const nextRun = computed(() => status.value?.rollup?.next_run_at || null)
const firstNumber = computed(() => longDate(nextRun.value))
const firstShort = computed(() => nextRun.value ? shortDate(nextRun.value.slice(0, 10)) : null)
const firstLine = computed(() => firstShort.value ? `primeiro número em ${firstShort.value}` : 'primeiro número depois do primeiro resumo')

interface SourceRow { key: string; icon: OrdoIconName; tone: string; title: string; text: string; pill?: { text: string; tone: string } }

// The earliest moment any of these rows has seen an event.
const earliest = (rows: UsageSourceStatus[]) => rows
  .map(row => row.first_event_at || (row.last_event_at && (row.today || row.last_hour) ? row.last_event_at : null))
  .filter((value): value is string => Boolean(value))
  .sort()[0] || null
const since = (at: string | null) => {
  if (!at) return null
  const time = timeOf(at)
  return `Gravando desde ${shortDate(at.slice(0, 10))}${time ? `, ${time}` : ''}`
}
const sourceRow = (key: string, title: string, what: string, rows: UsageSourceStatus[]): SourceRow => {
  const active = rows.some(row => (row.today || 0) > 0 || (row.last_hour || 0) > 0 || Boolean(row.first_day))
  return active
    ? { key, icon: 'check', tone: 'op-tone-ok', title, text: [since(earliest(rows)), what].filter(Boolean).join(' · '), pill: { text: 'ativo', tone: 'op-pill--ok' } }
    : { key, icon: 'clock', tone: 'op-tone-gold', title, text: `Nada recebido ainda · ${what}`, pill: { text: 'sem eventos', tone: 'op-pill--gold' } }
}

const rows = computed<SourceRow[]>(() => {
  const data = status.value
  const out: SourceRow[] = []
  if (data?.sources) {
    out.push(sourceRow('server', 'Servidor: pedidos à API', 'cobre app, web, widgets e chaves de API', statusSource(data, 'request')))
    out.push(sourceRow('web', 'Web: eventos do navegador', 'abrir ofício, narração, compartilhar, Ordo+', statusSource(data, 'client', 'web')))
  }
  out.push(appEvents.value
    ? sourceRow('app', 'App: eventos do aparelho', 'abrir ofício, narração, compartilhar, Ordo+', statusSource(data, 'client', 'app'))
    : { key: 'app', icon: 'clock', tone: 'op-tone-gold', title: 'App: eventos do aparelho', text: 'Chegam com a versão 1.46. Até lá o app aparece só pelos pedidos à API, quase sempre sem versão.', pill: { text: 'espera a 1.46', tone: 'op-pill--gold' } })
  const next = timeOf(nextRun.value) || '00:30'
  out.push({ key: 'rollup', icon: 'refresh', tone: 'op-tone-info', title: 'Resumo noturno', text: 'Fecha ontem e refaz os 2 dias antes, para pegar eventos atrasados', pill: { text: `próximo ${next}`, tone: 'op-pill--info' } })
  out.push({ key: 'privacy', icon: 'lock', tone: 'op-tone-info', title: 'Privacidade', text: 'Quem desligou “estatísticas de uso” não entra em número nenhum. Eventos brutos ficam 90 dias; resumos, para sempre.' })
  return out
})
</script>

<template>
  <OrdoSummaryBand title="O Uso começa a contar nesta madrugada." icon="clock" label="Situação dos dados">
    <template v-if="started">A telemetria foi ligada em <b>{{ started }}</b>. </template>
    Cada dia fecha às <b>00:30</b> do dia seguinte, então o primeiro número aparece
    <template v-if="firstNumber">em <b>{{ firstNumber }}</b></template><template v-else>depois do primeiro resumo</template>.
    Até lá, os cartões ficam vazios: nada está quebrado.
  </OrdoSummaryBand>

  <section class="op-row" style="align-items: flex-start">
    <section class="op-card op-panel op-grow-1">
      <div class="op-panel__heading">
        <p class="op-eyebrow">De onde vêm os dados</p>
        <h2>O que já está chegando</h2>
      </div>
      <OrdoSoonState v-if="!status?.sources" title="Status da telemetria em breve" text="Quando a API disser o que recebe de cada fonte, o servidor e a web aparecem aqui com a hora do primeiro evento." />
      <ul class="op-usage__sources">
        <li v-for="row in rows" :key="row.key">
          <span class="op-attn__icon op-usage__src-icon" :class="row.tone"><OrdoIcon :name="row.icon" :size="16" /></span>
          <span><strong>{{ row.title }}</strong><small>{{ row.text }}</small></span>
          <span v-if="row.pill" class="op-pill" :class="row.pill.tone">{{ row.pill.text }}</span>
          <span v-else />
        </li>
      </ul>
    </section>

    <section class="op-grow-2" style="display: flex; flex-direction: column; gap: 16px">
      <div class="op-grid" style="--op-min: 200px">
        <OrdoMetricCard title="Pessoas ativas" value="—" :subtitle="firstLine" />
        <OrdoMetricCard title="Ofícios rezados" value="—" :subtitle="firstLine" />
        <OrdoMetricCard title="Narrações começadas" value="—" :subtitle="appEvents ? firstLine : 'só web até o app 1.46'" />
      </div>
      <section class="op-card op-panel">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Enquanto isso</p>
          <h3>Onde olhar hoje</h3>
        </div>
        <p class="op-muted" style="margin: 0; font-size: 14px; line-height: 1.55">
          Os números de pessoas e ofícios do banco continuam em
          <button type="button" class="op-link" @click="openTab('overview')">Visão geral</button> e
          <button type="button" class="op-link" @click="openTab('growth')">Pessoas &amp; hábito</button>,
          com todo o histórico. O Uso acrescenta o que só a telemetria sabe: recursos, cliente, plataforma, versão e funis.
        </p>
      </section>
    </section>
  </section>
</template>
