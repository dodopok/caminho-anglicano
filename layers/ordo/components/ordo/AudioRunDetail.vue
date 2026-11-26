<script setup lang="ts">
import OrdoAudioRunActions from './AudioRunActions.vue'
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioApi } from '../../composables/useAudioApi'
import { useAudioStore } from '../../composables/useAudioStore'
import { errorText } from '../../composables/useReport'
import { isSessionError } from '../../types/dashboard'
import {
  failureCopy,
  isWaiting,
  KIND_LABELS,
  number,
  parametersLine,
  PROVIDER_SITES,
  providerName,
  runCost,
  runHeadline,
  runTimeline,
  usd
} from '../../utils/audio'
import type { AudioRun } from '../../types/audio'

// One run opened beside the list (`?execucao=1842`): what happened, what to
// do, the buttons that do it, what it produced and cost, its history and the
// parameters it was asked with.
const props = defineProps<{ id: string; initial?: AudioRun | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useAudioStore()
const api = useAudioApi()
const run = ref<AudioRun | null>(props.initial || null)
const loading = ref(false)
const error = ref<string | null>(null)
const copied = ref(false)

let request = 0
const load = async () => {
  const id = ++request
  loading.value = !run.value
  // A reread keeps what is on screen, error included, until its answer arrives.
  if (!run.value) error.value = null
  try {
    const response = await api.fetchRun(props.id)
    if (id === request) {
      run.value = response.operation
      error.value = null
    }
  } catch (caught) {
    if (id === request && !isSessionError(caught)) error.value = errorText(caught) || 'Não foi possível ler esta execução.'
  } finally {
    if (id === request) loading.value = false
  }
}

watch(() => props.id, () => {
  run.value = props.initial || null
  void load()
})
// The list's copy is fresher after an action; the detail rereads its history.
watch(() => props.initial, value => { if (value && run.value && String(value.id) === String(run.value.id) && value.status !== run.value.status) void load() })
watch(() => store.tick.value, () => { if (run.value && ['queued', 'running'].includes(run.value.status)) void load() })
onMounted(load)

const provider = computed(() => run.value?.provider ? providerName(run.value.provider) : store.providerLabel.value)
const copy = computed(() => run.value && (run.value.status === 'failed' || isWaiting(run.value)) ? failureCopy(run.value, provider.value, store.price.value) : null)
const cost = computed(() => run.value ? runCost(run.value, store.price.value) : null)
const timeline = computed(() => run.value ? runTimeline(run.value, store.now.value) : [])
const site = computed(() => PROVIDER_SITES[run.value?.provider || store.provider.data?.provider || ''] || null)
const params = computed(() => run.value ? parametersLine(run.value) : '')
const unit = computed(() => run.value?.kind === 'generate_office' ? 'Ofícios feitos' : 'Itens feitos')

const copyError = async () => {
  if (!run.value?.error_message) return
  try {
    await navigator.clipboard.writeText(run.value.error_message)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Without clipboard access the message is still on screen.
  }
}

const TONES: Record<string, string> = { quiet: 'var(--op-ink-faint)', info: 'var(--op-action)', gold: 'var(--op-gold)', danger: 'var(--op-danger)', ok: 'var(--op-ok)' }
</script>

<template>
  <aside class="op-drawer" aria-label="Detalhe da execução">
    <div class="op-drawer__head">
      <div>
        <p class="op-eyebrow">Execução #{{ id }}<template v-if="run"> · {{ KIND_LABELS[run.kind] || run.kind }}</template></p>
        <h3>{{ run ? runHeadline(run) : 'Execução' }}</h3>
      </div>
      <button type="button" class="op-icon-btn" style="width: 34px; height: 34px" aria-label="Fechar detalhe" @click="emit('close')"><OrdoIcon name="close" :size="16" /></button>
    </div>

    <span v-if="loading" class="op-skeleton" style="height: 260px" aria-hidden="true" />
    <p v-else-if="error && !run" class="op-inline-error" role="alert">{{ error }}</p>

    <template v-if="run">
      <template v-if="copy">
        <div class="op-inline-error" :class="{ 'op-inline-note--warn': isWaiting(run) }" style="align-items: flex-start">
          <OrdoIcon name="alert" :size="18" />
          <span><strong>{{ isWaiting(run) ? 'O que está acontecendo:' : 'O que aconteceu:' }}</strong> {{ isWaiting(run) ? `${provider} não respondeu; a geração espera e tenta de novo sozinha.` : copy.happened }}</span>
        </div>
        <div class="op-inline-note">
          <OrdoIcon name="info" :size="18" />
          <span><strong>O que fazer:</strong> {{ isWaiting(run) ? 'nada, se puder esperar. Para não esperar, toque em “Tentar agora”.' : copy.todo }}</span>
        </div>
      </template>

      <div class="op-flex">
        <OrdoAudioRunActions :run="run" />
        <a v-if="site && copy" class="op-btn op-btn--small" :href="site" target="_blank" rel="noopener noreferrer">Abrir na {{ provider }} <OrdoIcon name="external" :size="14" /></a>
        <button v-if="run.error_message" type="button" class="op-btn op-btn--small op-btn--ghost" @click="copyError">{{ copied ? 'Copiado' : 'Copiar erro' }}</button>
      </div>

      <hr class="op-hr">
      <dl class="op-kv">
        <div v-if="run.total_items"><dt>{{ unit }}</dt><dd>{{ number(run.processed_items) }} <small>de {{ number(run.total_items) }}</small></dd></div>
        <div><dt>Clips salvos</dt><dd>{{ number(run.generated_clips) }}</dd></div>
        <div><dt>Caracteres pagos</dt><dd>{{ number(run.generated_characters) }}</dd></div>
        <div><dt>{{ cost?.estimated ? 'Custaria' : run.status === 'failed' ? 'Custo até parar' : 'Custo' }}</dt><dd>{{ cost ? usd(cost.usd) : '—' }}</dd></div>
      </dl>
      <p v-if="run.character_budget" class="op-note">Limite de gasto: {{ number(run.character_budget) }} caracteres.</p>

      <hr class="op-hr">
      <div class="op-between">
        <span class="op-eyebrow">Linha do tempo</span>
        <OrdoSoonState v-if="run.attempts === undefined" compact text="O histórico de tentativas chega com a próxima versão da API." />
      </div>
      <ul class="op-timeline">
        <li v-for="item in timeline" :key="item.key">
          <i :style="{ background: TONES[item.tone] }" />
          <div>{{ item.text }}<small>{{ item.detail }}</small></div>
        </li>
      </ul>

      <details v-if="params" open>
        <summary class="op-faint" style="cursor: pointer; font-size: 13px; font-weight: 600">Parâmetros</summary>
        <p class="op-mono" style="margin: 8px 0 0; color: var(--op-ink-soft); overflow-wrap: anywhere">{{ params }}</p>
      </details>
    </template>
  </aside>
</template>
