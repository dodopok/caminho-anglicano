<template>
  <section v-if="footnotes.length" aria-labelledby="fontes" class="mt-12 border-t border-stone-200 pt-6">
    <h2 id="fontes" class="text-xl font-semibold text-stone-800 mb-4">Fontes</h2>
    <ol class="space-y-3 text-sm text-stone-700">
      <li v-for="f in footnotes" :id="`nota-${f.n}`" :key="f.n" class="flex gap-3 scroll-mt-24">
        <span class="text-amber-700 font-medium shrink-0 w-8 text-right">[{{ f.n }}]</span>
        <div class="min-w-0">
          <p>
            <a v-if="f.source.url" :href="f.source.url" target="_blank" rel="noopener" class="text-stone-900 font-medium hover:text-amber-800 underline decoration-stone-300 break-words">{{ f.source.title }}</a>
            <span v-else class="text-stone-900 font-medium">{{ f.source.title }}</span>
            <span class="text-stone-500">
              {{ [f.source.author, f.source.publisher, formatDate(f.source.published)].filter(Boolean).join(' · ') }}
              · {{ SOURCE_TYPE_LABEL[f.source.type] }}
            </span>
            <a v-if="f.source.archive_url" :href="f.source.archive_url" target="_blank" rel="noopener" class="ml-1 text-stone-500 hover:text-stone-800 underline">(arquivo)</a>
          </p>
          <blockquote v-if="f.quote" class="mt-1 border-l-2 border-amber-200 pl-3 italic text-stone-600 break-words">“{{ f.quote }}”</blockquote>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { SOURCE_TYPE_LABEL, formatDate } from '../../lib/labels'
import type { Footnote } from '../../lib/views'

defineProps<{ footnotes: Footnote[] }>()
</script>
