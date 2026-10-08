<template>
  <section v-if="footnotes.length" :id="id" aria-labelledby="fontes-titulo" class="mt-12 border-t border-ep-line pt-8">
    <div class="flex flex-wrap items-baseline justify-between gap-2 mb-4">
      <h2 id="fontes-titulo" class="ep-section-title">Fontes</h2>
      <p class="text-xs text-ep-muted">{{ footnotes.length }} {{ footnotes.length === 1 ? 'nota' : 'notas' }} · {{ distinct }} {{ distinct === 1 ? 'fonte distinta' : 'fontes distintas' }}</p>
    </div>
    <ol class="flex flex-col gap-2.5">
      <li
        v-for="f in footnotes"
        :id="`nota-${f.n}`"
        :key="f.n"
        class="ep-footnote flex gap-3 scroll-mt-28 rounded-ep border border-ep-line-2 bg-ep-card p-3 transition-colors"
      >
        <a :href="`#nota-${f.n}`" class="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-ep-garnet hover:underline" :aria-label="`Nota ${f.n}`">[{{ f.n }}]</a>
        <EpiscopadoSourceCard class="flex-1" :source="f.source" :quote="f.quote" :page="f.page" />
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type { Footnote } from '../../lib/views'

const props = withDefaults(defineProps<{ footnotes: Footnote[]; id?: string }>(), { id: 'fontes' })

const distinct = computed(() => new Set(props.footnotes.map((f) => f.source.id)).size)
</script>
