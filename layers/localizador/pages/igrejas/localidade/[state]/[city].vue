<script setup lang="ts">
import type { Church } from '../../../../types/church'
import { slugify } from '../../../../utils/slug'

const route = useRoute()
const stateParam = (route.params.state as string).toUpperCase()
const citySlug = route.params.city as string

const { fetchChurches } = useChurches()

const churches = ref<Church[]>([])
const cityName = ref('')
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

const stateName = computed(() => stateNames[stateParam] || stateParam)

onMounted(async () => {
  try {
    // Fetch churches for the state and filter by city slug
    const stateChurches = await fetchChurches({ state: stateParam })
    
    churches.value = stateChurches.filter(church => slugify(church.city) === citySlug)
    
    if (churches.value.length > 0) {
      cityName.value = churches.value[0].city
    } else {
      error.value = `Nenhuma igreja encontrada em ${citySlug} (${stateParam})`
    }
  } catch (e) {
    console.error('Erro ao carregar igrejas:', e)
    error.value = 'Erro ao carregar dados'
  } finally {
    loading.value = false
  }
})

// SEO
const title = computed(() => `Igrejas Anglicanas em ${cityName.value} - ${stateParam} | Caminho Anglicano`)
const description = computed(() => `Encontre igrejas anglicanas em ${cityName.value}, ${stateParam}. Veja endereços, horários de culto e informações de contato de ${churches.value.length} ${churches.value.length === 1 ? 'igreja' : 'igrejas'}.`)

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
  name: `Igrejas Anglicanas em ${cityName.value}, ${stateParam}`,
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
              <li><NuxtLink :to="`/igrejas/localidade/${stateParam.toLowerCase()}`" class="text-blue-600 hover:underline">{{ stateName }}</NuxtLink></li>
              <li class="text-gray-400">/</li>
              <li class="text-gray-700 font-medium">{{ cityName }}</li>
            </ol>
          </nav>

          <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Igrejas Anglicanas em {{ cityName }} - {{ stateParam }}
          </h1>
          <p class="text-lg text-gray-600">
            Encontre o caminho para a igreja anglicana mais próxima em {{ cityName }}.
          </p>
        </div>
      </div>

      <!-- List -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="church in churches"
            :key="church.id"
            :to="`/igrejas/${church.jurisdiction?.slug || 'nao-especificado'}/${church.slug}`"
            class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group"
          >
            <div class="h-2" :style="{ backgroundColor: church.jurisdiction?.color || '#cbd5e1' }"/>
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                {{ church.name }}
              </h3>
              <p class="text-gray-600 mb-4">{{ church.address }}</p>
              
              <div v-if="church.schedules && church.schedules.length > 0" class="mb-4">
                <p class="text-sm font-semibold text-gray-900 mb-1">Horários:</p>
                <ul class="text-sm text-gray-600">
                  <li v-for="(s, idx) in church.schedules.slice(0, 2)" :key="idx">
                    {{ s.day }}: {{ s.time }}
                  </li>
                  <li v-if="church.schedules.length > 2" class="text-xs italic">
                    + {{ church.schedules.length - 2 }} outros horários
                  </li>
                </ul>
              </div>

              <div class="flex items-center justify-between mt-auto">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full" 
                      :style="{ backgroundColor: (church.jurisdiction?.color || '#cbd5e1') + '20', color: church.jurisdiction?.color || '#64748b' }">
                  {{ church.jurisdiction?.name || 'Independente' }}
                </span>
                <span class="text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Ver detalhes →
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Call to action if few results -->
        <div v-if="churches.length < 3" class="mt-12 p-8 bg-blue-50 rounded-xl border border-blue-100 text-center">
          <h3 class="text-xl font-bold text-blue-900 mb-2">Não encontrou o que procurava?</h3>
          <p class="text-blue-700 mb-6">Você pode ver todas as igrejas no nosso localizador completo com mapa.</p>
          <NuxtLink to="/localizador" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Abrir Localizador com Mapa
          </NuxtLink>
        </div>
      </div>
      <BaseFooter />
    </div>
  </div>
</template>
