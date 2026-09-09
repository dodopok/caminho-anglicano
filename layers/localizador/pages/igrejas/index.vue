<script setup lang="ts">
import type { Jurisdiction } from '../../types/church'
import { REGIONS } from '../../utils/states'

const { data: locations, pending: loadingLocations } = await useChurchLocations()

const { data: jurisdictions, pending: loadingJurisdictions } = await useAsyncData<Jurisdiction[]>(
  'jurisdictions',
  () => $fetch<Jurisdiction[]>('/api/jurisdictions'),
  { default: () => [] }
)

/** Estados agrupados por região, apenas os que têm igrejas cadastradas. */
const statesByRegion = computed(() =>
  REGIONS
    .map(region => ({
      region,
      states: (locations.value?.states || []).filter(state => state.region === region)
    }))
    .filter(group => group.states.length > 0)
)

const stats = computed(() => [
  { value: locations.value?.totalChurches ?? 0, label: 'Igrejas' },
  { value: locations.value?.totalCities ?? 0, label: 'Cidades' },
  { value: locations.value?.totalStates ?? 0, label: 'Estados' },
  { value: jurisdictions.value?.length ?? 0, label: 'Jurisdições' }
])

useSeoMeta({
  title: 'Igrejas Anglicanas no Brasil - Por Estado e Jurisdição | Caminho Anglicano',
  description: 'Encontre igrejas anglicanas em todo o Brasil. Navegue por estado, cidade ou jurisdição (IEAB, IACB e outras) e veja endereços e horários de culto.'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://caminhoanglicano.com.br/igrejas' }]
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white font-sans selection:bg-amber-100 selection:text-amber-900">
    <!-- Cabeçalho -->
    <header class="border-b border-slate-100 bg-slate-50/60">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pt-8 sm:pb-14">
        <LocalityBreadcrumb :items="[{ label: 'Início', to: '/' }, { label: 'Igrejas' }]" />

        <div class="mt-6 max-w-3xl">
          <h1 class="font-serif text-4xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-[1.03]">
            Igrejas anglicanas<br class="hidden sm:block"> no Brasil
          </h1>
          <p class="mt-5 text-base sm:text-lg text-slate-500 leading-relaxed">
            Navegue por estado e cidade, ou explore as comunidades de cada jurisdição.
            Se preferir buscar por proximidade, use o mapa.
          </p>

          <div class="mt-7 flex flex-col sm:flex-row gap-3">
            <NuxtLink
              to="/localizador"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Abrir o mapa interativo
            </NuxtLink>
            <a
              href="#jurisdicoes"
              class="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-slate-300 transition-colors"
            >
              Ver por jurisdição
            </a>
          </div>
        </div>

        <!-- Números -->
        <dl class="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="px-4 py-4 rounded-2xl bg-white border border-slate-100"
          >
            <dt class="sr-only">{{ stat.label }}</dt>
            <dd>
              <span v-if="loadingLocations" class="block h-7 w-12 rounded bg-slate-100 animate-pulse" />
              <span v-else class="block font-serif text-2xl sm:text-3xl font-bold text-amber-600">{{ stat.value }}</span>
              <span class="mt-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{{ stat.label }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16 sm:space-y-24">
      <!-- Por localidade -->
      <section id="localidades">
        <div class="mb-8">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-3">Por localidade</p>
          <h2 class="font-serif text-3xl sm:text-4xl font-bold text-slate-900">Escolha um estado</h2>
          <p class="mt-3 text-slate-500 max-w-2xl leading-relaxed">
            Cada estado abre a lista completa de comunidades, agrupada por cidade.
          </p>
        </div>

        <div v-if="loadingLocations" class="space-y-10">
          <div v-for="i in 2" :key="i">
            <div class="h-4 w-24 rounded bg-slate-100 animate-pulse mb-5" />
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div v-for="j in 8" :key="j" class="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>

        <div v-else class="space-y-10 sm:space-y-12">
          <div v-for="group in statesByRegion" :key="group.region">
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              {{ group.region }}
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <NuxtLink
                v-for="state in group.states"
                :key="state.code"
                :to="`/igrejas/localidade/${state.code.toLowerCase()}`"
                class="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-lg hover:shadow-slate-200/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                <span class="font-serif text-3xl font-bold text-slate-200 group-hover:text-amber-200 transition-colors leading-none">
                  {{ state.code }}
                </span>
                <span class="mt-3 block font-bold text-slate-900 text-sm leading-tight">{{ state.name }}</span>
                <span class="mt-1 block text-xs text-slate-500">
                  {{ state.count }} {{ state.count === 1 ? 'igreja' : 'igrejas' }}
                  <span class="text-slate-300"> · </span>
                  {{ state.cities.length }} {{ state.cities.length === 1 ? 'cidade' : 'cidades' }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- Por jurisdição -->
      <section id="jurisdicoes" class="scroll-mt-8">
        <div class="mb-8">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-3">Por jurisdição</p>
          <h2 class="font-serif text-3xl sm:text-4xl font-bold text-slate-900">Igrejas de cada jurisdição</h2>
          <p class="mt-3 text-slate-500 max-w-2xl leading-relaxed">
            O anglicanismo brasileiro se organiza em jurisdições distintas. Veja as comunidades de cada uma.
          </p>
        </div>

        <div v-if="loadingJurisdictions" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="jurisdiction in jurisdictions"
            :key="jurisdiction.id"
            :to="`/igrejas/${jurisdiction.slug}`"
            class="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-lg hover:shadow-slate-200/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <span class="w-1.5 h-12 rounded-full shrink-0" :style="{ backgroundColor: jurisdiction.color }" aria-hidden="true" />
            <span class="min-w-0">
              <span class="block font-bold text-slate-900 group-hover:text-amber-800 transition-colors">{{ jurisdiction.name }}</span>
              <span class="block text-xs text-slate-500 truncate">{{ jurisdiction.fullName }}</span>
            </span>
            <svg class="w-4 h-4 ml-auto shrink-0 text-slate-300 group-hover:text-amber-600 transition-colors" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>
      </section>

      <!-- Cadastro -->
      <section class="rounded-3xl bg-slate-950 text-white p-8 sm:p-12 relative overflow-hidden">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(217,119,6,0.18),transparent_60%)]" aria-hidden="true" />
        <div class="relative z-10 max-w-2xl">
          <h2 class="font-serif text-2xl sm:text-3xl font-bold mb-3">Não encontrou a sua comunidade?</h2>
          <p class="text-slate-300 leading-relaxed mb-7">
            O diretório é mantido de forma colaborativa. Se você conhece uma igreja anglicana
            que ainda não está aqui, cadastre-a pelo localizador e ajude outras pessoas a encontrá-la.
          </p>
          <NuxtLink
            to="/localizador"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-colors"
          >
            Cadastrar uma igreja
          </NuxtLink>
        </div>
      </section>
    </main>

    <BaseFooter />
  </div>
</template>
