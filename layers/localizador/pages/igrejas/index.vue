<script setup lang="ts">
const { fetchJurisdictions } = useJurisdictions()
const jurisdictions = ref<any[]>([])
const loading = ref(true)

// Main states with churches (could be dynamic, but for SEO static is fine)
const mainStates = [
  { code: 'SP', name: 'São Paulo' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'PR', name: 'Paraná' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'BA', name: 'Bahia' },
  { code: 'PE', name: 'Pernambuco' }
]

onMounted(async () => {
  try {
    jurisdictions.value = await fetchJurisdictions()
  } finally {
    loading.value = false
  }
})

useSeoMeta({
  title: 'Igrejas Anglicanas no Brasil - Por Estado e Jurisdição | Caminho Anglicano',
  description: 'Encontre igrejas anglicanas em todo o Brasil. Explore por estado ou por jurisdição (IACB, IEAB, etc). Encontre o caminho para a sua comunidade.',
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Igrejas Anglicanas no Brasil
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Encontre uma comunidade anglicana perto de você explorando por localidade ou jurisdição.
        </p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <!-- Search redirection -->
      <div class="mb-16 bg-blue-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 class="text-2xl font-bold mb-2">Prefere o mapa interativo?</h2>
            <p class="text-blue-100">Use nosso localizador com mapa para encontrar igrejas por proximidade e endereço.</p>
          </div>
          <NuxtLink to="/localizador" class="px-8 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg">
            Abrir Mapa Interativo
          </NuxtLink>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-12">
        <!-- States Section -->
        <section class="lg:col-span-2">
          <h2 class="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <svg class="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Igrejas por Estado
          </h2>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NuxtLink 
              v-for="state in mainStates" 
              :key="state.code"
              :to="`/igrejas/localidade/${state.code.toLowerCase()}`"
              class="p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition group text-center"
            >
              <div class="text-2xl font-black text-gray-300 group-hover:text-blue-100 transition-colors mb-2">{{ state.code }}</div>
              <div class="font-bold text-gray-900">{{ state.name }}</div>
            </NuxtLink>
          </div>
          
          <div class="mt-8 text-center">
             <p class="text-gray-500 text-sm">Mostrando estados com maior presença anglicana. Use o localizador para outros estados.</p>
          </div>
        </section>

        <!-- Jurisdictions Section -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <svg class="w-6 h-6 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Por Jurisdição
          </h2>

          <div v-if="loading" class="space-y-4">
            <div v-for="i in 4" :key="i" class="h-20 bg-gray-100 animate-pulse rounded-xl"></div>
          </div>
          <div v-else class="space-y-4">
            <NuxtLink 
              v-for="j in jurisdictions" 
              :key="j.id"
              :to="`/igrejas/${j.slug}`"
              class="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition group"
            >
              <div class="w-2 h-10 rounded mr-4" :style="{ backgroundColor: j.color }"></div>
              <div>
                <div class="font-bold text-gray-900">{{ j.name }}</div>
                <div class="text-xs text-gray-500 uppercase tracking-widest">{{ j.fullName }}</div>
              </div>
              <svg class="w-5 h-5 ml-auto text-gray-300 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
    <BaseFooter />
  </div>
</template>
