<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="term in paginatedTerms"
      :key="term.id"
      class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-slate-200 flex flex-col min-h-[240px]"
    >
      <NuxtLink
        :to="`/glossario/${term.id}`"
        class="block group flex-shrink-0"
      >
        <h3 class="text-lg font-semibold text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
          {{ term.term }}
          <svg class="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </h3>
      </NuxtLink>
      <p class="text-sm text-slate-700 leading-relaxed mb-3 flex-grow">
        {{ term.definition }}
      </p>
      <div v-if="term.relatedTerms && term.relatedTerms.length > 0" class="flex flex-wrap gap-1.5 mt-auto">
        <span class="text-xs text-slate-500 font-medium w-full mb-1">Relacionados:</span>
        <button
          v-for="relatedTerm in term.relatedTerms"
          :key="relatedTerm"
          class="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
          :aria-label="`Buscar termo relacionado: ${relatedTerm}`"
          @click="handleRelatedTermClick(relatedTerm)"
        >
          {{ relatedTerm }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'

const { paginatedTerms, handleRelatedTermClick } = useGlossary()
</script>
