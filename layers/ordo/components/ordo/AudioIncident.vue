<script setup lang="ts">
import OrdoAudioQueueCard from './AudioQueueCard.vue'
import OrdoAudioRunActions from './AudioRunActions.vue'
import OrdoAudioRunRow from './AudioRunRow.vue'
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoMetricCard from './MetricCard.vue'
import OrdoSummaryBand from './SummaryBand.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { clock, PROVIDER_SITES, retrySchedule, runTitle, type AudioSummary } from '../../utils/audio'

// The provider is down (or rejecting) and runs wait for it: what is waiting,
// when it tries again, what already failed and what holds the queue, each
// with what to do about it.
const props = defineProps<{ summary: AudioSummary }>()

const store = useAudioStore()
const health = computed(() => store.provider.data)
const waiting = computed(() => store.waitingRuns.value)
const schedule = computed(() => waiting.value[0] ? retrySchedule(waiting.value[0]) : null)
const nextAttempt = computed(() => health.value?.next_attempt_at || schedule.value?.next || null)
const site = computed(() => PROVIDER_SITES[health.value?.provider || ''] || null)
const failure = computed(() => store.recentFailures.value[0] || null)

const providerValue = computed(() => health.value?.status === 'rejecting' ? 'Recusando' : health.value?.status === 'down' ? 'Fora do ar' : 'Instável')
const providerSub = computed(() => {
  const data = health.value
  if (!data) return 'Gerações esperando o provedor voltar'
  const parts = [store.providerLabel.value]
  if (data.last_error?.http_status && data.down_since) parts.push(`${data.last_error.http_status} desde ${clock(data.down_since)}`)
  else if (data.down_since) parts.push(`desde ${clock(data.down_since)}`)
  if (data.last_clip_at) parts.push(`último clip gerado às ${clock(data.last_clip_at)}`)
  return parts.join(' · ')
})
</script>

<template>
  <OrdoSummaryBand :title="props.summary.title" tone="danger" icon="alert">
    <template v-for="(part, index) in props.summary.parts" :key="index"><b v-if="part.strong">{{ part.text }}</b><template v-else>{{ part.text }}</template></template>
    <template #actions>
      <a v-if="site" class="op-btn op-btn--small" :href="site" target="_blank" rel="noopener noreferrer">Abrir a {{ store.providerLabel.value }} <OrdoIcon name="external" :size="14" /></a>
      <button type="button" class="op-btn op-btn--small" @click="store.go('execucoes')">Ver execuções</button>
    </template>
  </OrdoSummaryBand>

  <section class="op-tiles op-tiles--4" aria-label="Saúde da narração">
    <OrdoMetricCard title="Provedor" :value="providerValue" word>
      <template #badge><span class="op-dot op-dot--danger" aria-hidden="true" /></template>
      <span class="op-metric__sub">{{ providerSub }}</span>
    </OrdoMetricCard>
    <OrdoMetricCard title="Esperando o provedor" :value="String(waiting.length)" :unit="waiting.length === 1 ? 'geração' : 'gerações'">
      <template #badge><span class="op-dot" :class="waiting.length ? 'op-dot--warn' : 'op-dot--quiet'" aria-hidden="true" /></template>
      <span class="op-metric__sub">
        <template v-if="nextAttempt">Próxima tentativa às {{ clock(nextAttempt) }}<template v-if="schedule?.last"> · depois {{ clock(schedule.last) }} (última)</template></template>
        <template v-else>Nenhuma geração esperando</template>
      </span>
    </OrdoMetricCard>
    <OrdoMetricCard title="Falhas a resolver" :value="String(store.failures.value)">
      <template #badge><span class="op-dot" :class="{ 'op-dot--danger': store.failures.value }" aria-hidden="true" /></template>
      <span class="op-metric__sub">{{ failure?.error_message || (store.failures.value ? 'Falhas nas últimas 24 h' : 'Nenhuma falha nas últimas 24 h') }}</span>
      <button v-if="failure" type="button" class="op-link op-metric__go" @click="store.go('execucoes', { execucao: failure.id })">Ver falha <OrdoIcon name="arrow" :size="14" /></button>
    </OrdoMetricCard>
    <OrdoMetricCard title="Tarefas travadas" :value="String(store.deadJobs.value)">
      <template #badge><span class="op-dot" :class="{ 'op-dot--danger': store.deadJobs.value }" aria-hidden="true" /></template>
      <span class="op-metric__sub">{{ store.deadJobs.value ? 'Sem execução registrada: nunca vão terminar e seguram a fila' : 'A fila não tem tarefas travadas' }}</span>
      <button v-if="store.deadJobs.value" type="button" class="op-link op-metric__go" :disabled="store.queueBusy.value" @click="store.purgeQueue('dead')">Apagar {{ store.deadJobs.value === 1 ? 'a travada' : `as ${store.deadJobs.value}` }} <OrdoIcon name="arrow" :size="14" /></button>
    </OrdoMetricCard>
  </section>

  <section class="op-row" style="align-items: flex-start">
    <section class="op-card op-panel op-grow-2">
      <div class="op-panel__heading">
        <p class="op-eyebrow">Esperando o provedor</p>
        <h2>Tentam de novo sozinhas</h2>
        <p>Cada tentativa retoma de onde parou; os clips já salvos não são pagos de novo.</p>
      </div>
      <ul v-if="waiting.length" class="op-runs">
        <OrdoAudioRunRow v-for="run in waiting" :key="run.id" :run="run" :show-cost="false" selectable @select="store.go('execucoes', { execucao: run.id })">
          <template #actions><OrdoAudioRunActions :run="run" :only="['try_now', 'cancel']" :primary="null" /></template>
        </OrdoAudioRunRow>
      </ul>
      <p v-else class="op-empty">Nenhuma geração esperando agora; as próximas esperam e tentam de novo sozinhas.</p>
      <div class="op-panel__foot"><span>Esperas de 5, 15 e 30 minutos; na 4ª falha a geração para. Erro de crédito ou de chave (402, 401) não espera: falha na hora.</span></div>
    </section>

    <div class="op-grow-1" style="display: flex; flex-direction: column; gap: 16px">
      <section v-if="failure" class="op-card op-panel">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Falhou</p>
          <h3>{{ runTitle({ id: failure.id, kind: failure.kind, status: 'failed' }) }}</h3>
          <p><OrdoLocBadge :code="failure.prayer_book_code" /> · {{ clock(failure.completed_at) }}</p>
        </div>
        <p v-if="failure.error_message" class="op-run__msg op-run__msg--danger" style="margin: 0">{{ failure.error_message }}</p>
        <div class="op-flex">
          <OrdoAudioRunActions :run="{ id: failure.id, kind: failure.kind, status: 'failed' }" :only="['retry']" :primary="null" />
          <button type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="store.acknowledging.value" @click="store.acknowledgeFailures()">{{ store.acknowledging.value ? 'Limpando…' : 'Limpar aviso' }}</button>
        </div>
        <p v-if="store.acknowledgeError.value" class="op-note" role="alert">{{ store.acknowledgeError.value }}</p>
      </section>
      <OrdoAudioQueueCard />
    </div>
  </section>
</template>
