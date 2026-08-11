<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { CustomRosaryPrayer, CustomRosaryShareStatus } from '../../types/dashboard'

defineProps<{
  rosary: CustomRosaryPrayer
  loading: boolean
  actionLoading: boolean
  actionError?: string | null
  strapiSlug: string
  rejectionReason: string
}>()

const emit = defineEmits<{
  close: []
  'update:strapiSlug': [value: string]
  'update:rejectionReason': [value: string]
  approve: []
  reject: []
}>()

const { humanizeKey } = useOrdoDashboardPresentation()
const statusLabel = (status?: CustomRosaryShareStatus) => status ? humanizeKey(status) : 'Sem status'
const statusClass = (status?: CustomRosaryShareStatus) => `is-${status || 'unknown'}`

const onSlugInput = (event: Event) => emit('update:strapiSlug', (event.target as HTMLInputElement).value)
const onReasonInput = (event: Event) => emit('update:rejectionReason', (event.target as HTMLTextAreaElement).value)
</script>

<template>
  <div class="ordo-modal-backdrop" @click.self="emit('close')">
    <section class="ordo-modal" role="dialog" aria-modal="true" aria-labelledby="rosary-modal-title">
      <div class="ordo-modal__header"><div><p class="ordo-kicker">Revisão editorial</p><h2 id="rosary-modal-title">{{ rosary.title }}</h2><span>{{ rosary.author?.name || 'Autor não informado' }} · {{ rosary.locale || 'locale não informado' }}</span></div><button type="button" class="ordo-modal__close" aria-label="Fechar revisão" @click="emit('close')">×</button></div>
      <div v-if="loading" class="ordo-queue-loading">Carregando sequência expandida…</div>
      <template v-else>
        <div class="ordo-modal__facts"><span :class="['ordo-status', statusClass(rosary.share_status)]">{{ statusLabel(rosary.share_status) }}</span><span>{{ rosary.expanded_steps?.length || 0 }} passos expandidos</span><span v-if="rosary.strapi_slug">Strapi: {{ rosary.strapi_slug }}</span></div>
        <p v-if="rosary.description" class="ordo-modal__description">{{ rosary.description }}</p>
        <div v-if="rosary.expanded_steps?.length" class="ordo-modal__sequence"><div v-for="step in rosary.expanded_steps" :key="`${step.position}-${step.title}`" class="ordo-modal__step"><span>{{ String(step.position || 0).padStart(2, '0') }}</span><div><strong>{{ step.display_title || step.title || 'Sem título' }}</strong><small>{{ step.step_type || 'oração' }}</small><p>{{ step.text || 'Sem texto' }}</p></div></div></div>
        <div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">∅</span><span>Esta oração não possui passos expandidos.</span></div>
        <div class="ordo-modal__form"><label>Slug no Strapi (opcional)<input :value="strapiSlug" type="text" placeholder="rosario-pela-familia" @input="onSlugInput"></label><label>Nota de rejeição (opcional)<textarea :value="rejectionReason" rows="2" placeholder="Motivo para o autor ou para o histórico editorial" @input="onReasonInput" /></label></div>
        <div v-if="actionError" class="ordo-modal__error">{{ actionError }}</div>
        <div class="ordo-modal__actions"><button type="button" class="ordo-button ordo-button--quiet" :disabled="actionLoading" @click="emit('reject')">Rejeitar</button><button type="button" class="ordo-button ordo-button--primary" :disabled="actionLoading" @click="emit('approve')">{{ actionLoading ? 'Salvando…' : 'Aprovar revisão' }} <span>↗</span></button></div>
      </template>
    </section>
  </div>
</template>
