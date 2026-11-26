<script setup lang="ts">
import OrdoSoonState from './SoonState.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { useOrdoApi } from '../../composables/useOrdoApi'
import { createReport } from '../../composables/useReport'
import { comparePeriods } from '../../utils/compare'
import { toDateInput } from '../../utils/period'
import { addDays, number } from '../../utils/audio'
import type { UsageSeriesResponse } from '../../types/usage'

// Who listens: the narration events of the usage telemetry (last 30 closed
// days, compared with the 30 before) next to the audio deliveries the API has
// always counted. The events come only from the web until the next app
// release, and the card says so.
const store = useAudioStore()
const api = useOrdoApi()

const DAYS = 30
const range = () => {
  const end = addDays(toDateInput(new Date()), -1)
  return { start_date: addDays(end, -(DAYS - 1)), end_date: end }
}
const previousRange = () => {
  const current = range()
  const end = addDays(current.start_date, -1)
  return { start_date: addDays(end, -(DAYS - 1)), end_date: end }
}

const started = createReport<UsageSeriesResponse>(() => api.fetchUsageSeries(range(), { event: 'narration_started' }))
const ended = createReport<UsageSeriesResponse>(() => api.fetchUsageSeries(range(), { event: 'narration_ended' }))
const startedBefore = createReport<UsageSeriesResponse>(() => api.fetchUsageSeries(previousRange(), { event: 'narration_started' }))

const sum = (response: UsageSeriesResponse | null) => response ? response.series.reduce((total, point) => total + (point.count || 0), 0) : null
const startedCount = computed(() => sum(started.state.data))
const endedCount = computed(() => sum(ended.state.data))
const delta = computed(() => comparePeriods(startedCount.value, sum(startedBefore.state.data)))
const endRate = computed(() => startedCount.value && endedCount.value !== null ? Math.round(endedCount.value / startedCount.value * 100) : null)
const telemetrySoon = computed(() => started.state.soon)

const usage = computed(() => store.summary.data?.user_usage || null)
const byType = computed(() => usage.value?.by_type || {})
const total = computed(() => usage.value?.total_accesses || 0)
const backgroundShare = computed(() => total.value ? Math.round((byType.value.background_track || 0) / total.value * 100) : null)
const bars = computed(() => {
  const items = [
    { key: 'audio_clip', label: 'Narração nos ofícios', color: 'var(--op-action)' },
    { key: 'background_track', label: 'Música de fundo', color: 'var(--op-s3)' },
    { key: 'liturgical_text', label: 'Narração de textos', color: 'var(--op-s4)' }
  ].map(item => ({ ...item, value: byType.value[item.key] || 0 }))
  const max = Math.max(...items.map(item => item.value), 1)
  return items.map(item => ({ ...item, width: item.value / max * 100 }))
})

onMounted(() => {
  void started.load()
  void ended.load()
  void startedBefore.load()
})
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__head">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Quem ouve</p>
        <h2>Narração em uso</h2>
        <p>Últimos 30 dias, do Uso (telemetria) e dos acessos de áudio.</p>
      </div>
      <span class="op-pill op-pill--gold" title="Os eventos de narração do app chegam com a próxima versão">só web</span>
    </div>
    <dl class="op-kv">
      <div>
        <dt>Narrações começadas</dt>
        <dd v-if="telemetrySoon"><OrdoSoonState compact text="Os eventos de narração chegam com a telemetria do Uso." /></dd>
        <dd v-else>{{ startedCount === null ? '—' : number(startedCount) }} <small v-if="delta">{{ delta.text }}</small></dd>
      </div>
      <div>
        <dt>Chegam ao fim</dt>
        <dd v-if="telemetrySoon"><OrdoSoonState compact /></dd>
        <dd v-else>{{ endRate === null ? '—' : `${endRate}%` }} <small v-if="endedCount">{{ number(endedCount) }}</small></dd>
      </div>
      <div>
        <dt>Pessoas que ouviram</dt>
        <dd>{{ usage ? number(usage.unique_users) : '—' }}</dd>
      </div>
      <div>
        <dt>Com música de fundo</dt>
        <dd>{{ backgroundShare === null ? '—' : `${backgroundShare}%` }}</dd>
      </div>
    </dl>
    <hr class="op-hr">
    <ul v-if="usage" class="op-barlist" style="gap: 10px">
      <li v-for="(bar, index) in bars" :key="bar.key" class="op-barlist__row">
        <div class="op-barlist__body">
          <div class="op-barlist__line">
            <span class="op-barlist__label">{{ bar.label }}</span>
            <span class="op-barlist__value"><strong>{{ number(bar.value) }}</strong><template v-if="index === 0"> acessos</template></span>
          </div>
          <div class="op-track" style="height: 6px"><span :style="{ width: `${bar.width}%`, background: bar.color }" /></div>
        </div>
      </li>
    </ul>
    <p v-else class="op-empty">Ainda não há acessos de áudio registrados.</p>
    <div class="op-panel__foot">
      <span>“Chegam ao fim” conta <code>narration_ended</code> sobre <code>narration_started</code>; vem só da web até o app novo sair. Pessoas e acessos contam desde o início do registro.</span>
    </div>
  </section>
</template>
