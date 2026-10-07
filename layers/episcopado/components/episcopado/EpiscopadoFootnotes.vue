<template>
  <section v-if="footnotes.length" :id="id" aria-labelledby="fontes-titulo" class="mt-12 border-t border-stone-200 pt-8">
    <div class="flex flex-wrap items-baseline justify-between gap-2 mb-4">
      <h2 id="fontes-titulo" class="ep-section-title">Fontes</h2>
      <p class="text-xs text-stone-500">{{ footnotes.length }} {{ footnotes.length === 1 ? 'nota' : 'notas' }} · {{ distinct }} {{ distinct === 1 ? 'fonte distinta' : 'fontes distintas' }}</p>
    </div>
    <ol class="divide-y divide-stone-100">
      <li
        v-for="f in footnotes"
        :id="`nota-${f.n}`"
        :key="f.n"
        class="ep-footnote flex gap-3 py-3 scroll-mt-24 rounded-md transition-colors"
      >
        <a :href="`#nota-${f.n}`" class="w-9 shrink-0 text-right text-sm font-semibold tabular-nums text-amber-700 hover:underline" :aria-label="`Nota ${f.n}`">[{{ f.n }}]</a>
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
