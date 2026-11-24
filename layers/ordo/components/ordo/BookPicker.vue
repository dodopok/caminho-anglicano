<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import { useOrdoDashboardPresentation } from '../../composables/useOrdoDashboardPresentation'
import type { AudioPrayerBook } from '../../types/dashboard'

// A prayer book chooser that reads like the books do: the name first, then
// the LOC code as a badge, the language and the year. The native select it
// replaces listed "loc_2015 · IEAB - 2015" forty times in one font, with no
// way to search.
const props = withDefaults(defineProps<{
  modelValue: string
  books: AudioPrayerBook[]
  /** Only these codes, in this order (books the API knows nothing about still show). */
  codes?: string[]
  label?: string
  /** Offers '' as the first option, e.g. "Todos os livros". */
  emptyLabel?: string
  disabled?: boolean
  compact?: boolean
}>(), {
  codes: undefined,
  label: 'Livro de oração',
  emptyLabel: undefined
})

const emit = defineEmits<{ 'update:modelValue': [code: string] }>()

const { languageLabel } = useOrdoDashboardPresentation()

const open = ref(false)
const search = ref('')
const activeIndex = ref(0)
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const listbox = ref<HTMLElement | null>(null)
const uid = `book-picker-${Math.random().toString(36).slice(2, 9)}`

interface Option {
  code: string
  name: string
  detail: string
  language: string
  recommended: boolean
}

const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')

const toOption = (book: Partial<AudioPrayerBook> & { code: string }): Option => ({
  code: book.code,
  name: book.name || book.code,
  detail: [book.jurisdiction, book.year].filter(Boolean).join(' · ') || (book.full_name && book.full_name !== book.name ? book.full_name : ''),
  language: book.language ? languageLabel(book.language) : '',
  recommended: Boolean(book.is_recommended)
})

const options = computed<Option[]>(() => {
  if (props.codes) {
    return props.codes.map(code => toOption(props.books.find(book => book.code === code) || { code }))
  }
  return props.books.map(book => toOption(book))
})

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  const list = term
    ? options.value.filter(option => normalize(`${option.name} ${option.code} ${option.detail} ${option.language}`).includes(term))
    : options.value
  return props.emptyLabel && !term ? [{ code: '', name: props.emptyLabel, detail: '', language: '', recommended: false }, ...list] : list
})

// Grouped by language when there is more than one and nobody is searching.
const groups = computed(() => {
  const languages = new Set(filtered.value.filter(option => option.code).map(option => option.language))
  if (search.value.trim() || languages.size < 2) return [{ language: '', items: filtered.value }]
  const byLanguage = new Map<string, Option[]>()
  filtered.value.forEach(option => {
    const key = option.code ? option.language || 'Outros' : ''
    byLanguage.set(key, [...(byLanguage.get(key) || []), option])
  })
  return Array.from(byLanguage.entries()).map(([language, items]) => ({ language, items }))
})

const selected = computed(() => options.value.find(option => option.code === props.modelValue)
  || (props.emptyLabel && !props.modelValue ? { code: '', name: props.emptyLabel, detail: '', language: '', recommended: false } : null))

const indexOf = (option: Option) => filtered.value.findIndex(item => item.code === option.code)

const scrollActiveIntoView = () => nextTick(() => {
  listbox.value?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
})

const show = async () => {
  if (props.disabled) return
  open.value = true
  search.value = ''
  activeIndex.value = Math.max(0, filtered.value.findIndex(option => option.code === props.modelValue))
  await nextTick()
  searchInput.value?.focus()
  scrollActiveIntoView()
}

const hide = () => {
  open.value = false
}

const choose = (option: Option | undefined) => {
  if (!option) return
  emit('update:modelValue', option.code)
  hide()
  root.value?.querySelector<HTMLButtonElement>('.book-picker__trigger')?.focus()
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    activeIndex.value = Math.min(Math.max(activeIndex.value + step, 0), Math.max(filtered.value.length - 1, 0))
    scrollActiveIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose(filtered.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    hide()
    root.value?.querySelector<HTMLButtonElement>('.book-picker__trigger')?.focus()
  } else if (event.key === 'Tab') {
    hide()
  }
}

watch(search, () => { activeIndex.value = 0 })

