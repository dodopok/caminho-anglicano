<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Header -->
    <nav class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">
              Dashboard
            </h1>
          </div>
          <NuxtLink
            to="/"
            class="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
          >
            ← Voltar
          </NuxtLink>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-20">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600" />
        <p class="mt-6 text-slate-600 font-medium">Carregando estatísticas...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-md mx-auto mt-20">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-red-700 font-medium">Erro ao carregar dados</p>
          <p class="text-red-600 text-sm mt-2">{{ error.message }}</p>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="space-y-6 sm:space-y-8">
        <!-- Filtro por Jurisdição -->
        <div class="bg-gradient-to-r from-white to-blue-50 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100">
          <div class="flex items-center mb-3">
            <svg class="w-4 h-4 text-slate-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="text-sm font-semibold text-slate-700">Filtrar por Jurisdição</span>
          </div>
          <JurisdictionSelect
            v-model="selectedJurisdiction"
            :jurisdictions="jurisdictions"
            label=""
            button-class="border-2 border-slate-200 hover:border-slate-300 py-3"
          />
        </div>

        <!-- Cards de Estatísticas Principais -->
        <div
          class="grid gap-4 sm:gap-6"
          :class="selectedJurisdiction ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'"
        >
          <!-- Total de Igrejas -->
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-blue-100 text-sm font-medium mb-1">Total de Igrejas</p>
                <p class="text-4xl font-bold">{{ stats.totalChurches }}</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Número de Jurisdições (oculto quando filtrado) -->
          <div
            v-if="!selectedJurisdiction"
            class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-green-100 text-sm font-medium mb-1">Jurisdições</p>
                <p class="text-4xl font-bold">{{ Object.keys(stats.churchesByJurisdiction).length }}</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Estados Cobertos -->
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-purple-100 text-sm font-medium mb-1">Estados</p>
                <p class="text-4xl font-bold">{{ Object.keys(stats.churchesByState).length }}</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Média por Estado -->
          <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-orange-100 text-sm font-medium mb-1">Média/Estado</p>
                <p class="text-4xl font-bold">{{ (stats.totalChurches / Object.keys(stats.churchesByState).length).toFixed(1) }}</p>
              </div>
              <div class="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <!-- Gráfico de Pizza - Jurisdições (oculto quando filtrado) -->
          <div
            v-if="!selectedJurisdiction"
            class="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
          >
            <div class="flex items-center mb-6">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-slate-900">Distribuição por Jurisdição</h2>
            </div>
            <div class="aspect-square max-w-md mx-auto">
              <PieChart
                v-if="pieChartData.labels.length > 0"
                :labels="pieChartData.labels"
                :data="pieChartData.data"
                :colors="pieChartData.colors"
              />
              <div v-else class="flex items-center justify-center h-full text-slate-400">
                Nenhum dado disponível
              </div>
            </div>
          </div>

          <!-- Top 5 Estados -->
          <div
            class="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
            :class="{ 'lg:col-span-2': selectedJurisdiction }"
          >
            <div class="flex items-center mb-6">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 class="text-xl font-bold text-slate-900">Top 5 Estados</h2>
            </div>
            <div class="aspect-square max-w-md mx-auto">
              <BarChart
                v-if="barChartData.labels.length > 0"
                :labels="barChartData.labels"
                :data="barChartData.data"
                label="Igrejas"
                color="#10b981"
              />
              <div v-else class="flex items-center justify-center h-full text-slate-400">
                Nenhum dado disponível
              </div>
            </div>
          </div>
        </div>

        <!-- Top 3 Estados - Cards com Medalhas -->
        <div class="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl shadow-lg p-6 sm:p-8 border border-slate-200">
          <h2 class="text-2xl font-bold text-slate-900 mb-6 text-center">
            🏆 Top 3 Estados
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div
              v-for="(item, index) in stats.topStates"
              :key="item.state"
              class="relative"
            >
              <div
                class="bg-white rounded-xl shadow-md p-6 text-center transform hover:scale-105 transition-transform border-2"
                :class="{
                  'border-yellow-400': index === 0,
                  'border-slate-300': index === 1,
                  'border-orange-400': index === 2
                }"
              >
                <div
                  class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg"
                  :class="{
                    'bg-gradient-to-br from-yellow-400 to-yellow-500': index === 0,
                    'bg-gradient-to-br from-slate-300 to-slate-400': index === 1,
                    'bg-gradient-to-br from-orange-400 to-orange-500': index === 2
                  }"
                >
                  <span class="text-2xl font-bold text-white">
                    {{ index + 1 }}º
                  </span>
                </div>
                <h3 class="text-2xl font-bold text-slate-900 mb-2">{{ item.state }}</h3>
                <p class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  {{ item.count }}
                </p>
                <p class="text-sm text-slate-600">{{ item.count === 1 ? 'igreja' : 'igrejas' }}</p>
                <div class="mt-3 pt-3 border-t border-slate-200">
                  <p class="text-xs text-slate-500">
                    {{ ((item.count / stats.totalChurches) * 100).toFixed(1) }}% do total
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabela de Estados -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          <div class="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
            <h2 class="text-xl font-bold text-slate-900">Todas as Igrejas por Estado</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Posição
                  </th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th colspan="2" scope="col" class="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Porcentagem
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                <tr
                  v-for="([state, count], index) in Object.entries(stats.churchesByState).sort(([, a], [, b]) => b - a)"
                  :key="state"
                  class="hover:bg-blue-50 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500">
                    #{{ index + 1 }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm font-semibold text-slate-900">{{ state }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                    {{ count }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                    {{ ((count / stats.totalChurches) * 100).toFixed(1) }}%
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-full bg-slate-200 rounded-full h-2 mr-2">
                        <div
                          class="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          :style="{ width: `${(count / stats.totalChurches) * 100}%` }"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
