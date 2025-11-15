<template>
  <div v-if="totalPages > 1" class="my-6 flex justify-end items-center gap-2">
    <button
      :disabled="currentPage === 1"
      class="px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :class="currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
      @click="previousPage"
    >
      ← Anterior
    </button>

    <div class="flex gap-1">
      <button
        v-for="page in totalPages"
        v-show="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
        :key="page"
        :class="[
          'px-4 py-2 rounded-lg transition-colors',
          page === currentPage
            ? 'bg-amber-700 text-white'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
        ]"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>
    </div>

    <button
      :disabled="currentPage === totalPages"
      class="px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :class="currentPage === totalPages ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'"
      @click="nextPage"
    >
      Próxima →
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'

const { currentPage, totalPages, goToPage, nextPage, previousPage } = useGlossary()
</script>
