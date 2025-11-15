<template>
  <footer class="bg-white border-t border-slate-200 mt-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center space-y-4">
        <!-- Botão de Apoio -->
        <div class="flex justify-center">
          <SupportButton variant="default" size="md" />
        </div>

        <p class="text-slate-600">
          © {{ new Date().getFullYear() }} Caminho Anglicano. Todos os direitos reservados.
        </p>
        <p class="text-slate-500 text-sm">
          Desenvolvido por
          <a
            href="https://www.instagram.com/rev_douglasaraujo/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-slate-700 hover:text-slate-900 font-medium transition-colors"
          >
            Rev. Douglas Araujo
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
</script>
