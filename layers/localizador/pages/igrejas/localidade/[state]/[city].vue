<script setup lang="ts">
import type { Church } from '../../../../types/church'
import { slugify } from '../../../../utils/slug'
import { getStateName, getStateRegion, isValidStateCode, normalizeStateCode } from '../../../../utils/states'

const route = useRoute()
const stateCode = normalizeStateCode(route.params.state as string)
const stateSlug = stateCode.toLowerCase()
const citySlug = (route.params.city as string).toLowerCase()

if (!isValidStateCode(stateCode)) {
  throw createError({ statusCode: 404, statusMessage: 'Estado não encontrado' })
}

const stateName = getStateName(stateCode)
const stateRegion = getStateRegion(stateCode)

// Busca no servidor: a lista já chega renderizada no HTML
const { data: stateChurches, pending, error } = await useAsyncData<Church[]>(
  `churches-state-${stateCode}`,
  () => $fetch<Church[]>(`/api/churches/state/${stateCode}`),
  { default: () => [] }
)

const churches = computed(() =>
  (stateChurches.value || []).filter(
    church => normalizeStateCode(church.state) === stateCode && slugify(church.city) === citySlug
  )
)

const cityName = computed(() => churches.value[0]?.city || '')

/** Outras cidades do mesmo estado, para continuar navegando. */
const nearbyCities = computed(() => {
  const groups = new Map<string, { name: string, slug: string, count: number }>()

  for (const church of stateChurches.value || []) {
    const name = church.city?.trim()
    if (!name) continue
    const slug = slugify(name)
    if (slug === citySlug) continue
    if (!groups.has(slug)) {
      groups.set(slug, { name, slug, count: 0 })
    }
    groups.get(slug)!.count++
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
})

const jurisdictionCount = computed(
  () => new Set(churches.value.map(church => church.jurisdiction?.slug || 'nao-especificado')).size
)

// --- SEO --------------------------------------------------------------------
const title = computed(() =>
  cityName.value
    ? `Igrejas Anglicanas em ${cityName.value} - ${stateCode} | Caminho Anglicano`
    : `Igrejas Anglicanas em ${stateName} | Caminho Anglicano`
)
const description = computed(() =>
  cityName.value
    ? `${churches.value.length} ${churches.value.length === 1 ? 'igreja anglicana' : 'igrejas anglicanas'} em ${cityName.value}, ${stateCode}. Endereços, horários de culto e informações de contato.`
    : `Igrejas anglicanas em ${stateName}. Endereços, horários de culto e informações de contato.`
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
  link: [{ rel: 'canonical', href: `https://caminhoanglicano.com.br/igrejas/localidade/${stateSlug}/${citySlug}` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Igrejas Anglicanas em ${cityName.value}, ${stateCode}`,
        description: description.value,
        numberOfItems: churches.value.length,
        itemListElement: churches.value.map((church, index) => ({
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
            { label: stateName, to: `/igrejas/localidade/${stateSlug}` },
            { label: cityName || 'Cidade' }
          ]"
        />

        <div class="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-3">
              {{ stateName }}<span v-if="stateRegion"> · {{ stateRegion }}</span>
            </p>
            <h1 class="font-serif text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.05]">
              Igrejas anglicanas em<br class="hidden sm:block"> {{ cityName || stateName }}
            </h1>
            <p v-if="!pending && churches.length" class="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl leading-relaxed">
              {{ churches.length }} {{ churches.length === 1 ? 'comunidade cadastrada' : 'comunidades cadastradas' }}
              <template v-if="jurisdictionCount > 1">
                de {{ jurisdictionCount }} jurisdições diferentes
              </template>.
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

    <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Carregando -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <div v-for="i in 3" :key="i" class="h-44 rounded-2xl bg-slate-100 animate-pulse" />
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="max-w-md mx-auto text-center py-16">
        <h2 class="font-serif text-2xl font-bold text-slate-900 mb-3">Não conseguimos carregar as igrejas</h2>
        <p class="text-slate-500 mb-8">Tente novamente em instantes ou use o localizador com mapa.</p>
        <NuxtLink to="/localizador" class="inline-block px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
          Abrir localizador
        </NuxtLink>
      </div>

      <!-- Cidade sem igrejas -->
      <div v-else-if="!churches.length" class="max-w-lg mx-auto text-center py-16">
        <h2 class="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Nenhuma igreja cadastrada nesta cidade
        </h2>
        <p class="text-slate-500 mb-8 leading-relaxed">
          Veja todas as comunidades de {{ stateName }} ou explore o mapa para encontrar a mais próxima de você.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink :to="`/igrejas/localidade/${stateSlug}`" class="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
            Igrejas em {{ stateName }}
          </NuxtLink>
          <NuxtLink to="/localizador" class="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-slate-300 transition-colors">
            Abrir o mapa
          </NuxtLink>
        </div>
      </div>

      <!-- Lista -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <ChurchCard v-for="church in churches" :key="church.id" :church="church" />
      </div>

      <!-- Continue navegando pelo estado -->
      <section v-if="!pending && nearbyCities.length" class="mt-16 sm:mt-20 pt-10 border-t border-slate-100">
        <h2 class="font-serif text-2xl font-bold text-slate-900 mb-1">Outras cidades em {{ stateName }}</h2>
        <p class="text-sm text-slate-500 mb-6">
          {{ nearbyCities.length }} {{ nearbyCities.length === 1 ? 'cidade' : 'cidades' }} com comunidades cadastradas.
        </p>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="city in nearbyCities"
            :key="city.slug"
            :to="`/igrejas/localidade/${stateSlug}/${city.slug}`"
            class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-amber-400 hover:text-amber-800 transition-colors"
          >
            {{ city.name }}
            <span class="text-slate-400 font-semibold">{{ city.count }}</span>
          </NuxtLink>
        </div>
      </section>
    </main>

    <BaseFooter />
  </div>
</template>
