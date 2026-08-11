<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { LifeRule, LifeRulePagination, LifeRuleStatus } from '../../types/dashboard'

defineProps<{
  rules: LifeRule[]
  pagination?: LifeRulePagination | null
  loading: boolean
  error?: string | null
  status: LifeRuleStatus
  search: string
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  'update:status': [value: LifeRuleStatus]
  'update:search': [value: string]
  search: []
  'change-page': [direction: number]
}>()

const { formatNumber, formatDate } = useOrdoDashboardPresentation()

const onStatusChange = (event: Event) => {
  emit('update:status', (event.target as HTMLSelectElement).value as LifeRuleStatus)
  emit('search')
}

const onSearchChange = (event: Event) => emit('update:search', (event.target as HTMLInputElement).value)
</script>

<template>
  <section class="ordo-queue-card">
    <div class="ordo-queue-card__header"><div><p class="ordo-kicker">Fila administrativa</p><h2>Regras de vida</h2><span>Somente leitura · públicas e mais antigas primeiro</span></div><span class="ordo-queue-card__count">{{ formatNumber(pagination?.total) }}</span></div>
    <div class="ordo-queue-card__filters"><select :value="status" aria-label="Status das regras" @change="onStatusChange"><option value="pending">Pendentes</option><option value="approved">Aprovadas</option><option value="all">Todas</option></select><input :value="search" type="search" placeholder="Buscar título" @input="onSearchChange" @keyup.enter="emit('search')"><button type="button" class="ordo-button ordo-button--quiet" @click="emit('search')">Buscar</button></div>
    <div class="ordo-queue-help"><span>i</span><p>A API atual permite consultar a fila, mas ainda não disponibiliza uma ação administrativa para aprovar regras de vida.</p></div>
    <div v-if="loading" class="ordo-queue-loading">Carregando fila…</div>
    <div v-else-if="error" class="ordo-queue-error">{{ error }}</div>
    <div v-else-if="rules.length" class="ordo-queue-list"><article v-for="rule in rules" :key="rule.id" class="ordo-queue-item"><div class="ordo-queue-item__mark">{{ rule.icon || '✦' }}</div><div class="ordo-queue-item__copy"><div><strong>{{ rule.title }}</strong><span :class="['ordo-status', rule.approved ? 'is-approved' : 'is-pending']">{{ rule.approved ? 'Aprovada' : 'Pendente' }}</span></div><p>{{ rule.description || 'Sem descrição' }}</p><small>{{ rule.owner?.name || 'Autor não informado' }} · {{ formatDate(rule.created_at) }} · {{ formatNumber(rule.adoption_count) }} adoções</small><details v-if="rule.steps?.length" class="ordo-steps"><summary>{{ rule.steps.length }} etapas</summary><ol><li v-for="step in rule.steps" :key="step.id">{{ step.title }}<span v-if="step.description"> — {{ step.description }}</span></li></ol></details></div></article></div>
    <div v-else class="ordo-empty-inline"><span class="ordo-empty-inline__mark">∅</span><span>Nenhuma regra encontrada nesta combinação.</span></div>
    <div class="ordo-pagination"><button type="button" :disabled="currentPage <= 1 || loading" @click="emit('change-page', -1)">← Anterior</button><span>Página {{ currentPage }} de {{ totalPages }}</span><button type="button" :disabled="currentPage >= totalPages || loading" @click="emit('change-page', 1)">Próxima →</button></div>
  </section>
</template>
