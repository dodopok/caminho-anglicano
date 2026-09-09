<script setup lang="ts">
import type { Church } from '../../../../types/church'
import { slugify } from '../../../../utils/slug'
import { getStateName, getStateRegion, isValidStateCode, normalizeStateCode } from '../../../../utils/states'

const route = useRoute()
const stateCode = normalizeStateCode(route.params.state as string)
const stateSlug = stateCode.toLowerCase()

if (!isValidStateCode(stateCode)) {
  throw createError({ statusCode: 404, statusMessage: 'Estado não encontrado' })
}

const stateName = getStateName(stateCode)
const stateRegion = getStateRegion(stateCode)

// Busca no servidor para que a lista já venha no HTML (SEO + sem flash de loading)
const { data: churches, pending, error } = await useAsyncData<Church[]>(
  `churches-state-${stateCode}`,
  () => $fetch<Church[]>(`/api/churches/state/${stateCode}`),
  { default: () => [] }
)

// Rede de segurança: garante que nada de outro estado apareça nesta página
const stateChurches = computed(() =>
  (churches.value || []).filter(church => normalizeStateCode(church.state) === stateCode)
)

// --- Filtros de navegação ---------------------------------------------------
const search = ref('')
const activeJurisdiction = ref<string | null>(null)

const jurisdictions = computed(() => {
  const map = new Map<string, { slug: string, name: string, color: string, count: number }>()
  for (const church of stateChurches.value) {
    const slug = church.jurisdiction?.slug || 'nao-especificado'
    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        name: church.jurisdiction?.name || 'Independente',
        color: church.jurisdiction?.color || '#94a3b8',
        count: 0
      })
    }
    map.get(slug)!.count++
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const filteredChurches = computed(() => {
  const term = normalize(search.value.trim())

  return stateChurches.value.filter((church) => {
    if (activeJurisdiction.value) {
      const slug = church.jurisdiction?.slug || 'nao-especificado'
      if (slug !== activeJurisdiction.value) return false
    }

    if (!term) return true

    return (
      normalize(church.name).includes(term) ||
      normalize(church.city).includes(term) ||
      normalize(church.address).includes(term)
    )
  })
})

const hasActiveFilters = computed(() => Boolean(search.value.trim()) || Boolean(activeJurisdiction.value))

function clearFilters() {
  search.value = ''
  activeJurisdiction.value = null
}

// --- Agrupamento por cidade -------------------------------------------------
interface CityGroup {
  name: string
  slug: string
  churches: Church[]
}

function groupByCity(list: Church[]): CityGroup[] {
  const groups = new Map<string, CityGroup>()

  for (const church of list) {
    const name = church.city?.trim() || 'Sem cidade informada'
    const slug = slugify(name)
    if (!groups.has(slug)) {
      groups.set(slug, { name, slug, churches: [] })
    }
    groups.get(slug)!.churches.push(church)
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Índice completo do estado — não muda com os filtros, serve de navegação. */
const allCities = computed(() => groupByCity(stateChurches.value))
/** Resultado exibido, já filtrado. */
const visibleCities = computed(() => groupByCity(filteredChurches.value))

// --- SEO --------------------------------------------------------------------
const churchCount = computed(() => stateChurches.value.length)
const title = computed(() => `Igrejas Anglicanas em ${stateName} (${stateCode}) | Caminho Anglicano`)
const description = computed(() =>
  `${churchCount.value} ${churchCount.value === 1 ? 'igreja anglicana' : 'igrejas anglicanas'} em ${stateName}, `
  + `em ${allCities.value.length} ${allCities.value.length === 1 ? 'cidade' : 'cidades'}. `
  + 'Veja endereços, horários de culto e informações de contato.'
)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})

