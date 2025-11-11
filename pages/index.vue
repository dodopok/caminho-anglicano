<script setup lang="ts">
useHead({
  title: 'Caminho Anglicano',
  meta: [
    { name: 'description', content: 'Portal de recursos e serviços para a comunidade anglicana brasileira' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <nav class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-slate-800">
            Caminho Anglicano
          </h1>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-slate-900 mb-4">
          Bem-vindo ao Caminho Anglicano
        </h2>
        <p class="text-xl text-slate-600 max-w-2xl mx-auto">
          Recursos e serviços para conectar a comunidade anglicana brasileira
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <NuxtLink
          to="/localizador"
          class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-8 border border-slate-200 hover:border-slate-300"
          aria-label="Acessar o Localizador de Igrejas"
        >
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
              <svg
                class="w-8 h-8 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-900 mb-2">
              Localizador de Igrejas
            </h3>
            <p class="text-slate-600">
              Encontre igrejas anglicanas perto de você em todo o Brasil
            </p>
          </div>
        </NuxtLink>

        <div class="bg-white rounded-lg shadow-md p-8 border border-slate-200 opacity-50">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg
                class="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-400 mb-2">
              Em breve
            </h3>
            <p class="text-slate-400">
              Novos recursos serão adicionados em breve
            </p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-md p-8 border border-slate-200 opacity-50">
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg
                class="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-400 mb-2">
              Em breve
            </h3>
            <p class="text-slate-400">
              Novos recursos serão adicionados em breve
            </p>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-white border-t border-slate-200 mt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p class="text-center text-slate-600">
          © {{ new Date().getFullYear() }} Caminho Anglicano. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  </div>
</template>
