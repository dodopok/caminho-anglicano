<template>
  <div class="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 border-b-4 border-amber-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 text-white">
          <div class="hidden sm:flex w-12 h-12 bg-white/20 rounded-lg items-center justify-center flex-shrink-0">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold">📖 Livro: Caminho Anglicano</h2>
            <p class="text-sm text-amber-100">Por Thomas McKenzie • Tradução: Rev. Douglas Araujo</p>
          </div>
        </div>
        <div class="flex gap-3 flex-wrap justify-center">
          <a
            href="https://amzn.to/4r2lYmM"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-800 rounded-lg hover:bg-amber-50 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            Digital
          </a>
          <a
            href="https://loja.uiclap.com/titulo/ua123620"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-950 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            Físico
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
