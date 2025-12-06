<script setup lang="ts">
import type { Jurisdiction } from '../types/church'

interface Props {
  isOpen: boolean
  jurisdictions: Jurisdiction[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const selectedJurisdictionId = ref<string>('')
const widgetWidth = ref('100%')
const widgetHeight = ref('600')
const copiedToClipboard = ref(false)

// Use current origin for preview and code generation
const siteUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return 'https://caminhoanglicano.com.br'
})

const selectedJurisdiction = computed(() => {
  if (!selectedJurisdictionId.value) return null
  return props.jurisdictions.find(j => j.id === selectedJurisdictionId.value)
})

const widgetUrl = computed(() => {
  // Use friendly URL with jurisdiction slug
  let path = '/widget'
  
  if (selectedJurisdiction.value) {
    path += `/${selectedJurisdiction.value.slug}`
  }
  
  return `${siteUrl.value}${path}`
})

const iframeCode = computed(() => {
  const width = widgetWidth.value
  const height = widgetHeight.value.includes('px') ? widgetHeight.value : `${widgetHeight.value}px`
  
  return `<iframe src="${widgetUrl.value}" width="${width}" height="${height}" frameborder="0" style="border: 0;" allowfullscreen loading="lazy"></iframe>`
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(iframeCode.value)
    copiedToClipboard.value = true
    setTimeout(() => {
      copiedToClipboard.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

function handleClose() {
  emit('close')
  // Reset form after a delay to allow modal transition
  setTimeout(() => {
    selectedJurisdictionId.value = ''
    widgetWidth.value = '100%'
    widgetHeight.value = '600'
    copiedToClipboard.value = false
  }, 300)
}

// Validate height input
function validateHeight() {
  const numericValue = parseInt(widgetHeight.value.replace(/\D/g, ''))
  if (isNaN(numericValue) || numericValue < 300) {
    widgetHeight.value = '300'
  } else if (numericValue > 2000) {
    widgetHeight.value = '2000'
  } else {
    widgetHeight.value = String(numericValue)
  }
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="Gerar Código do Widget"
    max-width="3xl"
    @close="handleClose"
  >
    <div class="space-y-6">
      <!-- Introduction -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex gap-3">
          <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-sm font-semibold text-blue-900 mb-1">
              Widget de Mapa Interativo
            </h3>
            <p class="text-sm text-blue-800">
              Adicione o mapa de igrejas anglicanas ao seu site. Você pode filtrar por jurisdição e personalizar as dimensões do mapa.
            </p>
          </div>
        </div>
      </div>

      <!-- Configuration Form -->
      <div class="space-y-4">
        <!-- Jurisdiction Selection -->
        <div>
          <label for="widget-jurisdiction" class="block text-sm font-medium text-gray-700 mb-2">
            Jurisdição (opcional)
          </label>
          <select
            id="widget-jurisdiction"
            v-model="selectedJurisdictionId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">
              Todas as jurisdições
            </option>
            <option
              v-for="jurisdiction in jurisdictions"
              :key="jurisdiction.id"
              :value="jurisdiction.id"
            >
              {{ jurisdiction.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            Selecione uma jurisdição para mostrar apenas suas igrejas no mapa
          </p>
        </div>

        <!-- Dimensions -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Width -->
          <div>
            <label for="widget-width" class="block text-sm font-medium text-gray-700 mb-2">
              Largura
            </label>
            <input
              id="widget-width"
              v-model="widgetWidth"
              type="text"
              placeholder="100%"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
            <p class="mt-1 text-xs text-gray-500">
              Ex: 100%, 800px, 50vw
            </p>
          </div>

          <!-- Height -->
          <div>
            <label for="widget-height" class="block text-sm font-medium text-gray-700 mb-2">
              Altura (px)
            </label>
            <input
              id="widget-height"
              v-model="widgetHeight"
              type="number"
              min="300"
              max="2000"
              step="50"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              @blur="validateHeight"
            >
            <p class="mt-1 text-xs text-gray-500">
              Altura em pixels (300-2000)
            </p>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">
            Preview
          </label>
          <span v-if="selectedJurisdiction" class="text-xs text-gray-500">
            Mostrando: {{ selectedJurisdiction.name }}
          </span>
        </div>
        <div class="border border-gray-300 rounded-lg overflow-hidden bg-gray-50" style="height: 300px;">
          <iframe
            :src="widgetUrl"
            width="100%"
            height="100%"
            frameborder="0"
            style="border: 0;"
            loading="lazy"
          />
        </div>
      </div>

      <!-- Generated Code -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Código para copiar
        </label>
        <div class="relative">
          <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed"><code>{{ iframeCode }}</code></pre>
          <button
            type="button"
            class="absolute top-2 right-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors flex items-center gap-1.5"
            @click="copyToClipboard"
          >
            <svg v-if="!copiedToClipboard" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ copiedToClipboard ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Cole este código no HTML do seu site onde deseja que o mapa apareça.
        </p>
      </div>

      <!-- Instructions -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-gray-900 mb-2">
          Como usar:
        </h4>
        <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Configure a jurisdição e dimensões desejadas</li>
          <li>Copie o código HTML gerado acima</li>
          <li>Cole o código no HTML do seu site</li>
          <li>O mapa será exibido automaticamente!</li>
        </ol>
      </div>
    </div>

    <template #footer-actions>
      <button
        type="button"
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        @click="handleClose"
      >
        Fechar
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center gap-2"
        @click="copyToClipboard"
      >
        <svg v-if="!copiedToClipboard" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ copiedToClipboard ? 'Copiado!' : 'Copiar Código' }}
      </button>
    </template>
  </BaseModal>
</template>