useHead({
  link: [{ rel: 'canonical', href: `https://caminhoanglicano.com.br/igrejas/localidade/${stateSlug}` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Igrejas Anglicanas em ${stateName}`,
        description: description.value,
        numberOfItems: stateChurches.value.length,
        itemListElement: stateChurches.value.map((church, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://caminhoanglicano.com.br/igrejas/${church.jurisdiction?.slug || 'nao-especificado'}/${church.slug}`,
          name: church.name
        }))
      })
    }
  ]
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white font-sans selection:bg-amber-100 selection:text-amber-900">
    <!-- Cabeçalho -->
    <header class="border-b border-slate-100 bg-slate-50/60">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8 sm:pb-12">
        <LocalityBreadcrumb
          :items="[
            { label: 'Início', to: '/' },
            { label: 'Igrejas', to: '/igrejas' },
            { label: stateName }
          ]"
        />

        <div class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p v-if="stateRegion" class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-3">
              {{ stateRegion }} · {{ stateCode }}
            </p>
            <h1 class="font-serif text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.05]">
              Igrejas anglicanas em<br class="hidden sm:block"> {{ stateName }}
            </h1>
            <p v-if="!pending" class="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl leading-relaxed">
              {{ churchCount }} {{ churchCount === 1 ? 'comunidade cadastrada' : 'comunidades cadastradas' }}
              em {{ allCities.length }} {{ allCities.length === 1 ? 'cidade' : 'cidades' }}.
            </p>
          </div>

          <NuxtLink
            to="/localizador"
            class="inline-flex items-center justify-center gap-2 shrink-0 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Ver no mapa
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Índice de cidades: navegação rápida, fixa no topo ao rolar -->
    <div
      v-if="!pending && allCities.length > 1"
      class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-100"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex gap-2 overflow-x-auto py-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span class="hidden sm:flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pr-2 shrink-0">
            Cidades
          </span>
          <a
            v-for="city in allCities"
            :key="city.slug"
            :href="`#${city.slug}`"
            class="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-amber-400 hover:text-amber-800 transition-colors whitespace-nowrap"
          >
            {{ city.name }}
            <span class="text-slate-400 font-semibold">{{ city.churches.length }}</span>
          </a>
        </div>
      </div>
    </div>

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Carregando -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <div v-for="i in 6" :key="i" class="h-44 rounded-2xl bg-slate-100 animate-pulse" />
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="max-w-md mx-auto text-center py-16">
        <h2 class="font-serif text-2xl font-bold text-slate-900 mb-3">Não conseguimos carregar as igrejas</h2>
        <p class="text-slate-500 mb-8">Tente novamente em instantes ou use o localizador com mapa.</p>
        <NuxtLink to="/localizador" class="inline-block px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
          Abrir localizador
        </NuxtLink>
      </div>

      <!-- Estado sem igrejas cadastradas -->
      <div v-else-if="!stateChurches.length" class="max-w-lg mx-auto text-center py-16">
        <h2 class="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Ainda não há igrejas cadastradas em {{ stateName }}
        </h2>
        <p class="text-slate-500 mb-8 leading-relaxed">
          Conhece uma comunidade anglicana por aqui? Você pode cadastrá-la e ajudar outras pessoas a encontrá-la.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink to="/igrejas" class="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
            Ver outros estados
          </NuxtLink>
          <NuxtLink to="/localizador" class="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-slate-300 transition-colors">
            Abrir o mapa
          </NuxtLink>
        </div>
      </div>

      <template v-else>
        <!-- Filtros -->
        <div class="mb-8 sm:mb-10 space-y-4">
          <div class="relative max-w-md">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              v-model="search"
              type="search"
              :placeholder="`Buscar por igreja, cidade ou endereço em ${stateCode}`"
              class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              :aria-label="`Buscar igrejas em ${stateName}`"
            >
          </div>

          <div v-if="jurisdictions.length > 1" class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors"
              :class="activeJurisdiction === null
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'"
              @click="activeJurisdiction = null"
            >
              Todas
              <span class="opacity-60">{{ stateChurches.length }}</span>
            </button>
            <button
              v-for="jurisdiction in jurisdictions"
              :key="jurisdiction.slug"
              type="button"
              class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors"
              :class="activeJurisdiction === jurisdiction.slug
                ? 'text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'"
              :style="activeJurisdiction === jurisdiction.slug
                ? { backgroundColor: jurisdiction.color, borderColor: jurisdiction.color }
                : undefined"
              @click="activeJurisdiction = activeJurisdiction === jurisdiction.slug ? null : jurisdiction.slug"
            >
              {{ jurisdiction.name }}
              <span class="opacity-60">{{ jurisdiction.count }}</span>
            </button>
          </div>
        </div>

        <!-- Nenhum resultado para os filtros -->
        <div v-if="!filteredChurches.length" class="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
          <p class="font-serif text-xl font-bold text-slate-900 mb-2">Nenhuma igreja encontrada</p>
          <p class="text-sm text-slate-500 mb-6">Tente outro termo ou remova os filtros.</p>
          <button
            type="button"
            class="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            @click="clearFilters"
          >
            Limpar filtros
          </button>
        </div>

        <template v-else>
          <p v-if="hasActiveFilters" class="mb-6 text-sm text-slate-500">
            {{ filteredChurches.length }}
            {{ filteredChurches.length === 1 ? 'igreja encontrada' : 'igrejas encontradas' }}
            <button type="button" class="ml-2 font-bold text-amber-700 hover:text-amber-900 transition-colors" @click="clearFilters">
              limpar
            </button>
          </p>

          <!-- Lista agrupada por cidade -->
          <div class="space-y-12 sm:space-y-16">
            <section v-for="city in visibleCities" :id="city.slug" :key="city.slug" class="scroll-mt-24">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-5 pb-3 border-b border-slate-100">
                <h2 class="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                  {{ city.name }}
                  <span class="ml-1 align-middle text-sm font-sans font-black text-slate-300">{{ city.churches.length }}</span>
                </h2>
                <NuxtLink
                  :to="`/igrejas/localidade/${stateSlug}/${city.slug}`"
                  class="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Página de {{ city.name }} →
                </NuxtLink>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                <ChurchCard v-for="church in city.churches" :key="church.id" :church="church" />
              </div>
            </section>
          </div>
        </template>
      </template>
    </main>

    <BaseFooter />
  </div>
</template>
