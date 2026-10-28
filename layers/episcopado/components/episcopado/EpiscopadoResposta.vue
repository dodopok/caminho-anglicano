<template>
  <div class="ep-resposta text-[15px] leading-relaxed text-ep-body">
    <template v-for="(b, i) in parsed" :key="i">
      <p v-if="b.type === 'p'" class="my-3"><EpiscopadoInline :nodes="b.c" /></p>
      <component :is="`h${b.level}`" v-else-if="b.type === 'h'" class="mb-1 mt-5 font-ep-serif text-lg font-semibold text-ep-ink"><EpiscopadoInline :nodes="b.c" /></component>
      <ul v-else-if="b.type === 'ul'" class="my-3 list-disc space-y-1 pl-5 marker:text-ep-faint">
        <li v-for="(item, j) in b.items" :key="j"><EpiscopadoInline :nodes="item" /></li>
      </ul>
      <ol v-else-if="b.type === 'ol'" class="my-3 list-decimal space-y-1 pl-5 marker:text-ep-faint">
        <li v-for="(item, j) in b.items" :key="j"><EpiscopadoInline :nodes="item" /></li>
      </ol>
      <EpiscopadoBloco v-else-if="b.type === 'bloco' && blocos[b.n - 1]" :bloco="blocos[b.n - 1]" :n="b.n" />
    </template>
    <span v-if="streaming" class="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ep-garnet align-middle" aria-hidden="true" />

    <EpiscopadoBloco v-for="n in trailing" :key="`b${n}`" :bloco="blocos[n - 1]" :n="n" />

    <details v-if="notas.length" class="mt-4 rounded-ep border border-ep-line-2 bg-ep-paper-2 px-3 py-2" :open="openNotes">
      <summary class="cursor-pointer select-none text-sm font-medium text-ep-ink-3">Fontes desta resposta ({{ notas.length }})</summary>
      <ol class="mt-2 flex flex-col gap-2 pb-1">
        <li v-for="f in notas" :key="f.n" class="flex gap-3 rounded-ep border border-ep-line-2 bg-ep-card p-3">
          <span class="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-ep-garnet">[{{ f.n }}]</span>
          <EpiscopadoSourceCard class="flex-1" :source="f.source" :quote="f.quote" :page="f.page" />
        </li>
      </ol>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { Bloco } from '../../lib/pergunta/blocos'
import { parseMarkdown, stripRawCites } from '../../lib/pergunta/markdown'
import type { Footnote } from '../../lib/views'

/**
 * Uma resposta do Pergunte à Rede: texto (em streaming ou final, com notas [n]) e os blocos que o
 * servidor montou. Blocos marcados com [[bloco N]] aparecem no meio do texto; os demais, no fim.
 */
const props = withDefaults(defineProps<{ markdown: string; notas?: Footnote[]; blocos?: Bloco[]; streaming?: boolean; openNotes?: boolean }>(), {
  notas: () => [],
  blocos: () => [],
  streaming: false,
  openNotes: false
})

const notasRef = computed(() => props.notas)
provideEpiscopadoFootnotes(notasRef)

const parsed = computed(() => parseMarkdown(props.streaming ? stripRawCites(props.markdown) : props.markdown))
const trailing = computed(() => {
  const inline = new Set(parsed.value.flatMap((b) => (b.type === 'bloco' ? [b.n] : [])))
  return props.blocos.map((_, i) => i + 1).filter((n) => !inline.has(n))
})
</script>