const siteUrl = 'https://caminhoanglicano.com.br'

useSeoMeta({
  title: 'Dashboard - Estatísticas de Igrejas Anglicanas - Caminho Anglicano',
  description: 'Visualize estatísticas e dados sobre igrejas anglicanas no Brasil. Veja distribuição por jurisdição, estados e muito mais.',
  ogTitle: 'Dashboard - Estatísticas de Igrejas Anglicanas - Caminho Anglicano',
  ogDescription: 'Visualize estatísticas e dados sobre igrejas anglicanas no Brasil. Veja distribuição por jurisdição, estados e muito mais.',
  ogImage: `${siteUrl}/og-image-dashboard.png`,
  ogUrl: `${siteUrl}/dashboard`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Dashboard - Estatísticas de Igrejas Anglicanas',
  twitterDescription: 'Visualize estatísticas e dados sobre igrejas anglicanas no Brasil. Veja distribuição por jurisdição, estados e muito mais.',
  twitterImage: `${siteUrl}/og-image-dashboard.png`,
})

useHead({
  link: [
    { rel: 'canonical', href: `${siteUrl}/dashboard` }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Dashboard - Estatísticas de Igrejas Anglicanas',
        url: `${siteUrl}/dashboard`,
        description: 'Visualize estatísticas e dados sobre igrejas anglicanas no Brasil. Veja distribuição por jurisdição, estados e muito mais.',
        inLanguage: 'pt-BR',
        isPartOf: {
          '@type': 'WebSite',
          name: 'Caminho Anglicano',
          url: siteUrl
        }
      })
    }
  ]
})

const { stats, jurisdictions, selectedJurisdiction, loading, error, fetchData } = useChurchStats()

const pieChartData = computed(() => {
  const jurisdictionData = Object.values(stats.value.churchesByJurisdiction)
  return {
    labels: jurisdictionData.map(d => d.jurisdiction.name),
    data: jurisdictionData.map(d => d.count),
    colors: jurisdictionData.map(d => d.jurisdiction.color)
  }
})

const barChartData = computed(() => {
  const top5 = Object.entries(stats.value.churchesByState)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return {
    labels: top5.map(([state]) => state),
    data: top5.map(([, count]) => count)
  }
})

onMounted(() => {
  fetchData()
})
</script>
