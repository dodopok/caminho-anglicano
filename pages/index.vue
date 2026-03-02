<script setup lang="ts">
const siteUrl = 'https://caminhoanglicano.com.br' // Atualize com sua URL de produção

useSeoMeta({
  title: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  description: 'Encontre igrejas anglicanas em todo o Brasil. Portal de recursos, serviços e conexão para a comunidade anglicana brasileira.',
  ogTitle: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  ogDescription: 'Encontre igrejas anglicanas em todo o Brasil. Portal de recursos, serviços e conexão para a comunidade anglicana brasileira.',
  ogImage: `${siteUrl}/og-image.png`,
  ogUrl: siteUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  twitterDescription: 'Encontre igrejas anglicanas em todo o Brasil. Portal de recursos, serviços e conexão para a comunidade anglicana brasileira.',
  twitterImage: `${siteUrl}/og-image.png`,
})

useHead({
  link: [
    { rel: 'canonical', href: siteUrl }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Caminho Anglicano',
        url: siteUrl,
        description: 'Portal de recursos e serviços para a comunidade anglicana brasileira',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/localizador?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      })
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden">
    <!-- Decorações de Fundo -->
    <div class="absolute top-0 left-0 w-full h-[600px] overflow-hidden -z-10 pointer-events-none opacity-40">
      <div class="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-amber-200/50 blur-3xl animate-pulse"></div>
      <div class="absolute top-[20%] -left-[5%] w-[400px] h-[400px] rounded-full bg-slate-200 blur-3xl"></div>
    </div>

    <!-- Banner do Livro -->
    <div class="relative overflow-hidden bg-slate-900 text-white">
      <div class="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 mix-blend-overlay"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div class="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl ring-1 ring-white/20">
              <svg class="w-9 h-9 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-400/20">
                Lançamento
              </div>
              <h2 class="text-2xl lg:text-3xl font-black mb-1 flex items-center gap-2 justify-center sm:justify-start">
                Livro: Caminho Anglicano
              </h2>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-400">
                <span class="font-medium text-amber-50">Por Thomas McKenzie</span>
                <span class="w-1 h-1 rounded-full bg-slate-700 hidden sm:block"></span>
                <span>Tradução: Rev. Douglas Araujo</span>
              </div>
            </div>
          </div>
          <div class="flex gap-4 items-center">
            <a
              href="https://amzn.to/4r2lYmM"
              target="_blank"
              rel="noopener noreferrer"
              class="group relative inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold transition-all hover:bg-slate-50 shadow-xl hover:shadow-white/10 active:scale-95 text-sm sm:text-base overflow-hidden"
            >
              <div class="absolute inset-0 bg-gradient-to-tr from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              Digital
            </a>
            <a
              href="https://loja.uiclap.com/titulo/ua123620"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold transition-all hover:bg-amber-500 shadow-xl hover:shadow-amber-500/20 active:scale-95 text-sm sm:text-base"
            >
              Físico
            </a>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 relative">
      <div class="text-center mb-10 sm:mb-16 space-y-4">
        <h1 class="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight">
          Caminho <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Anglicano</span>
        </h1>
        <p class="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
          Recursos, serviços e conexão para a comunidade anglicana brasileira. 
          Uma porta de entrada para a tradição e o futuro da nossa Igreja.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <!-- Principais Serviços -->
        <BaseNavigationCard
          to="/localizador"
          icon="location"
          title="Localizador de Igrejas"
          description="Encontre comunidades anglicanas perto de você em todo o território nacional através do nosso mapa interativo."
        />

        <BaseNavigationCard
          href="https://www.lecionarioanglicano.com.br/"
          icon="calendar"
          title="Lecionário Anglicano"
          description="Acompanhe o ritmo da Igreja através do calendário litúrgico, coletas e as leituras bíblicas diárias."
          external
        />

        <BaseNavigationCard
          href="http://cantuaria.caminhoanglicano.com.br/"
          icon="library"
          title="Projeto Cantuária"
          description="Acesse uma biblioteca digital dedicada a preservar e difundir o pensamento anglicano em nossa língua."
          external
        />

        <!-- Recursos de Exploração -->
        <BaseNavigationCard
          to="/glossario"
          icon="book"
          title="Glossário Anglicano"
          description="Uma bússola para navegar pelos termos, ritos e a rica história que compõe a identidade anglicana."
        />

        <BaseNavigationCard
          to="/dashboard"
          icon="chart"
          title="Painel de Dados"
          description="Estatísticas transparentes e visualizações sobre a presença e o crescimento anglicano no Brasil."
        />

        <BaseNavigationCard
          href="https://anglican-quiz.vercel.app/"
          icon="clipboard"
          title="Espectro Teológico"
          description="Uma ferramenta de autoconhecimento para descobrir onde você se situa no vasto mosaico teológico anglicano."
          external
        />
      </div>
    </main>

    <BaseFooter />

    <!-- Botão flutuante de apoio -->
    <SupportButton variant="floating" />
  </div>
</template>
