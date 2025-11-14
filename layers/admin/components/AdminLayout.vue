<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Navigation Bar -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo and Title -->
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900">
              Admin - Caminho Anglicano
            </h1>
          </div>

          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              {{ user?.email }}
            </span>
            <button
              @click="handleSignOut"
              class="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Navigation Tabs -->
      <div class="mb-8">
        <nav class="flex space-x-4 border-b border-gray-200">
          <NuxtLink
            to="/admin"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="isActive('/admin', true) ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            to="/admin/submissions"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="isActive('/admin/submissions') ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'"
          >
            Submissões
          </NuxtLink>
          <NuxtLink
            to="/admin/bulk-submissions"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="isActive('/admin/bulk-submissions') ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'"
          >
            Submissões em Lote
          </NuxtLink>
          <NuxtLink
            to="/admin/churches"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="isActive('/admin/churches') ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'"
          >
            Igrejas
          </NuxtLink>
        </nav>
      </div>

      <!-- Page Content -->
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, signOut } = useAdminAuth()
const route = useRoute()

function isActive(path: string, exact = false): boolean {
  if (exact) {
    return route.path === path
  }
  return route.path.startsWith(path)
}

async function handleSignOut() {
  await signOut()
}
</script>
