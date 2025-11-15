<template>
  <div class="flex flex-wrap justify-center gap-2 mb-8">
    <button
      v-for="letter in alphabet"
      :key="letter"
      @click="handleLetterClick(letter)"
      :class="[
        'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        selectedLetter === letter
          ? 'bg-slate-700 text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
      ]"
      :aria-pressed="selectedLetter === letter"
      :aria-label="`Filtrar por letra ${letter}`"
    >
      {{ letter }}
    </button>
    <button
      :class="[
        'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        selectedLetter
          ? 'bg-red-100 text-red-700 hover:bg-red-200 opacity-100 pointer-events-auto'
          : 'bg-transparent text-transparent opacity-0 pointer-events-none border border-transparent'
      ]"
      :aria-label="selectedLetter ? 'Limpar filtro alfabético' : undefined"
      :tabindex="selectedLetter ? 0 : -1"
      @click="clearLetterFilter"
    >
      Limpar
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGlossary } from '../../composables/useGlossary'

const { alphabet, selectedLetter, handleLetterClick, clearLetterFilter } = useGlossary()
</script>