const onPointerDown = (event: PointerEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) hide()
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="book-picker" :class="{ 'is-open': open, 'is-compact': compact }">
    <span :id="`${uid}-label`" class="book-picker__label">{{ label }}</span>
    <button
      type="button"
      class="book-picker__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-labelledby="`${uid}-label ${uid}-value`"
      @click="open ? hide() : show()"
      @keydown.down.prevent="show"
    >
      <span :id="`${uid}-value`" class="book-picker__value">
        <strong>{{ selected?.name || 'Escolha um livro' }}</strong>
        <small v-if="!compact && selected && (selected.detail || selected.language)">{{ [selected.language, selected.detail].filter(Boolean).join(' · ') }}</small>
      </span>
      <OrdoLocBadge v-if="selected?.code" :code="selected.code" />
      <OrdoIcon name="chevron-down" :size="16" class="book-picker__chevron" />
    </button>

    <div v-if="open" class="book-picker__pop" @keydown="onKeydown">
      <label class="book-picker__search">
        <OrdoIcon name="search" :size="16" />
        <span class="op-sr-only">Buscar livro</span>
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          placeholder="Nome, código, ano ou idioma"
          role="combobox"
          aria-autocomplete="list"
          :aria-controls="`${uid}-list`"
          :aria-activedescendant="filtered[activeIndex] ? `${uid}-opt-${activeIndex}` : undefined"
          aria-expanded="true"
        >
      </label>
      <div :id="`${uid}-list`" ref="listbox" class="book-picker__list" role="listbox" :aria-labelledby="`${uid}-label`">
        <template v-for="group in groups" :key="group.language">
          <p v-if="group.language" class="book-picker__group" role="presentation">{{ group.language }}</p>
          <div
            v-for="option in group.items"
            :id="`${uid}-opt-${indexOf(option)}`"
            :key="option.code || 'empty'"
            role="option"
            class="book-picker__option"
            :aria-selected="option.code === modelValue"
            :data-active="indexOf(option) === activeIndex"
            @pointerenter="activeIndex = indexOf(option)"
            @click="choose(option)"
          >
            <span class="book-picker__option-copy">
              <strong>{{ option.name }}<span v-if="option.recommended" class="book-picker__star" title="Recomendado">★</span></strong>
              <small v-if="option.detail || (search && option.language)">{{ [search ? option.language : '', option.detail].filter(Boolean).join(' · ') }}</small>
            </span>
            <OrdoLocBadge v-if="option.code" :code="option.code" />
            <OrdoIcon v-if="option.code === modelValue" name="check" :size="16" :stroke-width="2.4" class="book-picker__check" />
          </div>
        </template>
        <p v-if="!filtered.length" class="book-picker__empty">Nenhum livro com “{{ search }}”.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-picker { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.book-picker__label { color: var(--op-ink-soft); font-size: 12px; font-weight: 700; }
.book-picker__trigger { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 50px; padding: 7px 12px 7px 14px; border: 1px solid rgba(13, 39, 68, .16); border-radius: 12px; background: var(--op-card); color: var(--op-ink); cursor: pointer; text-align: left; transition: border-color .15s, box-shadow .15s; }
.book-picker__trigger:hover:not(:disabled) { border-color: rgba(23, 84, 207, .45); }
.book-picker__trigger:focus-visible, .book-picker.is-open .book-picker__trigger { border-color: var(--op-action); outline: none; box-shadow: 0 0 0 3px rgba(23, 84, 207, .14); }
.book-picker__trigger:disabled { cursor: not-allowed; opacity: .6; }
.book-picker__value { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.book-picker__value strong { overflow: hidden; font-size: 14.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.book-picker__value small { overflow: hidden; color: var(--op-ink-faint); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.book-picker__chevron { flex: 0 0 auto; color: var(--op-ink-faint); transition: transform .15s; }
.book-picker.is-open .book-picker__chevron { transform: rotate(180deg); }
.book-picker.is-compact .book-picker__trigger { min-height: 40px; padding-block: 5px; }
.book-picker.is-compact .book-picker__value strong { font-size: 13.5px; }

.book-picker__pop { position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; display: flex; flex-direction: column; width: max(100%, 340px); max-width: min(440px, calc(100vw - 32px)); overflow: hidden; border: 1px solid var(--op-hair); border-radius: 14px; background: var(--op-card); box-shadow: 0 24px 48px -24px rgba(13, 39, 68, .45), 0 2px 6px rgba(13, 39, 68, .06); }
.book-picker__search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--op-hair); color: var(--op-ink-faint); }
.book-picker__search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--op-ink); font-size: 14px; outline: none; }
.book-picker__list { max-height: 340px; overflow-y: auto; padding: 6px; overscroll-behavior: contain; }
.book-picker__group { position: sticky; top: -6px; z-index: 1; margin: 0; padding: 10px 8px 6px; background: var(--op-card); color: var(--op-ink-faint); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.book-picker__option { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; cursor: pointer; }
.book-picker__option[data-active="true"] { background: var(--op-wash); }
.book-picker__option[aria-selected="true"] strong { color: var(--op-action-hover); }
.book-picker__option-copy { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.book-picker__option-copy strong { font-size: 14px; font-weight: 600; line-height: 1.3; }
.book-picker__option-copy small { color: var(--op-ink-faint); font-size: 12px; line-height: 1.35; }
.book-picker__star { margin-left: 6px; color: var(--op-gold); font-size: 11px; }
.book-picker__check { flex: 0 0 auto; color: var(--op-action); }
.book-picker__empty { margin: 0; padding: 16px 10px; color: var(--op-ink-faint); font-size: 13px; text-align: center; }

@media (max-width: 560px) {
  .book-picker__pop { width: 100%; max-width: none; }
}
</style>
