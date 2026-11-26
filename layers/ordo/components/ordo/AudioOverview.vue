<script setup lang="ts">
import OrdoAudioCoverageList from './AudioCoverageList.vue'
import OrdoAudioCoverageMatrix from './AudioCoverageMatrix.vue'
import OrdoAudioIncident from './AudioIncident.vue'
import OrdoAudioNarrationUsage from './AudioNarrationUsage.vue'
import OrdoAudioQueueCard from './AudioQueueCard.vue'
import OrdoAudioRunRow from './AudioRunRow.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoSoonState from './SoonState.vue'
import OrdoSummaryBand from './SummaryBand.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import {
  buildAudioSummary,
  clock,
  compact,
  estimateFinish,
  isLive,
  isWaiting,
  number,
  runBible,
  runProgress
} from '../../utils/audio'
import type { AudioRun } from '../../types/audio'

// "Visão geral" answers three questions in order: is something wrong or
// waiting for me, do the offices of the next weeks have voice, and what is
// running. When the provider is down the incident takes the whole page.
const store = useAudioStore()

const summary = computed(() => buildAudioSummary({
  readiness: store.readiness.data,
  bookName: store.bookName,
  provider: store.provider.data,
  providerLabel: store.providerLabel.value,
  runs: store.runs.value,
  pendingCandidates: store.pendingCandidates.value,
  failures: store.failures.value,
  deadJobs: store.deadJobs.value,
  now: store.now.value
}))

const coverage = computed(() => store.readiness.data?.computed_at ? store.readiness.data.summary || null : null)
const running = computed(() => store.runningRuns.value[0] || null)
const active = computed(() => store.activeRuns.value)
const finish = computed(() => running.value ? estimateFinish(running.value, store.now.value) : null)
const runningDays = computed(() => Number(running.value?.parameters?.days || 0))

// Live runs first, then the latest; three is enough for "agora e por último".
const recent = computed<AudioRun[]>(() => {
  const live = store.runs.value.filter(run => isLive(run) && !isWaiting(run))
  const done = store.runs.value.filter(run => !isLive(run))
  return [...live, ...done].slice(0, 3)
})

const profile = computed(() => store.provider.data?.profiles?.[0] || store.summary.data?.profiles?.find(item => item.profile_status === 'current') || null)
const providerLine = computed(() => {
  const data = store.provider.data
  if (!data) return null
  const parts: string[] = []
  parts.push(data.status === 'up' ? 'Respondendo' : data.status === 'unknown' ? 'Sem dados recentes' : 'Com problema')
  const last = data.last_clip_at || data.last_success_at
  if (last) {
    const minutes = Math.round((store.now.value.getTime() - new Date(last).getTime()) / 60_000)
    parts.push(minutes < 1 ? 'último clip agora' : minutes < 60 ? `último clip há ${minutes} min` : `último clip às ${clock(last)}`)
  }
  if (profile.value?.voice) parts.push(`voz ${profile.value.voice}${profile.value.language ? ` (${profile.value.language})` : ''}`)
  return parts.join(' · ')
})

const failureLine = computed(() => {
  if (store.failures.value) return store.recentFailures.value[0]?.error_message || 'Uma geração falhou nas últimas 24 h.'
  return `Nenhuma geração falhou nas últimas 24 h${store.deadJobs.value ? '' : ' · fila sem tarefas travadas'}`
})

const catalog = computed(() => {
  const data = store.summary.data
  if (!data) return null
  const total = data.total_clips || 0
  return {
    clips: number(total),
    hours: `${number(Math.round((data.total_duration_seconds || 0) / 3600))} h`,
    characters: compact(data.total_characters),
    current: total ? `${Math.round((data.current_clips || 0) / total * 100)}%` : '—',
    old: number((data.stale_clips || 0) + (data.legacy_clips || 0))
  }
})

const openRun = (run: AudioRun) => store.go('execucoes', { execucao: run.id })
</script>

