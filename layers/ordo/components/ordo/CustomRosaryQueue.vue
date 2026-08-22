<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { CustomRosaryPagination, CustomRosaryPrayer, CustomRosaryShareStatus, DashboardCustomRosaries } from '../../types/dashboard'

const props = defineProps<{
  rosaries: CustomRosaryPrayer[]
  pagination?: CustomRosaryPagination | null
  loading: boolean
  error?: string | null
  status: Exclude<CustomRosaryShareStatus, 'private'>
  currentPage: number
  totalPages: number
  summary?: DashboardCustomRosaries
  statusItems: Array<{ key: string; label: string; value: number }>
}>()

const emit = defineEmits<{
  'update:status': [value: Exclude<CustomRosaryShareStatus, 'private'>]
  change: []
  'change-page': [direction: number]
  open: [rosary: CustomRosaryPrayer]
  'open-all': []
}>()

const { formatNumber, formatDecimal, formatDate, maxItemValue, humanizeKey } = useOrdoDashboardPresentation()
const pageSize = 5
const isServerPaginated = computed(() => Boolean(props.pagination))
const queueTotal = computed(() => props.pagination?.total ?? props.rosaries.length)
const visibleRosaries = computed(() => isServerPaginated.value
  ? props.rosaries
  : props.rosaries.slice((props.currentPage - 1) * pageSize, props.currentPage * pageSize))
const queuePageCount = computed(() => props.pagination?.count ?? visibleRosaries.value.length)
const hasHiddenRosaries = computed(() => queueTotal.value > pageSize)
const statusLabel = (status?: CustomRosaryShareStatus) => status ? humanizeKey(status) : 'Sem status'
const statusClass = (status?: CustomRosaryShareStatus) => `is-${status || 'unknown'}`
const translationStatus = (rosary: CustomRosaryPrayer) => {
  if (rosary.translation_status) return humanizeKey(rosary.translation_status)

  return (rosary.translations || [])
    .filter(translation => translation.status)
    .map(translation => `${translation.locale ? `${translation.locale}: ` : ''}${humanizeKey(translation.status || '')}`)
    .join(' · ')
}

const onStatusChange = (event: Event) => {
  emit('update:status', (event.target as HTMLSelectElement).value as Exclude<CustomRosaryShareStatus, 'private'>)
  emit('change')
}
</script>

<template>
  <section class="ordo-queue-card">
    <div class="ordo-queue-card__header"><div><p class="ordo-kicker">Revisão editorial</p><h2>Rosários compartilhados</h2><span>{{ formatNumber(queuePageCount) }} nesta página · {{ formatNumber(queueTotal) }} no total</span></div><div class="ordo-table-card__header-actions"><button v-if="!loading && hasHiddenRosaries" type="button" class="ordo-card-action" @click="emit('open-all')">Abrir página em tabela ↗</button><span class="ordo-queue-card__count">{{ formatNumber(queuePageCount) }}</span></div></div>
    <div class="ordo-queue-card__filters"><select :value="status" aria-label="Status dos rosários" @change="onStatusChange"><option value="pending_review">Em revisão</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option></select><span class="ordo-filter-caption">{{ formatNumber(summary?.users_near_limit) }} pessoas perto do limite</span></div>
    <div class="ordo-queue-help ordo-queue-help--warm"><span>↗</span><p>Ao abrir uma oração, a revisão mostra os passos expandidos e os botões <strong>Aprovar</strong> e <strong>Rejeitar</strong>.</p></div>
    <div v-if="summary" class="ordo-highlight-grid ordo-highlight-grid--wide ordo-table-card__metrics"><div><span>Criados no período</span><strong>{{ formatNumber(summary.created_in_period) }}</strong></div><div><span>Públicos no período</span><strong>{{ formatNumber(summary.public_in_period) }}</strong></div><div><span>Média de blocos</span><strong>{{ formatDecimal(summary.average_blocks) }}</strong></div><div><span>Média de passos</span><strong>{{ formatDecimal(summary.average_expanded_steps) }}</strong></div></div>
    <div v-if="loading" class="ordo-queue-loading">Carregando fila…</div>
    <div v-else-if="error" class="ordo-queue-error">{{ error }}</div>
    <div v-else-if="visibleRosaries.length" class="ordo-queue-list"><button v-for="rosary in visibleRosaries" :key="rosary.id" type="button" class="ordo-queue-item ordo-queue-item--button" :aria-label="`Abrir revisão de ${rosary.title}`" @click="emit('open', rosary)"><div class="ordo-queue-item__mark ordo-queue-item__mark--warm">✦</div><div class="ordo-queue-item__copy"><div><strong>{{ rosary.title }}</strong><span :class="['ordo-status', statusClass(rosary.share_status)]">{{ statusLabel(rosary.share_status) }}</span></div><p>{{ rosary.description || 'Sem descrição' }}</p><small>{{ rosary.author?.name || 'Autor não informado' }} · {{ rosary.locale || 'locale não informado' }} · {{ formatDate(rosary.created_at) }}</small><small v-if="rosary.publication_status || rosary.documentId || translationStatus(rosary)">{{ rosary.publication_status ? `Publicação: ${humanizeKey(rosary.publication_status)}` : '' }}{{ rosary.documentId ? ` · documentId: ${rosary.documentId}` : '' }}{{ translationStatus(rosary) ? ` · Tradução: ${translationStatus(rosary)}` : '' }}</small></div><span class="ordo-queue-item__action">Revisar</span><span class="ordo-queue-item__arrow">↗</span></button></div>
    <div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">∅</span><span>Nenhuma oração nesta fila. Selecione outro status ou aguarde uma pendência para abrir a revisão.</span></div>
    <div v-if="totalPages > 1" class="ordo-pagination"><button type="button" :disabled="currentPage <= 1 || loading" @click="emit('change-page', -1)">← Anterior</button><span>Página {{ currentPage }} de {{ totalPages }}</span><button type="button" :disabled="currentPage >= totalPages || loading" @click="emit('change-page', 1)">Próxima →</button></div>
    <div v-if="summary" class="ordo-mini-bars ordo-mini-bars--compact"><div v-for="item in statusItems" :key="item.key"><span>{{ item.label }}</span><strong>{{ formatNumber(item.value) }}</strong><i><b class="is-ochre" :style="{ width: `${(item.value / maxItemValue(statusItems)) * 100}%` }" /></i></div></div>
  </section>
</template>
