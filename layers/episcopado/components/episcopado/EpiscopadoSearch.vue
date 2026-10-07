<template>
  <div ref="root" class="relative w-full">
    <label :for="inputId" class="sr-only">Buscar clérigo ou jurisdição</label>
    <div
      class="flex items-center gap-3 bg-white border border-stone-300 shadow-sm focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-200 transition"
      :class="size === 'lg' ? 'rounded-2xl px-5 py-4' : 'rounded-xl px-3 py-2'"
    >
      <svg class="shrink-0 text-stone-400" :class="size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        class="w-full bg-transparent outline-none text-stone-800 placeholder:text-stone-400"
        :class="size === 'lg' ? 'text-lg' : 'text-sm'"
        @focus="open = true"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.exact.prevent="choose(results[active]?.node)"
        @keydown.shift.enter.prevent="choose(results[active]?.node, true)"
        @keydown.esc="open = false"
      >
      <kbd v-if="size === 'lg'" class="hidden sm:inline text-xs text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">/</kbd>
    </div>

    <ul
      v-show="open && query.trim() !== ''"
      :id="listId"
      role="listbox"
      class="absolute z-30 mt-2 w-full max-h-96 overflow-auto bg-white border border-stone-200 rounded-xl shadow-lg py-1"
    >
      <li v-if="results.length === 0" class="px-4 py-3 text-sm text-stone-500">
        Nada encontrado para “{{ query }}”.
      </li>
      <li
        v-for="(r, i) in results"
        :id="`${listId}-${i}`"
        :key="r.node.id"
        role="option"
        :aria-selected="i === active"
        class="flex items-center gap-3 px-4 py-2 cursor-pointer"
        :class="i === active ? 'bg-amber-50' : 'hover:bg-stone-50'"
        @mousedown.prevent="choose(r.node)"
        @mouseenter="active = i"
      >
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: nodeColor(r.node) }" aria-hidden="true" />
        <span class="flex-1 min-w-0">
          <span class="block text-stone-800 truncate">{{ r.node.label }}</span>
          <span class="block text-xs text-stone-500 truncate">{{ subtitle(r.node) }}</span>
        </span>
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
}>(), {
  placeholder: 'Buscar clérigo ou jurisdição…',
  size: 'sm',
  shortcut: false
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
