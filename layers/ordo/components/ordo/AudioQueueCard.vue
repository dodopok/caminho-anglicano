<script setup lang="ts">
import { useAudioStore } from '../../composables/useAudioStore'
import { clock, number, plural } from '../../utils/audio'

// The worker jobs of the audio queue. A job with no execution behind it is
// stuck: it will never finish and holds the queue, so it is listed by name
// with the button that clears it.
const store = useAudioStore()

const JOB_STATES: Record<string, { label: string; tone: string }> = {
  running: { label: 'rodando', tone: 'info' },
  ready: { label: 'na fila', tone: 'gold' },
  scheduled: { label: 'agendada', tone: 'gold' },
  blocked: { label: 'bloqueada', tone: 'quiet' },
  failed: { label: 'falhou', tone: 'danger' },
  orphaned: { label: 'travada', tone: 'danger' }
}
const stateOf = (state?: string, claimed?: boolean) => JOB_STATES[state || (claimed ? 'running' : 'ready')] || { label: state || 'desconhecida', tone: 'quiet' }

const jobs = computed(() => store.queueJobs.value)
const stuck = computed(() => jobs.value.filter(job => job.purgeable || job.state === 'orphaned'))
const listed = computed(() => (stuck.value.length ? stuck.value : jobs.value).slice(0, 8))
const title = computed(() => stuck.value.length
  ? plural(store.deadJobs.value || stuck.value.length, 'tarefa travada', 'tarefas travadas')
  : jobs.value.length ? plural(jobs.value.length, 'tarefa na fila', 'tarefas na fila') : 'Fila vazia')
</script>

<template>
  <section id="audio-fila" class="op-card op-panel">
    <div class="op-panel__heading">
      <p class="op-eyebrow">Fila de processamento</p>
      <h3>{{ title }}</h3>
      <p v-if="stuck.length">Ficaram sem execução registrada: nunca vão terminar e seguram a fila. Apagar libera a fila e cancela as gerações que esperavam por elas.</p>
      <p v-else-if="jobs.length">As tarefas de áudio esperando para rodar ou rodando agora.</p>
      <p v-else>Nenhuma tarefa de áudio esperando.</p>
    </div>
    <p v-if="store.queueError.value" class="op-inline-error" role="alert">{{ store.queueError.value }}</p>
    <p v-if="store.queueNotice.value" class="op-inline-note" role="status">{{ store.queueNotice.value }}</p>
    <table v-if="listed.length" class="op-table">
      <tbody>
        <tr v-for="job in listed" :key="job.active_job_id || job.id">
          <th scope="row">{{ job.class_name || 'Tarefa' }}<br><small class="op-faint" style="font-weight: 500">{{ [job.queue_name, clock(job.created_at)].filter(Boolean).join(' · ') }}</small></th>
          <td class="is-num"><span class="op-pill" :class="`op-pill--${stateOf(job.state, job.claimed).tone}`">{{ stateOf(job.state, job.claimed).label }}</span></td>
        </tr>
      </tbody>
    </table>
    <p v-if="jobs.length > listed.length" class="op-note">e mais {{ number(jobs.length - listed.length) }}.</p>
    <div class="op-flex">
      <button v-if="store.deadJobs.value" type="button" class="op-btn op-btn--small op-btn--danger" :disabled="store.queueBusy.value" @click="store.purgeQueue('dead')">{{ store.queueBusy.value ? 'Limpando…' : `Apagar ${number(store.deadJobs.value)} ${store.deadJobs.value === 1 ? 'travada' : 'travadas'}` }}</button>
      <button type="button" class="op-btn op-btn--small op-btn--ghost" :disabled="store.queueBusy.value || !jobs.length" @click="store.purgeQueue('all')">Zerar fila…</button>
    </div>
  </section>
</template>
