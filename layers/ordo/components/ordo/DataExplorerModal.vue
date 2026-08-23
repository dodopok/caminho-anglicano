<script setup lang="ts">
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type {
  ExplorerColumn,
  ExplorerFilter,
  ExplorerRow,
  ExplorerValue,
  ExplorerRemotePagination
} from '../../types/explorer'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
  columns: ExplorerColumn[]
  rows: ExplorerRow[]
  filters?: ExplorerFilter[]
  searchPlaceholder?: string
  emptyMessage?: string
  defaultSortKey?: string
  defaultSortDirection?: 'asc' | 'desc'
  formatValue?: (value: ExplorerValue, key: string, row: ExplorerRow) => string
  remote?: boolean
  remoteSearch?: string
  remoteSortKey?: string
  remoteSortDirection?: 'asc' | 'desc'
  remotePagination?: ExplorerRemotePagination | null
  remoteLoading?: boolean
}>(), {
  description: undefined,
  eyebrow: 'Dados completos',
  filters: () => [],
  searchPlaceholder: 'Buscar nos dados…',
  emptyMessage: 'Nenhum registro corresponde aos filtros atuais.',
  defaultSortKey: undefined,
  defaultSortDirection: 'desc',
  formatValue: undefined,
  remote: false,
  remoteSearch: '',
  remoteSortKey: undefined,
  remoteSortDirection: 'desc',
  remotePagination: null,
  remoteLoading: false
})

const emit = defineEmits<{
  close: []
  'update:remote-search': [value: string]
  'remote-search': []
  'remote-sort': [key: string, direction: 'asc' | 'desc']
  'remote-page': [direction: number]
}>()

const { formatExplorerValue } = useOrdoDashboardPresentation()
const search = ref('')
const sortKey = ref(props.defaultSortKey || props.columns.find(column => column.sortable !== false)?.key || '')
const sortDirection = ref<'asc' | 'desc'>(props.defaultSortDirection)
const filterState = reactive<Record<string, string>>({})

const activeSearch = computed(() => props.remote ? props.remoteSearch : search.value)
const activeSortKey = computed(() => props.remote ? props.remoteSortKey || '' : sortKey.value)
const activeSortDirection = computed(() => props.remote ? props.remoteSortDirection : sortDirection.value)

for (const filter of props.filters) filterState[filter.key] = ''

const normalize = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')

const displayValue = (value: ExplorerValue, key: string, row: ExplorerRow) =>
  props.formatValue ? props.formatValue(value, key, row) : formatExplorerValue(value, key)

const matchesFilters = (row: ExplorerRow) => props.filters.every(filter => {
  const selected = filterState[filter.key]
  return !selected || String(row.values[filter.key] ?? '') === selected
})

const filteredRows = computed(() => {
  if (props.remote) return props.rows

  const needle = normalize(activeSearch.value.trim())
  return props.rows.filter(row => {
    if (!matchesFilters(row)) return false
    if (!needle) return true

    const searchableValues = [
      row.searchable,
      ...props.columns.map(column => row.values[column.key])
    ]
    return searchableValues.some(value => normalize(value).includes(needle))
  })
})

const sortedRows = computed(() => {
  if (props.remote) return props.rows

  const rows = [...filteredRows.value]
  if (!activeSortKey.value) return rows

  return rows.sort((left, right) => {
    const leftValue = left.values[activeSortKey.value]
    const rightValue = right.values[activeSortKey.value]
    const leftNumber = typeof leftValue === 'number' ? leftValue : Number.NaN
    const rightNumber = typeof rightValue === 'number' ? rightValue : Number.NaN
    let comparison = 0

    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      comparison = leftNumber - rightNumber
    } else {
      comparison = normalize(leftValue).localeCompare(normalize(rightValue), 'pt-BR', { numeric: true })
    }

    return activeSortDirection.value === 'asc' ? comparison : -comparison
  })
})

