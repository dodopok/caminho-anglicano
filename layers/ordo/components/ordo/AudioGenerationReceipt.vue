<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import {
  costOf,
  durationEstimate,
  number,
  percentOf,
  pricePer1k,
  pricePerThousand,
  providerName,
  runningNowText,
  usd,
  weeklyCost
} from '../../utils/audio'
import type { AudioEstimateDetail } from '../../types/audio'

// The last step before buying: how much already exists, how much will be
// narrated, the provider's price, the total, an optional spending limit and
// the voice. The button says the amount.
const props = defineProps<{
  estimate: AudioEstimateDetail
  title: string
  description: string
  startDate: string
  days: number
  language?: string | null
  bibleName: string
  busy?: boolean
  error?: string | null
  /** Other generations queued or running: this one shares the worker. */
  runningNow?: number
  /** The API answered that an identical generation is already running. */
  duplicate?: boolean
}>()

const emit = defineEmits<{ back: []; submit: [budget: number | null]; scope: []; 'open-duplicate': [] }>()

const store = useAudioStore()

const ready = computed(() => props.estimate.ready_clips || 0)
const missing = computed(() => props.estimate.missing_clips || 0)
const characters = computed(() => props.estimate.missing_characters || 0)
const share = computed(() => percentOf(ready.value, missing.value))
const price = computed(() => {
  const fromCost = pricePer1k(props.estimate.cost, store.price.value)
  if (fromCost !== null) return fromCost
  return props.estimate.estimated_cost && characters.value ? props.estimate.estimated_cost / characters.value * 1000 : null
})
const total = computed(() => props.estimate.cost?.usd ?? props.estimate.estimated_cost ?? costOf(characters.value, price.value))
const provider = computed(() => props.estimate.cost?.provider_name || (props.estimate.provider?.provider ? providerName(props.estimate.provider.provider) : store.providerLabel.value))
const weeks = computed(() => weeklyCost(props.estimate.rows || [], props.startDate, props.days, price.value))
const duration = computed(() => durationEstimate(characters.value, store.runs.value))

// The limit starts empty: no default ceiling. Typed with or without dots.
const budgetText = ref('')
const budget = computed(() => {
  const digits = budgetText.value.replace(/\D/g, '')
  return digits ? Number(digits) : null
})
const budgetCost = computed(() => budget.value ? costOf(budget.value, price.value) : null)
const budgetTooLow = computed(() => budget.value !== null && budget.value < characters.value)
const formatBudget = () => { if (budget.value) budgetText.value = number(budget.value) }

const sharing = computed(() => runningNowText(props.runningNow || 0))

const voice = computed(() => {
  const profiles = store.provider.data?.profiles || store.summary.data?.profiles?.filter(item => item.profile_status === 'current') || []
  return profiles.find(item => item.language && props.language && item.language.toLowerCase() === props.language.toLowerCase()) || profiles[0] || props.estimate.provider || null
})
</script>

