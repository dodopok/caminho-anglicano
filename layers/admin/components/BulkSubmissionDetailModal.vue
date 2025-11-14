<template>
  <BaseModal
    :is-open="isOpen"
    title="Detalhes da Submissão em Lote"
    max-width="7xl"
    :loading="isLoading"
    loading-text="Processando..."
    @close="handleClose"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">
            Detalhes da Submissão em Lote
          </h2>
          <div class="mt-1 flex items-center gap-3">
            <StatusBadge :status="submission.status" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-2"
            @click="showGoogleSearch = true"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar no Google
          </button>
          <button
            class="text-gray-400 hover:text-gray-500 transition-colors"
            @click="handleClose"
          >
            <span class="sr-only">Fechar</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <!-- Error Messages (keep only errors, remove success) -->
    <BaseAlert
      v-model="showErrorMessage"
      type="error"
      :message="errorMessage"
    />

    <!-- Bulk Data Text -->
    <div class="space-y-4">
      <!-- Format Helper -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors"
          @click.prevent="isFormatHelperOpen = !isFormatHelperOpen"
        >
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 class="text-sm font-medium text-blue-900">Formato esperado (JSON)</h4>
          </div>
          <svg
            class="h-5 w-5 text-blue-600 transition-transform"
            :class="{ 'rotate-180': isFormatHelperOpen }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div
          v-if="isFormatHelperOpen"
          class="px-4 pb-4 border-t border-blue-200"
        >
          <pre class="text-xs bg-white border border-blue-200 rounded p-3 overflow-x-auto mt-3"><code>[
  {
    "name": "Nome da Igreja",
    "jurisdiction": "ieab-recife",
    "address": "Endereço completo",
    "responsible_email": "email@exemplo.com",
    "schedules": "Domingos às 10h",
    "pastors": "Rev. Nome do Pastor",
    "description": "Descrição opcional",
    "website": "https://site.com",
    "instagram": "https://instagram.com/...",
    "youtube": "https://youtube.com/...",
    "spotify": "https://spotify.com/..."
  }
]</code></pre>
          <p class="text-xs text-blue-700 mt-2">
            <strong>Campos obrigatórios:</strong> name, jurisdiction, address, responsible_email
          </p>
        </div>
      </div>

      <!-- Side by side textareas -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Original Text from User -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📩 Texto Original do Usuário
          </label>
          <BaseTextarea
            :model-value="originalText"
            :rows="25"
            disabled
            placeholder="Texto original enviado pelo usuário..."
            class="font-mono text-sm bg-gray-50"
          />
          <p class="mt-1 text-xs text-gray-500">
            Texto original como referência
          </p>
        </div>

        <!-- Editable JSON -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">
              ✏️ JSON Formatado
            </label>
            <button
              type="button"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isValidating || submission.status !== 'pending'"
              @click="validateAndPreview"
            >
              <svg v-if="isValidating" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{{ isValidating ? 'Validando...' : '🔍 Validar' }}</span>
            </button>
          </div>
          <BaseTextarea
            v-model="bulkText"
            :rows="25"
            :disabled="submission.status !== 'pending'"
            placeholder="Cole ou edite o JSON com os dados das igrejas aqui..."
            class="font-mono text-sm"
          />
          <p class="mt-1 text-xs text-gray-500">
            Este JSON será usado para criar as igrejas
          </p>
        </div>

        <!-- Validation Result / Preview -->
        <div class="flex flex-col">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📋 Resultado da Validação
          </label>
          
          <!-- Validation Error -->
          <div v-if="validationError" class="mb-3">
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm font-medium text-red-800 mb-1">❌ Erro</p>
              <p class="text-xs text-red-700">{{ validationError }}</p>
            </div>
          </div>

          <!-- No validation yet -->
          <div v-else-if="parsedChurches.length === 0 && !isValidating" class="flex-1 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p class="mt-2 text-sm text-gray-500">Clique em Validar para verificar o JSON</p>
            </div>
          </div>

          <!-- Loading state -->
          <div v-else-if="isValidating" class="flex-1 flex items-center justify-center bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div class="text-center">
              <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p class="mt-3 text-sm font-medium text-blue-900">Validando JSON...</p>
              <p class="mt-1 text-xs text-blue-700">Processando dados</p>
            </div>
          </div>

          <!-- Preview -->
          <div v-else class="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-3 py-2">
              <p class="text-sm font-medium text-gray-900">
                {{ parsedChurches.length }} igreja{{ parsedChurches.length === 1 ? '' : 's' }}
                <span
                  class="ml-2 text-xs px-2 py-1 rounded"
                  :class="parsedChurches.every(c => c._isValid) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ parsedChurches.every(c => c._isValid) ? '✓ Todas válidas' : '⚠️ Com erros' }}
                </span>
              </p>
            </div>
            <div class="p-3 space-y-3">
              <div
                v-for="(church, index) in parsedChurches"
                :key="index"
                class="bg-white border rounded-lg p-3"
                :class="church._isValid ? 'border-green-200' : 'border-red-200'"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-sm font-medium text-gray-900">{{ index + 1 }}. {{ church.name }}</h4>
                  <span
                    class="text-xs px-2 py-0.5 rounded flex-shrink-0 ml-2"
                    :class="church._isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ church._isValid ? '✓' : '✗' }}
                  </span>
                </div>
                <dl class="space-y-1 text-xs">
                  <div>
                    <dt class="text-gray-500 inline">Jurisdição:</dt>
                    <dd class="inline ml-1 font-medium" :class="church._jurisdictionInfo?.found ? 'text-green-700' : 'text-red-700'">
                      {{ church.jurisdiction || '—' }}
                      <span v-if="church._jurisdictionInfo?.found" class="text-gray-500 font-normal ml-1">
                        ({{ church._jurisdictionInfo.fullName || church._jurisdictionInfo.name }})
                      </span>
                      <span v-else-if="church.jurisdiction" class="text-red-600 font-normal ml-1">
                        ❌ Não encontrada
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-gray-500 inline">Email:</dt>
                    <dd class="text-gray-900 inline ml-1">{{ church.responsible_email || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-gray-500">Endereço:</dt>
                    <dd class="text-gray-900">{{ church.address || '—' }}</dd>
                  </div>
                  <div v-if="church._parsedSchedules && church._parsedSchedules.length > 0">
                    <dt class="text-gray-500">Horários (formatado):</dt>
                    <dd class="text-gray-900">
                      <ul class="list-disc list-inside space-y-0.5">
                        <li v-for="(schedule, idx) in church._parsedSchedules" :key="idx">
                          <span v-if="schedule.day && schedule.time">{{ schedule.day }} às {{ schedule.time }}</span>
                          <span v-else-if="schedule.description">{{ schedule.description }}</span>
                        </li>
                      </ul>
                    </dd>
                  </div>
                  <div v-if="church._parsedPastors && church._parsedPastors.length > 0">
                    <dt class="text-gray-500">Pastores (formatado):</dt>
                    <dd class="text-gray-900">{{ church._parsedPastors.join(', ') }}</dd>
                  </div>
                  <div v-if="church.description">
                    <dt class="text-gray-500">Descrição:</dt>
                    <dd class="text-gray-900">{{ church.description }}</dd>
                  </div>
                  <div v-if="church.website">
                    <dt class="text-gray-500 inline">Website:</dt>
                    <dd class="text-gray-900 inline ml-1 truncate">{{ church.website }}</dd>
                  </div>
                  <div v-if="church.instagram">
                    <dt class="text-gray-500 inline">Instagram:</dt>
                    <dd class="text-gray-900 inline ml-1 truncate">{{ church.instagram }}</dd>
                  </div>
                  <div v-if="church.youtube">
                    <dt class="text-gray-500 inline">YouTube:</dt>
                    <dd class="text-gray-900 inline ml-1 truncate">{{ church.youtube }}</dd>
                  </div>
                  <div v-if="church.spotify">
                    <dt class="text-gray-500 inline">Spotify:</dt>
                    <dd class="text-gray-900 inline ml-1 truncate">{{ church.spotify }}</dd>
                  </div>
                  <div v-if="!church._isValid" class="pt-2 border-t border-gray-200">
                    <dt class="text-red-600 font-medium">Erros:</dt>
                    <dd class="text-red-600">{{ church._errors?.join(', ') }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Notes (for processed submissions) -->
    <div v-if="submission.status !== 'pending' && submission.review_notes" class="mt-6 pt-6 border-t border-gray-200">
      <BaseTextarea
        :model-value="submission.review_notes"
        label="Notas da Revisão"
        :rows="3"
        disabled
      />
    </div>

    <!-- Metadata -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="font-medium text-gray-500">Data da Submissão</dt>
          <dd class="mt-1 text-gray-900">
            {{ formatDate(submission.submitted_at) }}
          </dd>
        </div>
        <div v-if="submission.reviewed_at">
          <dt class="font-medium text-gray-500">Data da Revisão</dt>
          <dd class="mt-1 text-gray-900">
            {{ formatDate(submission.reviewed_at) }}
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <div class="flex justify-between w-full gap-3">
        <BaseButton
          v-if="submission.status === 'pending'"
          variant="danger"
          :loading="isLoading"
          @click="handleReject"
        >
          Rejeitar
        </BaseButton>

        <div class="flex-1" />

        <BaseButton
          variant="secondary"
          @click="handleClose"
        >
          Cancelar
        </BaseButton>

        <BaseButton
          v-if="submission.status === 'pending'"
          variant="secondary"
          :loading="isLoading"
          @click="handleApproveNoInsert"
        >
          Aprovar Sem Criar Igrejas
        </BaseButton>

        <BaseButton
          v-if="submission.status === 'pending'"
          variant="primary"
          :loading="isLoading"
          @click="handleSave"
        >
          Salvar Alterações
        </BaseButton>

        <BaseButton
          v-if="submission.status === 'pending'"
          variant="success"
          :loading="isLoading"
          @click="handleApprove"
        >
          Processar e Criar Igrejas
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <!-- Google Places Search Modal -->
  <GooglePlacesSearchModal
    :is-open="showGoogleSearch"
    @close="showGoogleSearch = false"
  />

  <BaseToast
    :show="showToast"
    :type="toastType"
    :message="toastMessage"
    @close="showToast = false"
  />
</template>

<script setup lang="ts">
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

interface Props {
  isOpen: boolean
  submission: BulkSubmission
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

const { getToken } = useAdminAuth()

const isLoading = ref(false)
const errorMessage = ref('')
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'info'>('success')
const toastMessage = ref('')
const originalText = ref('')
const bulkText = ref('')
const isValidating = ref(false)
const validationError = ref('')
const isFormatHelperOpen = ref(false)
const showGoogleSearch = ref(false)

interface ParsedSchedule {
  day?: string
  time?: string
  description?: string
}

interface ParsedChurch {
  name: string
  jurisdiction: string
  address: string
  responsible_email: string
  schedules?: string
  pastors?: string
  description?: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
  _parsedSchedules?: ParsedSchedule[]
  _parsedPastors?: string[]
  _jurisdictionInfo?: {
    found: boolean
    id?: string
    name?: string
    fullName?: string
  }
  _isValid?: boolean
  _errors?: string[]
}

const parsedChurches = ref<ParsedChurch[]>([])

interface JurisdictionData {
  id: string
  slug: string
  name: string
  fullName: string
}

const jurisdictionsCache = ref<JurisdictionData[]>([])

// Computed for alert visibility
const showErrorMessage = computed({
  get: () => !!errorMessage.value,
  set: (value: boolean) => {
    if (!value) errorMessage.value = ''
  },
})

// Watch for submission changes and load bulk_data
watch(() => props.submission, (newSubmission) => {
  if (newSubmission) {
    originalText.value = newSubmission.bulk_data || ''
    // Only set bulkText if it's empty (first load)
    if (!bulkText.value) {
      bulkText.value = newSubmission.bulk_data || ''
    }
  }
}, { immediate: true })

// Fetch jurisdictions on mount
onMounted(async () => {
  try {
    jurisdictionsCache.value = await $fetch<JurisdictionData[]>('/api/jurisdictions')
  } catch (error) {
    console.error('Error fetching jurisdictions:', error)
  }
})

// Helper functions to parse pastors and schedules (same logic as server)
function parsePastors(pastorsString: string | null): string[] {
  if (!pastorsString) return []
  
  return pastorsString
    .split(/[,;]|\se\s|\sand\s/i)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

function parseSchedules(schedulesString: string | null): ParsedSchedule[] {
  if (!schedulesString) return []
  
  return schedulesString
    .split(/[,;]|[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const match = s.match(/^(.+?)(?:\s+às\s+|\s+at\s+|\s+)(.+)$/)
      if (match) {
        return { day: match[1].trim(), time: match[2].trim() }
      }
      return { description: s }
    })
}

function findJurisdiction(jurisdictionInput: string) {
  if (!jurisdictionInput || jurisdictionsCache.value.length === 0) {
    return { found: false }
  }

  const input = jurisdictionInput.toLowerCase().trim()

  // Try exact match by slug
  const bySlug = jurisdictionsCache.value.find(j => j.slug?.toLowerCase() === input)
  if (bySlug) {
    return { found: true, id: bySlug.id, name: bySlug.name, fullName: bySlug.fullName }
  }

  // Try exact match by name
  const byName = jurisdictionsCache.value.find(j => j.name?.toLowerCase() === input)
  if (byName) {
    return { found: true, id: byName.id, name: byName.name, fullName: byName.fullName }
  }

  // Try partial match
  const partial = jurisdictionsCache.value.find(j => 
    j.name?.toLowerCase().includes(input) || 
    j.fullName?.toLowerCase().includes(input) ||
    input.includes(j.slug?.toLowerCase())
  )
  if (partial) {
    return { found: true, id: partial.id, name: partial.name, fullName: partial.fullName }
  }

  return { found: false }
}

function validateAndPreview() {
  validationError.value = ''
  parsedChurches.value = []
  isValidating.value = true

  // Add a small delay to show loading state
  setTimeout(() => {
    try {
      // Try to parse JSON
      const data = JSON.parse(bulkText.value)

      if (!Array.isArray(data)) {
        validationError.value = 'O JSON deve ser um array de igrejas'
        return
      }

      if (data.length === 0) {
        validationError.value = 'O array não pode estar vazio'
        return
      }

      // Validate each church
      parsedChurches.value = data.map((church) => {
        const errors: string[] = []
        
        if (!church.name || typeof church.name !== 'string' || church.name.trim() === '') {
          errors.push('nome obrigatório')
        }
        if (!church.jurisdiction || typeof church.jurisdiction !== 'string' || church.jurisdiction.trim() === '') {
          errors.push('jurisdição obrigatória')
        }
        if (!church.address || typeof church.address !== 'string' || church.address.trim() === '') {
          errors.push('endereço obrigatório')
        }
        if (!church.responsible_email || typeof church.responsible_email !== 'string' || church.responsible_email.trim() === '') {
          errors.push('email obrigatório')
        }

        // Validate jurisdiction only if it's filled
        const jurisdictionInfo = findJurisdiction(church.jurisdiction)
        if (church.jurisdiction && church.jurisdiction.trim() !== '' && !jurisdictionInfo.found) {
          errors.push('jurisdição não encontrada')
        }

        // Parse and validate schedules format
        const parsedSchedules = parseSchedules(church.schedules)
        
        // Parse and validate pastors format
        const parsedPastors = parsePastors(church.pastors)

        return {
          ...church,
          _parsedSchedules: parsedSchedules,
          _parsedPastors: parsedPastors,
          _jurisdictionInfo: jurisdictionInfo,
          _isValid: errors.length === 0,
          _errors: errors.length > 0 ? errors : undefined,
        }
      })

      const invalidCount = parsedChurches.value.filter(c => !c._isValid).length
      if (invalidCount > 0) {
        const invalidChurches = parsedChurches.value.filter(c => !c._isValid)
        const errorDetails = invalidChurches.map((c, idx) => 
          `${idx + 1}. ${c.name || 'Igreja sem nome'}: ${c._errors?.join(', ')}`
        ).join('\n')
        validationError.value = `${invalidCount} igreja${invalidCount === 1 ? '' : 's'} com dados inválidos:\n\n${errorDetails}`
      }
    }
    catch (error: unknown) {
      validationError.value = error instanceof Error 
        ? `Erro ao fazer parse do JSON: ${error.message}` 
        : 'Erro ao fazer parse do JSON'
    }
    finally {
      isValidating.value = false
    }
  }, 300) // 300ms delay for visual feedback
}

async function handleSave() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    if (!bulkText.value.trim()) {
      throw new Error('O texto não pode estar vazio')
    }

    await $fetch(`/api/admin/submissions/bulk/${props.submission.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        bulk_data: bulkText.value,
      },
    })

    toastType.value = 'success'
    toastMessage.value = 'Alterações salvas com sucesso!'
    showToast.value = true
  }
  catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro ao salvar alterações'
    console.error('Error saving bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleApprove() {
  // First validate
  validateAndPreview()

  // Wait for validation to complete
  await nextTick()

  if (validationError.value) {
    toastType.value = 'error'
    toastMessage.value = 'Por favor, corrija os erros de validação antes de aprovar.'
    showToast.value = true
    return
  }

  const invalidChurches = parsedChurches.value.filter(c => !c._isValid)
  if (invalidChurches.length > 0) {
    toastType.value = 'error'
    toastMessage.value = `Existem ${invalidChurches.length} igreja${invalidChurches.length === 1 ? '' : 's'} com dados inválidos. Por favor, corrija antes de aprovar.`
    showToast.value = true
    return
  }

  // Show confirmation with preview
  const churchList = parsedChurches.value
    .map((c, i) => `${i + 1}. ${c.name} - ${c.jurisdiction}`)
    .join('\n')

  const confirmed = confirm(
    `Tem certeza que deseja processar e criar as igrejas'}?`,
  )

  if (!confirmed) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    // First save any pending changes
    await handleSave()

    // Then approve
    const result = await $fetch<{ success: boolean, insertedCount: number, totalCount: number, errors?: string[], message: string }>(
      `/api/admin/submissions/bulk/${props.submission.id}/approve`,
      {
        method: 'post',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (result.errors && result.errors.length > 0) {
      toastType.value = 'info'
      toastMessage.value = `${result.message} - Alguns erros ocorreram durante o processo.`
      showToast.value = true
    }
    else {
      toastType.value = 'success'
      toastMessage.value = result.message
      showToast.value = true
    }

    setTimeout(() => {
      emit('success')
      emit('close')
    }, 2000)
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao aprovar submissão'
    errorMessage.value = message
    console.error('Error approving bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleApproveNoInsert() {
  const reason = prompt('Por que você está aprovando esta submissão sem criar igrejas? (ex: atualizações manuais já feitas)')

  if (!reason || reason.trim() === '') {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/submissions/bulk/${props.submission.id}/approve-no-insert`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        review_notes: reason,
      },
    })

    toastType.value = 'success'
    toastMessage.value = 'Submissão aprovada sem criar igrejas!'
    showToast.value = true
    setTimeout(() => {
      emit('success')
      emit('close')
    }, 2000)
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao aprovar submissão'
    errorMessage.value = message
    console.error('Error approving bulk submission without insert:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleReject() {
  const reason = prompt('Por que você está rejeitando esta submissão em lote?')

  if (!reason || reason.trim() === '') {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = await getToken()
    if (!token) {
      throw new Error('Não autenticado')
    }

    await $fetch(`/api/admin/submissions/bulk/${props.submission.id}/reject`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        review_notes: reason,
      },
    })

    emit('success')
    emit('close')
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao rejeitar submissão'
    errorMessage.value = message
    console.error('Error rejecting bulk submission:', error)
  }
  finally {
    isLoading.value = false
  }
}

function handleClose() {
  if (!isLoading.value) {
    emit('close')
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
