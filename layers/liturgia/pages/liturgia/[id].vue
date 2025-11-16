<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>

      <div v-else-if="service">
        <!-- Header with actions -->
        <div class="mb-8 flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              {{ service.liturgical_week || 'Culto' }}
            </h1>
            <p class="text-gray-600">
              {{ formatDate(service.service_date) }}
              {{ service.service_time ? `às ${service.service_time.substring(0, 5)}` : '' }}
            </p>
            <div class="mt-2">
              <span
                v-if="service.is_published"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
              >
                Publicado
              </span>
              <span
                v-else
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
              >
                Rascunho
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="handleEdit"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>

            <button
              class="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="handleDuplicate"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicar
            </button>

            <button
              class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              @click="handleGenerateDoc"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Gerar Documento
            </button>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-sm">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Tempo Litúrgico</h3>
            <p class="text-lg font-semibold text-gray-900">{{ service.liturgical_season }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Cor Litúrgica</h3>
            <div class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded border border-gray-300"
                :class="getLiturgicalColorClass(service.liturgical_color || 'Verde')"
              />
              <p class="text-lg font-semibold text-gray-900">{{ service.liturgical_color }}</p>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Tipo de Culto</h3>
            <p class="text-lg font-semibold text-gray-900">
              {{ service.service_type?.name || '-' }}
            </p>
          </div>
        </div>

        <!-- Escala -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Escala de Ministérios</h2>

          <div class="space-y-3">
            <div
              v-for="schedule in service.schedules"
              :key="schedule.id"
              class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ schedule.ministry?.name }}</p>
                <p class="text-sm text-gray-600">{{ schedule.person?.name }}</p>
              </div>

              <div class="flex items-center gap-2">
                <span
                  v-if="schedule.confirmed"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Confirmado
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  Pendente
                </span>

                <span
                  v-if="schedule.notified"
                  class="text-xs text-gray-500"
                  title="Notificado"
                >
                  ✓ Notificado
                </span>
              </div>
            </div>

            <div v-if="!service.schedules || service.schedules.length === 0" class="text-center py-8 text-gray-500">
              Nenhum ministério escalado ainda
            </div>
          </div>

          <div class="mt-6 flex gap-4">
            <button
              @click="handleSendNotifications"
              :disabled="sendingNotifications"
              class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {{ sendingNotifications ? 'Enviando...' : 'Enviar Notificações WhatsApp' }}
            </button>
          </div>
        </div>

        <!-- Leituras -->
        <div v-if="service.readings" class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Leituras</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="service.readings.old_testament">
              <p class="text-sm font-medium text-gray-500">Antigo Testamento</p>
              <p class="text-gray-900">{{ service.readings.old_testament }}</p>
            </div>
            <div v-if="service.readings.psalm">
              <p class="text-sm font-medium text-gray-500">Salmo</p>
              <p class="text-gray-900">{{ service.readings.psalm }}</p>
            </div>
            <div v-if="service.readings.epistle">
              <p class="text-sm font-medium text-gray-500">Epístola</p>
              <p class="text-gray-900">{{ service.readings.epistle }}</p>
            </div>
            <div v-if="service.readings.gospel">
              <p class="text-sm font-medium text-gray-500">Evangelho</p>
              <p class="text-gray-900">{{ service.readings.gospel }}</p>
            </div>
          </div>
        </div>

        <!-- Músicas -->
        <div v-if="service.songs && service.songs.length > 0" class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Músicas</h2>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(song, index) in service.songs" :key="index" class="text-gray-900">
              {{ song }}
            </li>
          </ul>
        </div>

        <!-- Avisos -->
        <div v-if="service.notices && service.notices.length > 0" class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Avisos</h2>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(notice, index) in service.notices" :key="index" class="text-gray-900">
              {{ notice }}
            </li>
          </ul>
        </div>

        <!-- Coleta -->
        <div v-if="service.collect_text" class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Coleta</h2>
          <p class="text-gray-900 italic">{{ service.collect_text }}</p>
        </div>

        <!-- Observações -->
        <div v-if="service.notes" class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Observações</h2>
          <p class="text-gray-700">{{ service.notes }}</p>
        </div>
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        Culto não encontrado
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyService } from '../types'
import { getLiturgicalColorClass } from '../utils/liturgical-calendar'

const route = useRoute()
const { sendNotifications } = useLiturgyServices()

const service = ref<LiturgyService | null>(null)
const loading = ref(true)
const sendingNotifications = ref(false)

const loadService = async () => {
  loading.value = true
  try {
    const id = route.params.id as string
    service.value = await $fetch<LiturgyService>(`/api/liturgy/services/${id}`)
  } catch (error) {
    console.error('Error loading service:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleEdit = () => {
  const id = route.params.id as string
  navigateTo(`/liturgia/editar/${id}`)
}

const handleGenerateDoc = async () => {
  try {
    const id = route.params.id as string
    const url = `/api/liturgy/services/${id}/generate`

    // Abrir em nova aba para download
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'docx' })
    })

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `liturgia-${service.value?.service_date}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Error generating document:', error)
    alert('Erro ao gerar documento')
  }
}

const handleDuplicate = async () => {
  const newDate = prompt('Digite a nova data para o culto duplicado (formato: AAAA-MM-DD):')

  if (!newDate) return

  // Validate date format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(newDate)) {
    alert('Data inválida. Use o formato AAAA-MM-DD (ex: 2024-12-25)')
    return
  }

  try {
    const id = route.params.id as string
    const { duplicateService } = useLiturgyServices()

    const newService = await duplicateService(id, newDate)

    if (confirm('Culto duplicado com sucesso! Deseja ir para o novo culto?')) {
      navigateTo(`/liturgia/${newService.id}`)
    }
  } catch (error) {
    console.error('Error duplicating service:', error)
    alert('Erro ao duplicar culto. Por favor, tente novamente.')
  }
}

const handleSendNotifications = async () => {
  if (!confirm('Enviar notificações WhatsApp para todas as pessoas escaladas?')) {
    return
  }

  sendingNotifications.value = true
  try {
    const id = route.params.id as string
    await sendNotifications(id)
    alert('Notificações enviadas com sucesso!')
    await loadService() // Reload to update notification status
  } catch (error) {
    console.error('Error sending notifications:', error)
    alert('Erro ao enviar notificações. Por favor, tente novamente.')
  } finally {
    sendingNotifications.value = false
  }
}

onMounted(() => {
  loadService()
})

useHead({
  title: computed(() => `${service.value?.liturgical_week || 'Culto'} - Liturgia - Caminho Anglicano`)
})
</script>
