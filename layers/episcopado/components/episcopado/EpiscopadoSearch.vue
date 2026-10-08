<template>
  <div ref="root" class="relative w-full">
    <label :for="inputId" class="sr-only">Buscar clérigo ou jurisdição</label>
    <div
      class="flex items-center gap-2.5 rounded-ep border border-ep-rule bg-ep-paper transition-colors hover:border-ep-faint focus-within:!border-ep-ink focus-within:bg-ep-card"
      :class="size === 'lg' ? 'h-12 px-4' : 'h-9 px-3'"
    >
      <svg class="shrink-0 text-ep-faint" :class="size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]'" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input
        :id="inputId"
        ref="input"
        v-model="query"
        type="search"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open && results.length > 0"
        :aria-controls="listId"
        :aria-activedescendant="results[active] ? `${listId}-${active}` : undefined"
        :placeholder="placeholder"
        class="w-full min-w-0 bg-transparent text-ep-ink outline-none placeholder:text-ep-faint [&::-webkit-search-cancel-button]:hidden"
        :class="size === 'lg' ? 'text-base' : 'text-[15px]'"
        @focus="open = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.exact.prevent="choose(results[active]?.node)"
        @keydown.shift.enter.prevent="choose(results[active]?.node, true)"
        @keydown.esc="open = false"
      >
      <kbd v-if="shortcut" class="hidden rounded-ep border border-ep-rule px-[5px] font-ep-mono text-[11px] text-ep-faint sm:inline">/</kbd>
    </div>

    <ul
      v-show="open && query.trim() !== ''"
      :id="listId"
      role="listbox"
      class="absolute z-30 mt-1 max-h-[360px] w-full overflow-auto rounded-ep border border-ep-line bg-ep-card p-1.5 shadow-[0_6px_20px_rgba(21,19,15,.16)]"
    >
      <li v-if="results.length === 0" class="px-3 py-2.5 text-sm text-ep-muted">
        Nada encontrado para “{{ query }}”.
      </li>
      <li
        v-for="(r, i) in results"
        :id="`${listId}-${i}`"
        :key="r.node.id"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-pointer items-center gap-2.5 rounded-ep px-2.5 py-2"
        :class="i === active ? 'bg-ep-garnet-soft' : 'hover:bg-ep-paper'"
        @mousedown.prevent="choose(r.node)"
        @mouseenter="active = i"
      >
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: nodeColor(r.node) }" aria-hidden="true" />
        <span class="flex-1 min-w-0">
          <span class="block truncate text-sm text-ep-ink">{{ r.node.label }}</span>
          <span class="block truncate text-xs text-ep-muted">{{ subtitle(r.node) }}</span>
        </span>
        <span v-if="hints && i === active" class="hidden shrink-0 whitespace-nowrap text-[11px] text-ep-faint sm:inline">↵ seleciona · ⇧↵ ficha</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import { JURISDICTION_TYPE_LABEL, ORDER_LABEL } from '../../lib/labels'
import { searchNodes } from '../../lib/search'
import { nodeColor } from '../../lib/style'

const props = withDefaults(defineProps<{
  nodes: GraphNode[]
  placeholder?: string
  size?: 'lg' | 'sm'
  /** Atalho "/" foca a busca. */
  shortcut?: boolean
  /** Mostra a dica "↵ seleciona · ⇧↵ ficha" no resultado ativo (explorador). */
  hints?: boolean
}>(), {
  placeholder: 'Buscar clérigo ou jurisdição…',
  size: 'sm',
  shortcut: false,
  hints: false
})

const emit = defineEmits<{
  select: [node: GraphNode]
  /** Shift+Enter: abrir a ficha em vez de selecionar no grafo. */
  open: [node: GraphNode]
}>()

const uid = useId()
const inputId = `busca-${uid}`
const listId = `resultados-${uid}`
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const active = ref(0)

const results = computed(() => searchNodes(props.nodes, query.value))
watch(query, () => {
  active.value = 0
  open.value = true
})

function move(step: number) {
  if (!results.value.length) return
  active.value = (active.value + step + results.value.length) % results.value.length
}

function choose(node: GraphNode | undefined, openSheet = false) {
  if (!node) return
  if (openSheet) emit('open', node)
  else emit('select', node)
  query.value = ''
  open.value = false
  input.value?.blur()
}

function subtitle(node: GraphNode): string {
  if (node.kind === 'jurisdiction') {
    const name = node.search[0] && node.search[0] !== node.label ? node.search[0] : ''
    return [node.jurisdictionType ? JURISDICTION_TYPE_LABEL[node.jurisdictionType] : 'Jurisdição', name].filter(Boolean).join(' · ')
  }
  return node.order ? ORDER_LABEL[node.order] : 'Pessoa'
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.isContentEditable) {
    e.preventDefault()
    input.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  if (props.shortcut) document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>
