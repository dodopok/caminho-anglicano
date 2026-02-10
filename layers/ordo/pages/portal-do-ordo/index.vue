<script setup lang="ts">
import type { DashboardData } from '../../types/dashboard'

definePageMeta({
  middleware: 'ordo-auth'
})

const { user, logout, loading: authLoading } = useFirebaseAuth()
const { fetchDashboard } = useOrdoApi()

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Date filters
const today = new Date()
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

const startDate = ref(thirtyDaysAgo.toISOString().split('T')[0])
const endDate = ref(today.toISOString().split('T')[0])

const loadDashboard = async () => {
  try {
    loading.value = true
    error.value = null

    if (!user.value) {
      throw new Error('Usuário não autenticado')
    }

    data.value = await fetchDashboard({
      start_date: startDate.value,
      end_date: endDate.value
    })
  } catch (err: any) {
    error.value = err.message || 'Erro ao carregar dashboard'
    console.error('Dashboard error:', err)
  } finally {
    loading.value = false
  }
}

watch(authLoading, (isLoading) => {
  if (!isLoading && user.value) {
    loadDashboard()
  }
}, { immediate: true })

// Computed values for charts
const dailyCompletionsLabels = computed(() =>
  data.value?.completions.daily_completions.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }) || []
)

const dailyCompletionsData = computed(() =>
  data.value?.completions.daily_completions.map(d => d.count) || []
)

const officeTypeLabels = computed(() =>
  Object.keys(data.value?.completions.by_office_type || {})
)

const officeTypeData = computed(() =>
  Object.values(data.value?.completions.by_office_type || {})
)

const hourlyLabels = computed(() => {
  const hours = Object.keys(data.value?.completions.by_hour || {})
  return hours.map(h => `${h}h`)
})

const hourlyData = computed(() =>
  Object.values(data.value?.completions.by_hour || {})
)

const prayerBookLabels = computed(() =>
  data.value?.prayer_books.usage_by_prayer_book.map(pb => pb.name) || []
)

const prayerBookData = computed(() =>
  data.value?.prayer_books.usage_by_prayer_book.map(pb => pb.users) || []
)

const dailyActiveLabels = computed(() =>
  data.value?.engagement.daily_active_trend.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }) || []
)

const dailyActiveData = computed(() =>
  data.value?.engagement.daily_active_trend.map(d => d.active_users) || []
)

const topStreakers = computed(() =>
  data.value?.users.top_streakers.map(s => ({
    label: s.email,
    value: s.longest_streak,
    subtitle: `Streak atual: ${s.current_streak} dias`
  })) || []
)

const topCompleters = computed(() =>
  data.value?.completions.top_completers.map(c => ({
    label: c.email,
    value: c.completions
  })) || []
)

const topWriters = computed(() =>
  data.value?.journals.top_writers.map(w => ({
    label: w.email,
    value: w.journals
  })) || []
)

