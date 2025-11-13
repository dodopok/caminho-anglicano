<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Painel Administrativo
        </h1>
        <p class="text-gray-600">
          Caminho Anglicano
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-lg shadow-xl p-8">
        <form @submit.prevent="handleSubmit">
          <!-- Email -->
          <div class="mb-6">
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              :disabled="loading"
              placeholder="seu-email@exemplo.com"
            >
          </div>

          <!-- Password -->
          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              :disabled="loading"
              placeholder="••••••••"
            >
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="loading"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Entrando...
            </span>
            <span v-else>
              Entrar
            </span>
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-center text-sm text-gray-600">
            <NuxtLink to="/" class="text-blue-600 hover:text-blue-700 transition-colors">
              ← Voltar para o site
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { signIn, loading: authLoading } = useAdminAuth()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true

  const result = await signIn(email.value, password.value)

  if (result.success) {
    // Redirect is handled by middleware
    await navigateTo('/admin')
  }
  else {
    errorMessage.value = result.error || 'Falha ao fazer login. Verifique suas credenciais.'
  }

  loading.value = false
}
</script>
