<script setup lang="ts">
import type { Church } from '../../../../types/church'
import { slugify } from '../../../../utils/slug'

const route = useRoute()
const stateParam = route.params.state as string

const { fetchChurches } = useChurches()

const churches = ref<Church[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Map state abbreviations to full names
const stateNames: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins'
}

const stateName = computed(() => stateNames[stateParam.toUpperCase()] || stateParam.toUpperCase())

onMounted(async () => {
  try {
    const data = await fetchChurches({ state: stateParam })
    churches.value = data
    if (data.length === 0) {
      error.value = `Nenhuma igreja encontrada no estado de ${stateName.value}`
    }
  } catch (e) {
    console.error('Erro ao carregar igrejas:', e)
    error.value = 'Erro ao carregar dados'
  } finally {
    loading.value = false
  }
})

// Group by city for the state page
const churchesByCity = computed(() => {
  const grouped = new Map<string, Church[]>()
  churches.value.forEach(church => {
    const city = church.city
    if (!grouped.has(city)) {
      grouped.set(city, [])
    }
    grouped.get(city)!.push(church)
  })
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])))
})

// SEO
const title = computed(() => `Igrejas Anglicanas em ${stateName.value} (${stateParam.toUpperCase()}) | Caminho Anglicano`)
const description = computed(() => `Encontre igrejas anglicanas no estado de ${stateName.value}. Veja endereços, horários de culto e informações de contato de ${churches.value.length} ${churches.value.length === 1 ? 'igreja' : 'igrejas'}.`)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})

// Structured data
const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `Igrejas Anglicanas em ${stateName.value}`,
  description: description.value,
  itemListElement: churches.value.map((church, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `https://caminhoanglicano.com.br/igrejas/${church.jurisdiction?.slug || 'nao-especificado'}/${church.slug}`,
    name: church.name
  }))
}))

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(structuredData.value)
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"/>
        <p class="text-gray-600">Carregando...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md px-4">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">😔 Ops!</h1>
        <p class="text-xl text-gray-600 mb-8">{{ error }}</p>
        <NuxtLink to="/localizador" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Voltar para o localizador
        </NuxtLink>
      </div>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <nav class="mb-6">
            <ol class="flex items-center space-x-2 text-sm">
              <li><NuxtLink to="/" class="text-blue-600 hover:underline">Início</NuxtLink></li>
              <li class="text-gray-400">/</li>
              <li><NuxtLink to="/localizador" class="text-blue-600 hover:underline">Localizador</NuxtLink></li>
              <li class="text-gray-400">/</li>
              <li class="text-gray-700 font-medium">{{ stateName }}</li>
            </ol>
          </nav>

          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Igrejas Anglicanas em {{ stateName }}
          </h1>
          <p class="text-lg text-gray-600">
            {{ churches.length }} {{ churches.length === 1 ? 'igreja encontrada' : 'igrejas encontradas' }} no estado.
          </p>
        </div>
      </div>

      <!-- List -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="space-y-12">
          <div v-for="[city, cityChurches] in churchesByCity" :key="city">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-between">
              <div class="flex items-center">
                <svg class="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {{ city }}
              </div>
              <NuxtLink 
                :to="`/igrejas/localidade/${stateParam.toLowerCase()}/${slugify(city)}`"
                class="text-sm font-medium text-blue-600 hover:underline"
              >
                Ver todas em {{ city }} →
              </NuxtLink>
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NuxtLink
                v-for="church in cityChurches"
                :key="church.id"
                :to="`/igrejas/${church.jurisdiction?.slug || 'nao-especificado'}/${church.slug}`"
                class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
              >
                <div class="h-1.5" :style="{ backgroundColor: church.jurisdiction?.color || '#cbd5e1' }"/>
                <div class="p-5">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {{ church.name }}
                    </h3>
                  </div>
                  <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ church.address }}</p>
                  <div class="flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full w-fit" 
                       :style="{ backgroundColor: (church.jurisdiction?.color || '#cbd5e1') + '20', color: church.jurisdiction?.color || '#64748b' }">
                    {{ church.jurisdiction?.name || 'Independente' }}
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
      <BaseFooter />
    </div>
  </div>
</template>