const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num)
const formatPercent = (num: number) => `${num.toFixed(1)}%`
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} min`

// Tabs
const activeTab = ref('overview')
const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: '📊' },
  { id: 'users', label: 'Usuários', icon: '👥' },
  { id: 'offices', label: 'Ofícios', icon: '📿' },
  { id: 'content', label: 'Conteúdo', icon: '📚' },
  { id: 'system', label: 'Sistema', icon: '⚙️' }
]
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Header -->
    <nav class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-xl">📊</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Portal do Ordo</h1>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-medium text-slate-900">{{ user?.email }}</p>
              <p class="text-xs text-slate-600">Administrador</p>
            </div>
            <button
              @click="logout"
              class="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Sair →
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Filters -->
      <div class="bg-gradient-to-r from-white to-blue-50 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100 mb-6">
        <div class="flex flex-col sm:flex-row gap-4 items-end">
          <div class="flex-1">
            <label class="text-sm font-semibold text-slate-700 mb-2 block">Data Início</label>
            <input
              v-model="startDate"
              type="date"
              class="w-full border-2 border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <div class="flex-1">
            <label class="text-sm font-semibold text-slate-700 mb-2 block">Data Fim</label>
            <input
              v-model="endDate"
              type="date"
              class="w-full border-2 border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
            >
          </div>
          <button
            @click="loadDashboard"
            :disabled="loading"
            class="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '⏳ Carregando...' : '🔄 Atualizar' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !data" class="text-center py-20">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600" />
        <p class="mt-6 text-slate-600 font-medium">Carregando dashboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="max-w-md mx-auto mt-20">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div class="text-4xl mb-4">⚠️</div>
          <p class="text-red-700 font-medium">Erro ao carregar dados</p>
          <p class="text-red-600 text-sm mt-2">{{ error }}</p>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="data" class="space-y-6">
        <!-- Tabs -->
        <OrdoTabs v-model="activeTab" :tabs="tabs" />

        <!-- Overview Tab -->
        <div v-show="activeTab === 'overview'" class="space-y-6">
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <OrdoMetricCard
            title="Total de Usuários"
            :value="formatNumber(data.overview.total_users)"
            :subtitle="`${formatNumber(data.overview.premium_users)} premium`"
            color="blue"
            icon="👥"
          />
          <OrdoMetricCard
            title="Taxa de Conversão"
            :value="formatPercent(data.overview.premium_conversion_rate)"
            subtitle="Para Premium"
            color="green"
            icon="💎"
          />
          <OrdoMetricCard
            title="Total de Ofícios"
            :value="formatNumber(data.overview.total_completions)"
            :subtitle="`Média: ${data.overview.avg_completions_per_user.toFixed(1)}`"
            color="purple"
            icon="📿"
          />
            <OrdoMetricCard
              title="Diários Criados"
              :value="formatNumber(data.overview.total_journals)"
              color="orange"
              icon="📔"
            />
          </div>

          <!-- Engagement -->
          <div>
            <h2 class="text-2xl font-bold text-slate-900 mb-4">📈 Engajamento</h2>
            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <OrdoMetricCard
                title="DAU"
                :value="formatNumber(data.engagement.dau)"
                subtitle="Usuários Ativos Diários"
                color="pink"
                icon="🔥"
              />
              <OrdoMetricCard
                title="WAU"
                :value="formatNumber(data.engagement.wau)"
                subtitle="Usuários Ativos Semanais"
                color="indigo"
                icon="📅"
              />
              <OrdoMetricCard
                title="MAU"
                :value="formatNumber(data.engagement.mau)"
                subtitle="Usuários Ativos Mensais"
                color="blue"
                icon="📊"
              />
              <OrdoMetricCard
                title="Stickiness"
                :value="formatPercent(data.engagement.dau_wau_ratio)"
                :subtitle="`Retenção: ${formatPercent(data.engagement.wau_mau_ratio)}`"
                color="green"
                icon="🎯"
              />
            </div>
            <OrdoChartCard title="Tendência de Usuários Ativos" icon="📈" icon-color="blue">
              <OrdoLineChart
                :labels="dailyActiveLabels"
                :data="dailyActiveData"
                label="Usuários Ativos"
                color="#3b82f6"
              />
            </OrdoChartCard>
          </div>
        </div>
        <!-- End Overview Tab -->

        <!-- Users Tab -->
        <div v-show="activeTab === 'users'" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">👥 Usuários</h2>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <OrdoMetricCard
              title="Novos no Período"
              :value="formatNumber(data.users.new_users_in_period)"
              color="green"
              icon="✨"
            />
            <OrdoMetricCard
              title="Ativos (7 dias)"
              :value="formatNumber(data.users.active_last_7_days)"
              color="blue"
              icon="📅"
            />
            <OrdoMetricCard
              title="Ativos (30 dias)"
              :value="formatNumber(data.users.active_last_30_days)"
              color="purple"
              icon="📊"
            />
            <OrdoMetricCard
              title="Streak Médio"
              :value="data.users.avg_current_streak.toFixed(1)"
              :subtitle="`Maior: ${data.users.avg_longest_streak.toFixed(1)} dias`"
              color="orange"
              icon="🔥"
            />
          </div>
          <OrdoChartCard title="Top Streakers" description="Usuários com maiores sequências" icon="🏆" icon-color="orange">
            <OrdoTopList :items="topStreakers" />
          </OrdoChartCard>
        </div>
        <!-- End Users Tab -->

        <!-- Offices Tab -->
        <div v-show="activeTab === 'offices'" class="space-y-6">
          <h2 class="text-2xl font-bold text-slate-900 mb-4">📿 Ofícios Completados</h2>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
            <OrdoMetricCard
              title="Total no Período"
              :value="formatNumber(data.completions.total_in_period)"
              color="purple"
              icon="✅"
            />
            <OrdoMetricCard
              title="Duração Média"
              :value="formatDuration(data.completions.avg_duration_seconds)"
              color="indigo"
              icon="⏱️"
            />
          </div>
          <div class="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
            <OrdoChartCard title="Por Tipo de Ofício" icon="📊" icon-color="purple">
              <OrdoDoughnutChart :labels="officeTypeLabels" :data="officeTypeData" />
            </OrdoChartCard>
            <OrdoChartCard title="Por Hora do Dia" icon="🕐" icon-color="indigo">
              <OrdoBarChart :labels="hourlyLabels" :data="hourlyData" label="Completions" />
            </OrdoChartCard>
          </div>
          <div class="mb-6">
            <OrdoChartCard title="Tendência Diária" icon="📈" icon-color="green">
              <OrdoLineChart
                :labels="dailyCompletionsLabels"
                :data="dailyCompletionsData"
                label="Completions"
                color="#10b981"
              />
            </OrdoChartCard>
          </div>
          <OrdoChartCard title="Top Completers" icon="🏆" icon-color="purple">
            <OrdoTopList :items="topCompleters" />
          </OrdoChartCard>
        </div>
        <!-- End Offices Tab -->

        <!-- Content Tab -->
        <div v-show="activeTab === 'content'" class="space-y-6">
          <!-- Prayer Books -->
          <div>
            <h2 class="text-2xl font-bold text-slate-900 mb-4">📖 Livros de Oração</h2>
            <OrdoChartCard :title="`Mais usado: ${data.prayer_books.most_used.name}`" icon="📚" icon-color="blue">
              <OrdoBarChart
                :labels="prayerBookLabels"
                :data="prayerBookData"
                label="Usuários"
                horizontal
              />
            </OrdoChartCard>
          </div>

          <!-- Journals -->
          <div>
            <h2 class="text-2xl font-bold text-slate-900 mb-4">📔 Diários</h2>
            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
              <OrdoMetricCard
                title="Total no Período"
                :value="formatNumber(data.journals.total_in_period)"
                color="orange"
                icon="✍️"
              />
              <OrdoMetricCard
                title="Usuários com Diários"
                :value="formatNumber(data.journals.users_with_journals)"
                color="pink"
                icon="👥"
              />
            </div>
            <OrdoChartCard title="Top Escritores" icon="✍️" icon-color="orange">
              <OrdoTopList :items="topWriters" />
            </OrdoChartCard>
          </div>
        </div>
        <!-- End Content Tab -->

        <!-- System Tab -->
        <div v-show="activeTab === 'system'" class="space-y-6">
          <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <!-- Audio -->
          <div class="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🎵</span> Geração de Áudio
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Cobertura</span>
                <span class="font-bold text-slate-900">{{ formatPercent(data.audio.audio_coverage_percentage) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Textos com áudio</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.audio.texts_with_audio) }} / {{ formatNumber(data.audio.total_texts) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Sessões completas</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.audio.completed_sessions) }}</span>
              </div>
            </div>
          </div>

          <!-- Notifications -->
          <div class="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🔔</span> Notificações
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Total Enviadas</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.notifications.total_in_period) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Taxa de Sucesso</span>
                <span class="font-bold text-green-600">{{ formatPercent(data.notifications.success_rate) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Falharam</span>
                <span class="font-bold text-red-600">{{ formatNumber(data.notifications.failed) }}</span>
              </div>
            </div>
          </div>

          <!-- Life Rules -->
          <div class="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📜</span> Regras de Vida
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Total de Regras</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.life_rules.total_rules) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Públicas</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.life_rules.public_rules) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Adoções</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.life_rules.total_adoptions) }}</span>
              </div>
            </div>
          </div>

          <!-- Shared Offices -->
          <div class="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🔗</span> Ofícios Compartilhados
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Total Compartilhados</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.shared_offices.total_in_period) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-600">Usuários Compartilhando</span>
                <span class="font-bold text-slate-900">{{ formatNumber(data.shared_offices.unique_users_sharing) }}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
        <!-- End System Tab -->
      </div>
    </main>
  </div>
</template>
