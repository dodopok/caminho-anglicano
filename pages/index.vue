<script setup lang="ts">
const siteUrl = 'https://caminhoanglicano.com.br'
const ordoUrl = 'https://www.oficio.app'
const englishOrdoUrl = 'https://www.daily-office.app'

useSeoMeta({
  title: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  description: 'Portal da comunidade anglicana no Brasil: encontre igrejas, consulte o lecionário, explore o Livro de Oração Comum e conheça o Ordo, aplicativo de Ofício Diário.',
  ogTitle: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  ogDescription: 'Encontre igrejas, explore a tradição anglicana e conheça o Ordo, um aplicativo de Ofício Diário para oração, salmos e leituras bíblicas.',
  ogImage: `${siteUrl}/screenshot-wide.png`,
  ogUrl: siteUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Caminho Anglicano - Portal da Comunidade Anglicana Brasileira',
  twitterDescription: 'Recursos e serviços para a comunidade anglicana brasileira.',
  twitterImage: `${siteUrl}/screenshot-wide.png`,
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
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            name: 'Caminho Anglicano',
            url: siteUrl,
            description: 'Portal de recursos e serviços para a comunidade anglicana brasileira',
            publisher: { '@id': `${siteUrl}/#organization` },
            hasPart: { '@id': `${ordoUrl}/#application` },
            potentialAction: {
              '@type': 'SearchAction',
              target: `${siteUrl}/localizador?q={search_term_string}`,
              'query-input': 'required name=search_term_string'
            }
          },
          {
            '@type': 'Organization',
            '@id': `${siteUrl}/#organization`,
            name: 'Caminho Anglicano',
            url: siteUrl,
            sameAs: [
              siteUrl,
              ordoUrl,
              englishOrdoUrl,
              'https://instagram.com/caminhoanglicano'
            ]
          },
          {
            '@type': 'SoftwareApplication',
            '@id': `${ordoUrl}/#application`,
            name: 'Ordo',
            alternateName: ['Ofício Diário', 'Daily Office'],
            description: 'Aplicativo de Ofício Diário com oração, salmos, leituras bíblicas e calendário litúrgico.',
            url: ordoUrl,
            applicationCategory: 'LifestyleApplication',
            applicationSubCategory: 'Prayer and spirituality',
            operatingSystem: 'iOS, Android',
            inLanguage: ['pt-BR', 'pt-PT', 'en', 'es'],
            isAccessibleForFree: true,
            offers: {
              '@type': 'Offer',
              price: 0,
              priceCurrency: 'BRL'
            },
            downloadUrl: [
              'https://apps.apple.com/br/app/ordo-of%C3%ADcio-di%C3%A1rio/id6756016908',
              'https://play.google.com/store/apps/details?id=br.com.caminhoanglicano.ordo'
            ],
            publisher: { '@id': `${siteUrl}/#organization` }
          }
        ]
      })
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden font-sans">
    <!-- Decorações de Fundo -->
    <div class="absolute top-0 left-0 w-full h-[1000px] overflow-hidden -z-10 pointer-events-none opacity-40">
      <div class="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] rounded-full bg-amber-100/50 blur-[120px] animate-pulse"></div>
      <div class="absolute top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-slate-100/50 blur-[100px]"></div>
    </div>

    <!-- Banner do Livro (Compacto) -->
    <div class="relative overflow-hidden bg-slate-950 text-white border-b border-white/5">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(217,119,6,0.15),transparent)]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 relative z-10">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-3 text-center sm:text-left">
            <p class="text-[13px] font-medium tracking-wide">
              <span class="text-amber-500 font-black uppercase text-[10px] tracking-[0.2em] mr-2 px-1.5 py-0.5 bg-amber-500/10 rounded">Novo</span>
              <span class="text-slate-200">Livro "Caminho Anglicano" por Thomas McKenzie</span>
            </p>
          </div>
          <div class="flex gap-2">
            <a href="https://amzn.to/4r2lYmM" target="_blank" class="text-[11px] font-bold px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">Digital</a>
            <a href="https://loja.uiclap.com/titulo/ua123620" target="_blank" class="text-[11px] font-bold px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded-lg transition-all text-white">Físico</a>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 relative">
      <!-- Hero Section -->
      <div class="text-center mb-12 sm:mb-16 space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Portal da Comunidade
        </div>
        <h1 class="text-5xl sm:text-7xl lg:text-8xl font-serif font-bold text-slate-900 tracking-tight leading-[0.95]">
          Caminho <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Anglicano</span>
        </h1>
        <p class="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
          Um ecossistema digital de recursos e conexão para a Igreja no Brasil. Encontre igrejas,
          consulte o lecionário e conheça o Ordo, aplicativo de Ofício Diário para oração, salmos
          e leituras bíblicas.
        </p>
      </div>

      <!-- Bento Grid (7 Cards - Muito mais compacto no Desktop) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 auto-rows-auto">
        
        <!-- Linha 1: Foco em Localização e Liturgia -->
        <BaseNavigationCard
          to="/localizador"
          icon="location"
          title="Mapa das Igrejas"
          description="Localizador interativo em todo o Brasil."
          size="wide"
        />

        <BaseNavigationCard
          to="/igrejas"
          icon="book"
          title="Por Localidade"
          description="Navegue por estados e cidades."
        />

        <BaseNavigationCard
          href="https://www.lecionarioanglicano.com.br/"
          icon="calendar"
          title="Lecionário"
          description="Calendário litúrgico e leituras."
          external
        />

        <BaseNavigationCard
          href="https://www.oficio.app/"
          icon="sun"
          title="Ofício Diário"
          description="Orações, salmos e leituras para cada dia."
          external
        />

        <!-- Linha 2: Outros Recursos em 1x1 -->
        <BaseNavigationCard
          to="/glossario"
          icon="book"
          title="Glossário"
          description="Termos, ritos e história."
        />

        <BaseNavigationCard
          to="/dashboard"
          icon="chart"
          title="Dados"
          description="Estatísticas anglicanas reais."
        />

        <BaseNavigationCard
          href="http://cantuaria.caminhoanglicano.com.br/"
          icon="library"
          title="Cantuária"
          description="Biblioteca digital de pensamento."
          external
        />

        <BaseNavigationCard
          href="https://anglican-quiz.vercel.app/"
          icon="clipboard"
          title="Espectro"
          description="Seu perfil teológico anglicano."
          external
        />
      </div>
    </main>

    <!-- SEO & Explore Section -->
    <section class="bg-slate-50/50 border-y border-slate-100 py-16 sm:py-20 relative overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(217,119,6,0.03),transparent)]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-5">O Anglicanismo em todo o Brasil</h2>
            <p class="text-base sm:text-lg text-slate-500 mb-6 leading-relaxed">
              O Caminho Anglicano é um portal de convergência, facilitando o acesso a igrejas de todas as jurisdições.
            </p>
            <p class="text-base sm:text-lg text-slate-500 mb-6 leading-relaxed">
              O Ordo leva o Ofício Diário para o celular, com os textos e leituras organizados conforme o livro de oração escolhido.
            </p>
            <a
              :href="ordoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-900 transition-colors mb-6"
            >
              Conheça o Ofício Diário no Ordo <span aria-hidden="true">↗</span>
            </a>
            <div class="flex flex-wrap gap-2">
              <NuxtLink v-for="uf in ['SP', 'RJ', 'MG', 'DF', 'RS', 'PR', 'SC', 'BA', 'PE']" :key="uf" 
                :to="`/igrejas/localidade/${uf.toLowerCase()}`"
                class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:border-amber-500 hover:text-amber-700 transition-all shadow-sm"
              >
                {{ uf }}
              </NuxtLink>
              <NuxtLink to="/igrejas" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md">
                Ver todos os Estados →
              </NuxtLink>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <div class="text-2xl font-serif font-bold text-amber-600 mb-1">300+</div>
              <div class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Igrejas</div>
            </div>
            <div class="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <div class="text-2xl font-serif font-bold text-amber-600 mb-1">26</div>
              <div class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Estados</div>
            </div>
            <div class="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <div class="text-2xl font-serif font-bold text-amber-600 mb-1">100%</div>
              <div class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Digital</div>
            </div>
            <div class="p-6 bg-amber-600 rounded-3xl shadow-lg border border-amber-500 text-white flex items-center">
              <div class="text-sm font-bold leading-tight">Faça parte desta jornada.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <BaseFooter />

    <!-- Botão flutuante de apoio -->
    <SupportButton variant="floating" />
  </div>
</template>

<style scoped>
.font-serif {
  font-family: 'Cormorant Garamond', serif;
}
.font-sans {
  font-family: 'Inter', sans-serif;
}
</style>
