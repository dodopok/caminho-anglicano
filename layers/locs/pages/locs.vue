<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <nav class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-slate-800">
            Livro de Oração Comum
          </h1>
          <NuxtLink
            to="/"
            class="text-slate-600 hover:text-slate-900 transition-colors text-sm"
          >
            ← Voltar
          </NuxtLink>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-12">
        <p class="text-lg text-slate-600 max-w-2xl mx-auto">
          Acesse diferentes versões do Livro de Oração Comum em português
        </p>
      </div>

      <!-- LOCs Grid -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <!-- LOC Card 1 -->
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-slate-300"
        >
          <div class="flex flex-col">
            <!-- Capa do livro -->
            <div class="w-full aspect-[3/4] bg-slate-200 flex items-center justify-center overflow-hidden">
              <svg class="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <!-- Conteúdo -->
            <div class="p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-3 line-clamp-2">
                Livro de Oração Comum - 1662
              </h3>
              <p class="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                Tradução da versão clássica de 1662 da Igreja da Inglaterra, base histórica para o anglicanismo mundial
              </p>
            </div>
          </div>
        </a>

        <!-- LOC Card 2 -->
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-slate-300"
        >
          <div class="flex flex-col">
            <!-- Capa do livro -->
            <div class="w-full aspect-[3/4] bg-slate-200 flex items-center justify-center overflow-hidden">
              <svg class="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <!-- Conteúdo -->
            <div class="p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-3 line-clamp-2">
                Livro de Oração Comum - 1979
              </h3>
              <p class="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                Versão revisada da Igreja Episcopal dos Estados Unidos, com linguagem moderna e orações contemporâneas
              </p>
            </div>
          </div>
        </a>

        <!-- LOC Card 3 -->
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-slate-300"
        >
          <div class="flex flex-col">
            <!-- Capa do livro -->
            <div class="w-full aspect-[3/4] bg-slate-200 flex items-center justify-center overflow-hidden">
              <svg class="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <!-- Conteúdo -->
            <div class="p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-3 line-clamp-2">
                Livro de Oração Comum - IAB
              </h3>
              <p class="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                Adaptação brasileira da Igreja Anglicana do Brasil, com orações contextualizadas para a realidade nacional
              </p>
            </div>
          </div>
        </a>

        <!-- LOC Card 4 -->
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-slate-300"
        >
          <div class="flex flex-col">
            <!-- Capa do livro -->
            <div class="w-full aspect-[3/4] bg-slate-200 flex items-center justify-center overflow-hidden">
              <svg class="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <!-- Conteúdo -->
            <div class="p-6">
              <h3 class="text-lg font-semibold text-slate-900 mb-3 line-clamp-2">
                Livro de Oração Comum - Portugal
              </h3>
              <p class="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                Tradução portuguesa da Igreja Lusitana, mantendo as tradições litúrgicas em língua portuguesa
              </p>
            </div>
          </div>
        </a>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// You can add logic here to fetch LOCs from a database or manage them as needed
</script>