const toggleSort = (column: ExplorerColumn) => {
  if (column.sortable === false) return

  if (props.remote) {
    const nextDirection = activeSortKey.value === column.key
      ? (activeSortDirection.value === 'asc' ? 'desc' : 'asc')
      : 'desc'
    emit('remote-sort', column.key, nextDirection)
    return
  }

  if (sortKey.value === column.key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = column.key
  sortDirection.value = 'desc'
}

const sortLabel = (column: ExplorerColumn) => {
  if (activeSortKey.value !== column.key) return 'Ordenar'
  return activeSortDirection.value === 'asc' ? 'Ordenado crescente' : 'Ordenado decrescente'
}

const onRemoteSearchInput = (event: Event) => {
  emit('update:remote-search', (event.target as HTMLInputElement).value)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="ordo-modal-backdrop" @click.self="emit('close')">
    <section class="ordo-modal ordo-data-modal" role="dialog" aria-modal="true" aria-labelledby="ordo-data-modal-title">
      <div class="ordo-modal__header">
        <div>
          <p class="ordo-kicker">{{ eyebrow }}</p>
          <h2 id="ordo-data-modal-title">{{ title }}</h2>
          <span v-if="description">{{ description }}</span>
        </div>
        <button type="button" class="ordo-modal__close" aria-label="Fechar dados completos" @click="emit('close')">×</button>
      </div>

      <div class="ordo-data-modal__toolbar">
        <label class="ordo-data-modal__search">
          <span>Busca</span>
          <input v-if="remote" :value="remoteSearch" type="search" :placeholder="searchPlaceholder" autofocus @input="onRemoteSearchInput" @keyup.enter="emit('remote-search')">
          <input v-else v-model="search" type="search" :placeholder="searchPlaceholder" autofocus>
        </label>
        <button v-if="remote" type="button" class="ordo-button ordo-button--quiet" :disabled="remoteLoading" @click="emit('remote-search')">Buscar</button>
        <label v-for="filter in filters" :key="filter.key" class="ordo-data-modal__filter">
          <span>{{ filter.label }}</span>
          <select v-model="filterState[filter.key]" :aria-label="filter.label">
            <option value="">Todos</option>
            <option v-for="option in filter.options" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <div class="ordo-data-modal__count">
          <strong>{{ sortedRows.length }}</strong>
          <span>de {{ remotePagination?.total ?? rows.length }} registros</span>
        </div>
      </div>

      <div v-if="remoteLoading" class="ordo-data-modal__loading" role="status" aria-live="polite">Atualizando resultados…</div>

      <div v-if="sortedRows.length" class="ordo-data-modal__table-wrap">
        <table class="ordo-data-modal__table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key" :class="{ 'is-right': column.align === 'right' }" :aria-sort="activeSortKey === column.key ? `${activeSortDirection}ending` : 'none'">
                <button v-if="column.sortable !== false" type="button" :title="sortLabel(column)" @click="toggleSort(column)">
                  {{ column.label }}
                  <span aria-hidden="true">{{ activeSortKey === column.key ? (activeSortDirection === 'asc' ? '↑' : '↓') : '↕' }}</span>
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedRows" :key="row.id">
              <td v-for="column in columns" :key="column.key" :class="{ 'is-right': column.align === 'right' }">
                {{ displayValue(row.values[column.key], column.key, row) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="ordo-empty-inline ordo-data-modal__empty">
        <span class="ordo-empty-inline__mark">∅</span>
        <span>{{ emptyMessage }}</span>
      </div>

      <div v-if="remotePagination && remotePagination.totalPages > 1" class="ordo-pagination ordo-data-modal__pagination">
        <button type="button" :disabled="remotePagination.currentPage <= 1 || remoteLoading" @click="emit('remote-page', -1)">← Anterior</button>
        <span>Página {{ remotePagination.currentPage }} de {{ remotePagination.totalPages }}</span>
        <button type="button" :disabled="remotePagination.currentPage >= remotePagination.totalPages || remoteLoading" @click="emit('remote-page', 1)">Próxima →</button>
      </div>

      <div class="ordo-modal__actions">
        <button type="button" class="ordo-button ordo-button--quiet" @click="emit('close')">Fechar</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ordo-data-modal {
  width: min(1080px, 100%);
}

.ordo-data-modal__toolbar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 17px 26px 13px;
  border-bottom: 1px solid #e2e9df;
  background: #f3f7f1;
}

.ordo-data-modal__search,
.ordo-data-modal__filter {
  display: grid;
  min-width: 0;
  gap: 5px;
  color: #718073;
  font-size: 10px;
  font-weight: 800;
}

.ordo-data-modal__search {
  flex: 1 1 320px;
}

.ordo-data-modal__filter {
  flex: 0 1 170px;
}

.ordo-data-modal__search input,
.ordo-data-modal__filter select {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #dbe4d8;
  border-radius: 9px;
  outline: 0;
  background: #fff;
  color: #233328;
  font: inherit;
  font-size: 11px;
}

.ordo-data-modal__count {
  display: grid;
  flex: 0 0 auto;
  gap: 2px;
  min-width: 90px;
  color: #8d998e;
  font-size: 10px;
  text-align: right;
}

.ordo-data-modal__count strong {
  color: #496451;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 20px;
  font-weight: 600;
}

.ordo-data-modal__loading {
  padding: 8px 26px 0;
  color: #9a6c36;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.ordo-data-modal__table-wrap {
  max-height: min(500px, calc(100vh - 300px));
  overflow: auto;
  padding: 0 26px;
}

.ordo-data-modal__table {
  width: 100%;
  min-width: 580px;
  border-collapse: collapse;
}

.ordo-data-modal__table th {
  position: sticky;
  z-index: 1;
  top: 0;
  padding: 11px 10px;
  border-bottom: 1px solid #dfe7dd;
  background: #f8faf5;
  color: #97a296;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .1em;
  text-align: left;
  text-transform: uppercase;
}

.ordo-data-modal__table th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  text-transform: inherit;
}

.ordo-data-modal__table th button span {
  color: #c19258;
  font-size: 13px;
  letter-spacing: 0;
}

.ordo-data-modal__table th.is-right,
.ordo-data-modal__table td.is-right {
  text-align: right;
}

.ordo-data-modal__table td {
  padding: 12px 10px;
  border-bottom: 1px solid #edf1eb;
  color: #59685b;
  font-size: 12px;
  line-height: 1.35;
  vertical-align: top;
}

.ordo-data-modal__table td:first-child {
  color: #233328;
  font-weight: 700;
}

.ordo-data-modal__empty {
  padding: 28px 26px;
}

.ordo-data-modal__pagination {
  margin: 0 26px;
  border-top: 1px solid #edf1eb;
}

@media (max-width: 720px) {
  .ordo-data-modal__toolbar {
    align-items: stretch;
    flex-wrap: wrap;
    padding-right: 17px;
    padding-left: 17px;
  }

  .ordo-data-modal__search {
    flex-basis: 100%;
  }

  .ordo-data-modal__filter {
    flex: 1 1 150px;
  }

  .ordo-data-modal__count {
    align-self: center;
    margin-left: auto;
  }

  .ordo-data-modal__table-wrap {
    padding-right: 17px;
    padding-left: 17px;
  }

  .ordo-data-modal__pagination {
    margin-right: 17px;
    margin-left: 17px;
  }
}
</style>
