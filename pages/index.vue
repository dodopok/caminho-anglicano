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
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
    <!-- <nav class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-slate-800">
            Caminho Anglicano
          </h1>
        </div>
      </div>
    </nav> -->

    <!-- Banner do Livro -->
    <div class="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 border-b-4 border-amber-900 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div class="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-white text-center sm:text-left">
            <div class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg class="w-7 h-7 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1">📖 Livro: Caminho Anglicano</h2>
              <p class="text-sm sm:text-base lg:text-lg text-amber-50 font-medium">Por Thomas McKenzie</p>
              <p class="text-xs sm:text-sm text-amber-100">Tradução: Rev. Douglas Araujo</p>
            </div>
          </div>
          <div class="flex gap-2 sm:gap-4 flex-wrap justify-center">
            <a
              href="https://amzn.to/4r2lYmM"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-amber-800 rounded-lg hover:bg-amber-50 transition-all font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 text-sm sm:text-base"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Comprar Digital
            </a>
            <a
              href="https://loja.uiclap.com/titulo/ua123620"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-amber-950 text-white rounded-lg hover:bg-black transition-all font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 text-sm sm:text-base"
            >
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Comprar Físico
            </a>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
      <div class="text-center mt-4 mb-8">
        <h1 class="text-4xl font-bold text-slate-900 mb-4">
          Bem-vindo ao Caminho Anglicano
        </h1>
        <p class="text-xl text-slate-600 max-w-2xl mx-auto">
          Recursos e serviços para conectar a comunidade anglicana brasileira
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <BaseNavigationCard
          to="/localizador"
          icon="location"
          title="Localizador de Igrejas"
          description="Encontre igrejas anglicanas perto de você em todo o Brasil"
        />

        <BaseNavigationCard
          to="/dashboard"
          icon="chart"
          title="Dashboard de Igrejas"
          description="Visualize estatísticas e dados sobre igrejas anglicanas no Brasil"
        />

        <BaseNavigationCard
          to="/glossario"
          icon="book"
          title="Glossário Anglicano"
          description="Explore termos e conceitos da tradição anglicana"
        />

        <BaseNavigationCard
          to="/locs"
          icon="book"
          title="Livro de Oração Comum"
          description="Tenha acesso a várias edições do Livro de Oração Comum digitalmente"
        />

        <BaseNavigationCard
          href="https://anglican-quiz.vercel.app/"
          icon="clipboard"
          title="Teste de Espectro Anglicano"
          description="Descubra seu alinhamento teológico no Teste de Espectro Anglicano"
          external
        />
      </div>
    </main>

    <BaseFooter />

    <!-- Botão flutuante de apoio -->
    <SupportButton variant="floating" />
  </div>
</template>
