<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { CustomRosaryPrayer, CustomRosaryShareStatus, DashboardCustomRosaries } from '../../types/dashboard'

const props = defineProps<{
  rosaries: CustomRosaryPrayer[]
  loading: boolean
  error?: string | null
  status: Exclude<CustomRosaryShareStatus, 'private'>
  summary?: DashboardCustomRosaries
  statusItems: Array<{ key: string; label: string; value: number }>
}>()

const emit = defineEmits<{
  'update:status': [value: Exclude<CustomRosaryShareStatus, 'private'>]
  change: []
  open: [rosary: CustomRosaryPrayer]
}>()

const { formatNumber, formatDate, maxItemValue, humanizeKey } = useOrdoDashboardPresentation()
const queueCount = computed(() => Math.max(
  props.rosaries.length,
  props.statusItems.find(item => item.key === props.status)?.value || 0
))
const statusLabel = (status?: CustomRosaryShareStatus) => status ? humanizeKey(status) : 'Sem status'
const statusClass = (status?: CustomRosaryShareStatus) => `is-${status || 'unknown'}`

const onStatusChange = (event: Event) => {
  emit('update:status', (event.target as HTMLSelectElement).value as Exclude<CustomRosaryShareStatus, 'private'>)
  emit('change')
}
</script>

<template>
  <section class="ordo-queue-card">
    <div class="ordo-queue-card__header"><div><p class="ordo-kicker">Revisão editorial</p><h2>Rosários compartilhados</h2><span>Abra um item para aprovar ou rejeitar</span></div><span class="ordo-queue-card__count">{{ formatNumber(queueCount) }}</span></div>
    <div class="ordo-queue-card__filters"><select :value="status" aria-label="Status dos rosários" @change="onStatusChange"><option value="pending_review">Em revisão</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option></select><span class="ordo-filter-caption">{{ formatNumber(summary?.users_near_limit) }} pessoas perto do limite</span></div>
    <div class="ordo-queue-help ordo-queue-help--warm"><span>↗</span><p>Ao abrir uma oração, a revisão mostra os passos expandidos e os botões <strong>Aprovar</strong> e <strong>Rejeitar</strong>.</p></div>
    <div v-if="loading" class="ordo-queue-loading">Carregando fila…</div>
    <div v-else-if="error" class="ordo-queue-error">{{ error }}</div>
    <div v-else-if="rosaries.length" class="ordo-queue-list"><button v-for="rosary in rosaries.slice(0, 5)" :key="rosary.id" type="button" class="ordo-queue-item ordo-queue-item--button" :aria-label="`Abrir revisão de ${rosary.title}`" @click="emit('open', rosary)"><div class="ordo-queue-item__mark ordo-queue-item__mark--warm">✦</div><div class="ordo-queue-item__copy"><div><strong>{{ rosary.title }}</strong><span :class="['ordo-status', statusClass(rosary.share_status)]">{{ statusLabel(rosary.share_status) }}</span></div><p>{{ rosary.description || 'Sem descrição' }}</p><small>{{ rosary.author?.name || 'Autor não informado' }} · {{ rosary.locale || 'locale não informado' }} · {{ formatDate(rosary.created_at) }}</small></div><span class="ordo-queue-item__action">Revisar</span><span class="ordo-queue-item__arrow">↗</span></button></div>
    <div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">∅</span><span>Nenhuma oração nesta fila. Selecione outro status ou aguarde uma pendência para abrir a revisão.</span></div>
    <div v-if="summary" class="ordo-mini-bars ordo-mini-bars--compact"><div v-for="item in statusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-ochre" :style="{ width: `${(item.value / maxItemValue(statusItems)) * 100}%` }" /></i></div></div>
  </section>
</template>
