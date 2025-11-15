<template>
  <div class="max-w-2xl mx-auto mb-8">
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar termos..."
        class="w-full px-4 py-3 pr-24 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
        aria-label="Buscar termos do glossário"
        @input="handleSearchInput"
      >
      <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <button
          v-if="searchQuery"
          class="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          aria-label="Limpar busca"
          @click="clearSearch"
        >
          Limpar
        </button>
        <svg
          class="w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'

const { searchQuery, handleSearchInput, clearSearch } = useGlossary()
</script>
