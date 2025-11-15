<template>
  <div class="text-center mb-6">
    <p class="text-slate-600 mb-2">
      {{ filteredTerms.length }} {{ filteredTerms.length === 1 ? 'termo encontrado' : 'termos encontrados' }}
    </p>
    <p v-if="totalPages > 1" class="text-sm text-slate-500">
      Página {{ currentPage }} de {{ totalPages }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'

const { filteredTerms, currentPage, totalPages } = useGlossary()
</script>
