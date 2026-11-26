<script setup lang="ts">
import { useAudioStore } from '../../composables/useAudioStore'
import type { AudioRun } from '../../types/audio'

// The buttons that change a run: try again (a failed or cancelled run),
// cancel (queued or running) and try now (waiting for the provider). The API
// says which apply through `actions`; an API from before that is read from
// the status. A 404 on the click means the endpoint is not deployed yet: the
// button says "em breve" under it instead of failing.
type Action = 'retry' | 'cancel' | 'try_now'

const props = withDefaults(defineProps<{
  run: AudioRun
  only?: Action[]
  primary?: Action | null
  block?: boolean
}>(), { only: () => ['retry', 'cancel', 'try_now'], primary: 'retry', block: false })

const store = useAudioStore()
const state = computed(() => store.actionFor(props.run.id))

const allowed = (action: Action) => {
  const declared = props.run.actions?.[action]
  if (declared !== undefined && declared !== null) return declared
  if (action === 'retry') return props.run.status === 'failed' || props.run.status === 'cancelled'
  if (action === 'cancel') return props.run.status === 'queued' || props.run.status === 'running'
  return props.run.status === 'queued' && Boolean(props.run.next_attempt_at || props.run.waiting_for_provider)
}

const LABELS: Record<Action, string> = { retry: 'Tentar de novo', cancel: 'Cancelar', try_now: 'Tentar agora' }
const ORDER: Action[] = ['try_now', 'retry', 'cancel']
const shown = computed(() => ORDER.filter(action => props.only.includes(action) && allowed(action)))
</script>

<template>
  <div v-if="shown.length" class="op-run-actions" :class="{ 'is-block': block }" @click.stop>
    <button
      v-for="action in shown"
      :key="action"
      type="button"
      class="op-btn op-btn--small"
      :class="{ 'op-btn--primary': action === primary, 'op-btn--ghost': action === 'cancel' }"
      :disabled="state.busy"
      @click="store.runAction(run, action)"
    >
      {{ state.busy ? 'Enviando…' : LABELS[action] }}
    </button>
    <small v-if="state.note" class="op-run-actions__note" role="status">{{ state.note }}</small>
    <small v-else-if="state.error" class="op-run-actions__note is-error" role="alert">{{ state.error }}</small>
  </div>
</template>
