<template>
  <div class="text-center py-12">
    <svg
      class="w-16 h-16 text-slate-300 mx-auto mb-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <p class="text-slate-600 text-lg mb-2">
      Nenhum termo encontrado
    </p>
    <p class="text-slate-500 text-sm mb-4">
      Tente ajustar sua busca ou filtro
    </p>
    <button
      v-if="searchQuery"
      @click="openSuggestionModal(searchQuery)"
      class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Sugerir este termo
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'
import { useTermSuggestion } from '../../composables/useTermSuggestion'

const { searchQuery } = useGlossary()
const { openSuggestionModal } = useTermSuggestion()
</script>
