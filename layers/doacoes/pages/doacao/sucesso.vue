<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <!-- Ícone de sucesso -->
        <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <svg class="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Título -->
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Obrigado pelo seu apoio!
        </h1>

        <!-- Mensagem -->
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
          <p class="text-lg">
            Sua contribuição é muito importante para mantermos o Caminho Anglicano funcionando e crescendo.
          </p>
          <p>
            Você receberá um e-mail de confirmação em breve com os detalhes da sua doação.
          </p>
          <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mt-6">
            <p class="text-sm text-purple-900 dark:text-purple-200">
              <strong>Importante:</strong> Se você escolheu PIX, por favor complete o pagamento usando o QR Code ou código PIX que apareceu na tela anterior. O pagamento pode levar alguns minutos para ser processado.
            </p>
          </div>
        </div>

        <!-- Citação bíblica -->
        <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <blockquote class="italic text-gray-700 dark:text-gray-300">
            <p class="text-lg">"Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria."</p>
            <footer class="mt-2 text-sm text-gray-500 dark:text-gray-400">— 2 Coríntios 9:7</footer>
          </blockquote>
        </div>

        <!-- Botões de ação -->
        <div class="mt-8 space-y-3 sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center">
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
          >
            Voltar para a página inicial
          </NuxtLink>
          <NuxtLink
            to="/localizador"
            class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Explorar igrejas
          </NuxtLink>
        </div>

        <!-- Redes sociais / Newsletter -->
        <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Mantenha-se conectado com as novidades do projeto
          </p>
          <!-- Aqui você pode adicionar links para redes sociais ou newsletter no futuro -->
        </div>
      </div>

      <!-- Card de impacto -->
      <div class="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
        <h2 class="text-xl font-bold mb-3">Seu impacto</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-3xl font-bold">200+</div>
            <div class="text-sm opacity-90">Igrejas cadastradas</div>
          </div>
          <div>
            <div class="text-3xl font-bold">5</div>
            <div class="text-sm opacity-90">Livros digitais</div>
          </div>
          <div>
            <div class="text-3xl font-bold">100%</div>
            <div class="text-sm opacity-90">Gratuito e aberto</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Obrigado pela sua doação - Caminho Anglicano',
  meta: [
    { name: 'description', content: 'Obrigado por apoiar o Caminho Anglicano!' },
    { name: 'robots', content: 'noindex' }
  ]
})
</script>