<template>
  <OrdoAudioIncident v-if="summary.incident" :summary="summary" />

  <template v-else>
    <OrdoSummaryBand :title="summary.title" :tone="summary.tone" icon="audio">
      <template v-for="(part, index) in summary.parts" :key="index"><b v-if="part.strong">{{ part.text }}</b><template v-else>{{ part.text }}</template></template>
      <template #actions>
        <button type="button" class="op-btn op-btn--small op-only-wide" @click="store.go('cobertura')">Ver cobertura</button>
        <button v-if="store.pendingCandidates.value" type="button" class="op-btn op-btn--small op-only-wide" @click="store.go('clips')">Ouvir {{ store.pendingCandidates.value }} {{ store.pendingCandidates.value === 1 ? 'tentativa' : 'tentativas' }}</button>
      </template>
    </OrdoSummaryBand>

    <section class="op-tiles op-tiles--5 op-only-wide" aria-label="Saúde da narração">
      <OrdoMetricCard title="Cobertura" :value="coverage ? String(Math.floor(coverage.percentage ?? 0)) : '—'" :unit="coverage ? '%' : undefined" :loading="store.readiness.loading && !store.readiness.settled">
        <template #badge><OrdoSoonState v-if="store.readiness.soon" compact text="A cobertura guardada chega com o cálculo noturno da API." /></template>
        <span class="op-metric__sub">{{ coverage ? `Próximas ${Math.round(store.readinessDays.value / 7)} semanas, Bíblia padrão · ${number(coverage.missing_clips)} trechos faltando` : store.readiness.soon ? 'Por livro, em Cobertura, calculada na hora' : 'Depois da primeira rodada noturna' }}</span>
        <button type="button" class="op-link op-metric__go" @click="store.go('cobertura')">Ver por livro <OrdoIcon name="arrow" :size="14" /></button>
      </OrdoMetricCard>

      <OrdoMetricCard title="Em andamento" :value="String(active.length)" :unit="active.length === 1 ? 'geração' : 'gerações'" :loading="store.loading.value">
        <template #badge><span class="op-dot" :class="active.length ? 'op-dot--info' : 'op-dot--quiet'" aria-hidden="true" /></template>
        <span v-if="running" class="op-metric__sub">
          <OrdoLocBadge :code="running.prayer_book_code" /> · {{ runBible(running) || 'Bíblia padrão' }}<template v-if="runningDays"> · {{ runningDays }} dias</template> · {{ runProgress(running) ?? 0 }}%<template v-if="finish"> · termina ~{{ clock(finish) }}</template>
        </span>
        <span v-else class="op-metric__sub">{{ active.length ? 'Na fila, esperando a vez' : 'Nenhuma geração rodando agora' }}</span>
        <div v-if="running" class="op-progress"><span :style="{ width: `${runProgress(running) ?? 0}%` }" /></div>
      </OrdoMetricCard>

      <OrdoMetricCard title="Falhas a resolver" :value="String(store.failures.value)" :loading="store.loading.value">
        <template #badge><span class="op-dot" :class="store.failures.value || store.deadJobs.value ? 'op-dot--danger' : ''" aria-hidden="true" /></template>
        <span class="op-metric__sub">{{ failureLine }}</span>
        <button type="button" class="op-link op-metric__go" @click="store.go('execucoes')">{{ store.failures.value ? 'Ver falhas' : 'Histórico' }} <OrdoIcon name="arrow" :size="14" /></button>
      </OrdoMetricCard>

      <OrdoMetricCard title="Provedor" :value="store.providerLabel.value" word :loading="store.loading.value">
        <template #badge><OrdoSoonState v-if="store.provider.soon" compact text="A saúde do provedor chega com a próxima versão da API." /></template>
        <span v-if="providerLine" class="op-metric__sub"><span class="op-dot op-dot--small" :class="{ 'op-dot--quiet': store.provider.data?.status === 'unknown' }" aria-hidden="true" />{{ providerLine }}</span>
        <span v-else class="op-metric__sub">{{ profile?.voice ? `Voz ${profile.voice}${profile.language ? ` (${profile.language})` : ''}` : 'Voz atual do catálogo' }}</span>
      </OrdoMetricCard>

      <OrdoMetricCard title="Para ouvir" :value="String(store.pendingCandidates.value)" :unit="store.pendingCandidates.value === 1 ? 'tentativa' : 'tentativas'" :loading="store.loading.value">
        <template #badge><span v-if="store.pendingCandidates.value" class="op-count">{{ store.pendingCandidates.value }}</span></template>
        <span class="op-metric__sub">{{ store.pendingCandidates.value ? 'Regenerações com observação esperando sua aprovação' : 'Nenhuma tentativa esperando você' }}</span>
        <button v-if="store.pendingCandidates.value" type="button" class="op-link op-metric__go" @click="store.go('clips')">Ouvir agora <OrdoIcon name="arrow" :size="14" /></button>
      </OrdoMetricCard>
    </section>

    <div class="op-only-narrow">
      <section class="op-tiles op-tiles--4" aria-label="Saúde da narração">
        <OrdoMetricCard title="Cobertura" :value="coverage ? String(Math.floor(coverage.percentage ?? 0)) : '—'" :unit="coverage ? '%' : undefined" :subtitle="coverage ? `${number(coverage.missing_clips)} trechos faltando` : 'em breve'" />
        <OrdoMetricCard title="Rodando" :value="running ? String(runProgress(running) ?? 0) : '0'" :unit="running ? '%' : undefined" :subtitle="running ? `${running.prayer_book_code || ''}${finish ? ` · ~${clock(finish)}` : ''}` : 'nada agora'">
          <template #badge><span class="op-dot" :class="running ? 'op-dot--info' : 'op-dot--quiet'" aria-hidden="true" /></template>
        </OrdoMetricCard>
        <OrdoMetricCard title="Falhas" :value="String(store.failures.value)" subtitle="nas últimas 24 h">
          <template #badge><span class="op-dot" :class="{ 'op-dot--danger': store.failures.value }" aria-hidden="true" /></template>
        </OrdoMetricCard>
        <OrdoMetricCard title="Para ouvir" :value="String(store.pendingCandidates.value)" subtitle="tentativas de clip">
          <template #badge><span v-if="store.pendingCandidates.value" class="op-count">{{ store.pendingCandidates.value }}</span></template>
        </OrdoMetricCard>
      </section>
    </div>

    <div class="op-only-wide"><OrdoAudioCoverageMatrix /></div>
    <div class="op-only-narrow"><OrdoAudioCoverageList /></div>

    <section class="op-row op-only-wide">
      <section class="op-card op-panel op-grow-2">
        <div class="op-panel__head">
          <div class="op-panel__heading">
            <p class="op-eyebrow">Execuções</p>
            <h2>Agora e por último</h2>
            <p>Atualiza sozinho enquanto houver geração rodando.</p>
          </div>
          <button type="button" class="op-link" @click="store.go('execucoes')">Ver todas <OrdoIcon name="arrow" :size="14" /></button>
        </div>
        <ul v-if="recent.length" class="op-runs">
          <OrdoAudioRunRow v-for="run in recent" :key="run.id" :run="run" with-day office-names selectable @select="openRun" />
        </ul>
        <p v-else-if="store.runsError.value" class="op-inline-error" role="alert">{{ store.runsError.value }}</p>
        <p v-else class="op-empty">Nenhuma geração registrada ainda.</p>
      </section>
      <div class="op-grow-1" style="display: flex"><OrdoAudioNarrationUsage style="flex: 1" /></div>
    </section>

    <div class="op-only-narrow">
      <section class="op-card op-panel">
        <div class="op-panel__heading"><p class="op-eyebrow">Agora</p><h3>Rodando</h3></div>
        <ul v-if="running" class="op-runs">
          <OrdoAudioRunRow :run="running" :show-cost="false" selectable @select="openRun" />
        </ul>
        <p v-else class="op-empty">Nenhuma geração rodando.</p>
      </section>
    </div>

    <OrdoAudioQueueCard v-if="store.deadJobs.value" />

    <section v-if="catalog" class="op-card op-card--quiet op-only-wide op-audio-catalog" aria-label="Catálogo">
      <div class="op-flex" style="gap: 10px 28px">
        <span class="op-eyebrow">Catálogo</span>
        <span><strong class="op-display">{{ catalog.clips }}</strong> <span class="op-faint">clips</span></span>
        <span><strong class="op-display">{{ catalog.hours }}</strong> <span class="op-faint">narradas</span></span>
        <span><strong class="op-display">{{ catalog.characters }}</strong> <span class="op-faint">caracteres</span></span>
        <span><strong class="op-display">{{ catalog.current }}</strong> <span class="op-faint">na voz atual</span></span>
        <span><strong class="op-display">{{ catalog.old }}</strong> <span class="op-faint">em voz antiga</span></span>
      </div>
      <button type="button" class="op-link" @click="store.go('manutencao')">Limpar voz antiga em Manutenção <OrdoIcon name="arrow" :size="14" /></button>
    </section>
  </template>
</template>
