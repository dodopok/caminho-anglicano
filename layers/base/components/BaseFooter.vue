<template>
  <footer class="bg-white border-t border-slate-200 mt-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="text-center text-sm text-slate-600">
        © {{ new Date().getFullYear() }} Caminho Anglicano - Feito por
        <a
          href="https://www.instagram.com/rev_douglasaraujo/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-slate-700 hover:text-slate-900 font-medium transition-colors"
        >
          Rev. Douglas Araujo
        </a>
        -
        <button
          class="text-purple-600 hover:text-purple-700 font-medium transition-colors underline decoration-dotted underline-offset-2"
          @click="openSupportModal"
        >
          Apoie o projeto
        </button>
      </div>
    </div>
    
    <DonationModal :is-open="showModal" @close="showModal = false" />
  </footer>
</template>

<script setup lang="ts">
const showModal = ref(false)

const openSupportModal = () => {
  showModal.value = true
}
</script>