<template>
  <section class="op-row" style="align-items: flex-start">
    <section class="op-card op-panel op-grow-2">
      <div class="op-panel__head">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Você vai pedir à {{ provider }}</p>
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
        </div>
        <button type="button" class="op-link" @click="emit('scope')">Alterar escopo</button>
      </div>

      <div>
        <div class="op-between" style="margin-bottom: 8px">
          <span class="op-metric__label">Dos {{ number(ready + missing) }} trechos que esses ofícios pedem</span>
          <span class="op-faint" style="font-size: 13px">{{ share === null ? '' : `${Math.floor(share)}% já prontos` }}</span>
        </div>
        <div class="op-split" aria-hidden="true">
          <span :style="{ flex: ready || 0.0001, background: 'var(--op-ok)' }" />
          <span :style="{ flex: missing || 0.0001, background: 'var(--op-gold)' }" />
        </div>
        <div class="op-legend" style="margin-top: 8px">
          <span><i class="op-swatch" style="background: var(--op-ok)" />{{ number(ready) }} reaproveitados, sem custo</span>
          <span><i class="op-swatch" style="background: var(--op-gold)" />{{ number(missing) }} a narrar agora</span>
        </div>
      </div>

      <dl class="op-receipt">
        <div><dt>Trechos a narrar</dt><dd>{{ number(missing) }}</dd></div>
        <div><dt>Caracteres a narrar</dt><dd>{{ number(characters) }}</dd></div>
        <div><dt>Preço da {{ provider }}</dt><dd>{{ pricePerThousand(price) || 'não configurado na API' }}</dd></div>
        <div><dt>Tempo estimado</dt><dd>{{ duration }}</dd></div>
        <div class="is-total"><dt>Custo estimado</dt><dd>{{ usd(total) }}</dd></div>
      </dl>

      <div class="op-band" style="display: flex; flex-direction: column; gap: 12px; background: var(--op-paper-deep)">
        <label class="op-label" for="audio-budget">Parar se passar de</label>
        <div class="op-flex">
          <input id="audio-budget" v-model="budgetText" class="op-field" style="width: 200px" inputmode="numeric" placeholder="sem limite" @blur="formatBudget">
          <span class="op-faint" style="font-size: 13px">caracteres<template v-if="budgetCost !== null"> (≈ {{ usd(budgetCost) }})</template>. Se a conta crescer no caminho, a geração para e avisa.</span>
        </div>
        <span v-if="budgetTooLow" class="op-note" role="status">O limite é menor que os {{ number(characters) }} caracteres estimados: a geração vai parar antes de terminar.</span>
      </div>

      <p v-if="sharing" class="op-inline-note op-inline-note--warn" role="status"><OrdoIcon name="clock" :size="18" />{{ sharing }}</p>
      <p v-if="duplicate" class="op-inline-note" role="status"><OrdoIcon name="info" :size="18" /><span style="flex: 1">Já tem uma geração igual rodando</span><button type="button" class="op-link" @click="emit('open-duplicate')">Ver a execução</button></p>
      <p v-if="error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />{{ error }}</p>

      <div class="op-between">
        <span class="op-note" style="flex: 1 1 320px">Pode fechar esta página: a geração roda no servidor e aparece em Execuções. Se o provedor cair, ela espera e tenta de novo sozinha (até 4 vezes em ~1 h).</span>
        <div class="op-flex">
          <button type="button" class="op-btn" @click="emit('back')">Voltar</button>
          <button type="button" class="op-btn op-btn--primary" :disabled="busy || !missing" @click="emit('submit', budget)">
            {{ busy ? 'Enviando…' : missing ? `Gerar por ${usd(total)}` : 'Nada a gerar' }} <OrdoIcon v-if="!busy && missing" name="arrow" :size="16" />
          </button>
        </div>
      </div>
    </section>

    <div class="op-grow-1" style="display: flex; flex-direction: column; gap: 16px">
      <section class="op-card op-panel">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Voz</p>
          <h3>{{ provider }}<template v-if="voice?.voice"> · {{ voice.voice }}</template></h3>
          <p>A voz atual{{ voice?.language ? ` do ${voice.language}` : '' }}. Os clips novos saem com o mesmo perfil dos que já existem.</p>
        </div>
        <dl class="op-kv">
          <div><dt>Modelo</dt><dd style="font-size: 18px">{{ voice?.model || '—' }}</dd></div>
          <div><dt>Perfil</dt><dd class="op-audio-inline" style="font-size: 18px">atual <OrdoIcon name="check" :size="16" style="color: var(--op-ok)" /></dd></div>
        </dl>
        <div class="op-panel__foot"><span>Créditos restantes: veja na conta da {{ provider }}; a API não consulta o saldo.</span></div>
      </section>

      <section v-if="weeks.length > 1" class="op-card op-panel">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Por semana</p>
          <h3>Onde está o custo</h3>
        </div>
        <table class="op-table">
          <thead><tr><th scope="col">Semana</th><th scope="col" class="is-num">A narrar</th><th scope="col" class="is-num">Custo</th></tr></thead>
          <tbody>
            <tr v-for="week in weeks" :key="week.label">
              <th scope="row">{{ week.label }}</th>
              <td class="is-num">{{ number(week.missing) }}</td>
              <td class="is-num">{{ usd(week.usd) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="op-panel__foot"><span>Somado das linhas por dia e ofício que a estimativa devolve.</span></div>
      </section>

      <div class="op-inline-note">
        <OrdoIcon name="info" :size="18" />
        <span>Quer a {{ bibleName }} no livro inteiro, sem depender de data? Use <strong>Livro inteiro</strong> no passo 1: ele simula primeiro e mostra o custo antes de comprar.</span>
      </div>
    </div>
  </section>
</template>
