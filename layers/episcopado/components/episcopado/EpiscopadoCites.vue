<template>
  <sup v-if="cites.length" class="ml-0.5 inline-flex flex-wrap gap-0.5 align-super text-[0.7em] font-medium leading-none">
    <template v-for="n in shown" :key="n">
      <button
        type="button"
        class="rounded px-0.5 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
        :class="{ 'bg-amber-100 text-amber-900': openKey === key(n) }"
        :aria-label="`Fonte ${n}`"
        :aria-expanded="openKey === key(n)"
        :aria-controls="openKey === key(n) ? popoverId : undefined"
        @click="toggle(n, $event)"
        @mouseenter="hoverOpen(n, $event)"
        @mouseleave="hoverClose"
        @focus="hoverOpen(n, $event)"
        @blur="hoverClose"
        @keydown.esc="close"
      >[{{ n }}]</button>
    </template>
    <button
      v-if="cites.length > MAX_SHOWN && !expanded"
      type="button"
      class="rounded px-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      :aria-label="`Mostrar mais ${cites.length - MAX_SHOWN + 1} fontes`"
      @click="expanded = true"
    >+{{ cites.length - MAX_SHOWN + 1 }}</button>

    <Teleport to="body">
      <Transition name="ep-pop">
        <div
          v-if="openNote"
          :id="popoverId"
          ref="popover"
          role="dialog"
          :aria-label="`Fonte ${openNote.n}`"
          class="ep-cite-pop fixed z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 text-left shadow-xl ring-1 ring-black/5 sm:max-h-[70vh] sm:overflow-auto"
          :class="sheet ? 'inset-x-0 bottom-0 w-auto max-w-none rounded-b-none max-h-[75vh] overflow-auto pb-[max(1rem,env(safe-area-inset-bottom))]' : ''"
          :style="sheet ? undefined : position"
          @mouseenter="cancelClose"
          @mouseleave="hoverClose"
          @keydown.esc="close"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-amber-800">Nota [{{ openNote.n }}]</span>
            <button type="button" class="-m-1 rounded p-1 text-stone-400 hover:text-stone-700" aria-label="Fechar" @click="close">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>
          </div>
          <EpiscopadoSourceCard class="mt-2" :source="openNote.source" :quote="openNote.quote" :page="openNote.page" />
          <a :href="`#nota-${openNote.n}`" class="mt-3 inline-block text-xs text-stone-500 hover:text-stone-800 hover:underline" @click="close">Ver na lista de fontes ↓</a>
        </div>
      </Transition>
      <div v-if="openNote && sheet" class="fixed inset-0 z-40 bg-stone-900/30" aria-hidden="true" @click="close" />
    </Teleport>
  </sup>
</template>

<script setup lang="ts">
/**
 * Chamadas de nota [n]. Passar o mouse ou focar abre um cartão com a fonte e o
 * trecho citado; clicar fixa o cartão. No celular o cartão vira uma folha inferior.
 */
const props = defineProps<{ cites: number[] }>()

/** Acima disso, mostra só as primeiras e um "+N" para expandir. */
const MAX_SHOWN = 4
const expanded = ref(false)
const shown = computed(() => (expanded.value || props.cites.length <= MAX_SHOWN ? props.cites : props.cites.slice(0, MAX_SHOWN - 1)))

const footnotes = useEpiscopadoFootnotes()
const openGlobal = useEpiscopadoOpenCite()
const uid = useId()
const popoverId = `fonte-pop-${uid}`
const popover = ref<HTMLElement | null>(null)

const openN = ref<number | null>(null)
const pinned = ref(false)
const position = ref<Record<string, string>>({})
const sheet = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null
let openTimer: ReturnType<typeof setTimeout> | null = null

const key = (n: number) => `${uid}:${n}`
const openKey = computed(() => (openN.value === null ? null : key(openN.value)))
const openNote = computed(() => (openN.value === null ? null : footnotes.value.find((f) => f.n === openN.value) ?? null))

function place(anchor: HTMLElement) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  sheet.value = vw < 640
  if (sheet.value) return
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(352, vw - 32)
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 16), vw - width - 16)
  const below = vh - rect.bottom
  const style: Record<string, string> = { left: `${left}px`, width: `${width}px` }
  if (below >= 300 || below >= rect.top) style.top = `${rect.bottom + 8}px`
  else style.bottom = `${vh - rect.top + 8}px`
  position.value = style
}

function open(n: number, anchor: HTMLElement) {
  cancelClose()
  place(anchor)
  openN.value = n
  openGlobal.value = key(n)
}

function close() {
  cancelClose()
  if (openTimer) clearTimeout(openTimer)
  openN.value = null
  pinned.value = false
  if (openGlobal.value?.startsWith(`${uid}:`)) openGlobal.value = null
}

function cancelClose() {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = null
}

function hoverOpen(n: number, e: Event) {
  if (pinned.value) return
  if (openTimer) clearTimeout(openTimer)
  const anchor = e.currentTarget as HTMLElement
  openTimer = setTimeout(() => open(n, anchor), 120)
}

function hoverClose() {
  if (openTimer) clearTimeout(openTimer)
  if (pinned.value) return
  cancelClose()
  closeTimer = setTimeout(close, 220)
}

function toggle(n: number, e: MouseEvent) {
  if (openN.value === n && pinned.value) return close()
  pinned.value = true
  open(n, e.currentTarget as HTMLElement)
  nextTick(() => popover.value?.focus?.())
}

// Só um cartão aberto por vez na página: se outro abrir, este fecha.
watch(openGlobal, (v) => {
  if (openN.value !== null && v !== openKey.value) {
    openN.value = null
    pinned.value = false
  }
})

function onDocClick(e: MouseEvent) {
  if (!pinned.value) return
  const target = e.target as Node
  if (popover.value?.contains(target)) return
  if ((e.target as HTMLElement).closest?.(`[aria-controls="${popoverId}"]`)) return
  close()
}
function onScroll() {
  if (openN.value !== null && !sheet.value) close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  window.removeEventListener('scroll', onScroll, { capture: true })
  close()
})
</script>

<style>
.ep-pop-enter-active,
.ep-pop-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.ep-pop-enter-from,
.ep-pop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
