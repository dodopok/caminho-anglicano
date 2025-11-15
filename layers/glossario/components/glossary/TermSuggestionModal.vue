<template>
  <BaseModal
    max-width="sm"
    :is-open="showSuggestionModal"
    title="Sugerir Novo Termo"
    @close="closeSuggestionModal"
  >
    <form @submit.prevent="submitSuggestion" class="space-y-4">
      <div>
        <label for="term" class="block text-sm font-medium text-slate-700 mb-2">
          Termo *
        </label>
        <input
          id="term"
          v-model="suggestion.term"
          type="text"
          required
          class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="Ex: Primaz"
        />
      </div>

      <div>
        <label for="definition" class="block text-sm font-medium text-slate-700 mb-2">
          Definição sugerida (opcional)
        </label>
        <textarea
          id="definition"
          v-model="suggestion.definition"
          rows="4"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="Se souber, pode sugerir uma definição..."
        />
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-slate-700 mb-2">
          Seu e-mail (opcional)
        </label>
        <input
          id="email"
          v-model="suggestion.email"
          type="email"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder="seu@email.com"
        />
      </div>

      <div class="flex gap-3 justify-end pt-4">
        <button
          type="button"
          @click="closeSuggestionModal"
          class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="isSubmitting || !suggestion.term"
          class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Enviando...' : 'Enviar Sugestão' }}
        </button>
      </div>

      <p v-if="submissionError" class="text-red-600 text-sm">
        {{ submissionError }}
      </p>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { useTermSuggestion } from '../../composables/useTermSuggestion'

const {
  showSuggestionModal,
  isSubmitting,
  submissionError,
  suggestion,
  closeSuggestionModal,
  submitSuggestion
} = useTermSuggestion()
</script>
