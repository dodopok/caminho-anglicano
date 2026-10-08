<template>
  <div class="min-w-0 text-sm">
    <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span class="rounded-ep bg-ep-line-2 px-1.5 py-0.5 font-medium text-ep-ink-3">{{ SOURCE_TYPE_LABEL[source.type] }}</span>
      <EpiscopadoTip :title="SOURCE_LEVEL_LABEL[source.level]" :text="SOURCE_LEVEL_DESCRIPTION[source.level]" placement="bottom">
        <span class="rounded-ep px-1.5 py-0.5 font-medium cursor-help" :class="LEVEL_CLASS[source.level]">{{ LEVEL_SHORT[source.level] }}</span>
      </EpiscopadoTip>
      <span v-if="source.published" class="text-ep-muted">{{ formatDate(source.published) }}</span>
    </div>

    <p class="mt-1.5 font-medium leading-snug text-ep-ink break-words">
      <NuxtLink :to="sourceRoute(source.id)" class="hover:text-ep-garnet-ink hover:underline decoration-ep-garnet-line underline-offset-2">{{ source.title }}</NuxtLink>
    </p>
    <p v-if="byline" class="mt-0.5 text-xs text-ep-muted break-words">{{ byline }}</p>

    <blockquote v-if="quote" class="mt-2 border-l-2 border-ep-garnet-mid pl-3 text-[13px] text-ep-ink-3 italic leading-relaxed break-words" :class="{ 'line-clamp-6': clamp }">
      “{{ quote }}”<span v-if="page" class="not-italic text-ep-muted"> (p. {{ page }})</span>
    </blockquote>

    <div class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
      <a v-if="source.url" :href="source.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-ep-garnet-ink hover:text-ep-garnet-deep hover:underline">
        Abrir fonte
        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
        <span class="sr-only">(abre em nova aba)</span>
      </a>
      <span v-else class="text-ep-muted">Sem link público</span>
      <a v-if="source.archive_url" :href="source.archive_url" target="_blank" rel="noopener" class="text-ep-body hover:text-ep-ink hover:underline">Arquivo<span class="sr-only"> (abre em nova aba)</span></a>
      <NuxtLink :to="sourceRoute(source.id)" class="text-ep-body hover:text-ep-ink hover:underline">Tudo que esta fonte sustenta →</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOURCE_LEVEL_DESCRIPTION, SOURCE_LEVEL_LABEL, SOURCE_TYPE_LABEL, formatDate } from '../../lib/labels'
import { LEVEL_CLASS, sourceRoute } from '../../lib/style'
import type { SourceSummary } from '../../lib/views'

/** Cartão de uma fonte: metadados, trecho citado e links para abrir, arquivar e ver a ficha. */
const props = withDefaults(defineProps<{ source: SourceSummary; quote?: string; page?: string; clamp?: boolean }>(), { quote: '', page: '', clamp: false })

const LEVEL_SHORT = { primary: 'primária', secondary: 'secundária', tertiary: 'terciária' } as const

const byline = computed(() => [props.source.author, props.source.publisher].filter(Boolean).join(' · '))
</script>
