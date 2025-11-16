<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            Pessoas
          </h1>
          <p class="text-gray-600">
            Gerencie as pessoas que podem ser escaladas para ministérios
          </p>
        </div>

        <button
          @click="showAddModal = true"
          class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Pessoa
        </button>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome ou email..."
          class="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >

        <select
          v-model="filterOrdained"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Todos</option>
          <option value="ordained">Ordenados</option>
          <option value="lay">Leigos</option>
        </select>

        <select
          v-model="filterActive"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
          <option value="">Todos</option>
        </select>
      </div>

      <!-- People list -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contato
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="person in filteredPeople" :key="person.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ person.name }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ person.email || '-' }}</div>
                <div class="text-sm text-gray-500">{{ person.whatsapp || person.phone || '-' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="person.is_active"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Ativo
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  Inativo
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="person.is_ordained"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  Ordenado
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  Leigo
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="editPerson(person)"
                  class="text-purple-600 hover:text-purple-900 mr-4"
                >
                  Editar
                </button>
                <button
                  @click="confirmDelete(person)"
                  class="text-red-600 hover:text-red-900"
                >
                  Excluir
                </button>
              </td>
            </tr>

            <tr v-if="filteredPeople.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                Nenhuma pessoa encontrada
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Modal -->
      <LiturgyPersonModal
        v-if="showAddModal || editingPerson"
        :person="editingPerson"
        @close="closeModal"
        @save="handleSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiturgyPerson } from '../types'

const { people, fetchPeople, deletePerson } = useLiturgyPeople()

const searchQuery = ref('')
const filterOrdained = ref('')
const filterActive = ref('true')
const showAddModal = ref(false)
const editingPerson = ref<LiturgyPerson | null>(null)

const filteredPeople = computed(() => {
  let filtered = [...people.value]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query)
    )
  }

  // Ordained filter
  if (filterOrdained.value === 'ordained') {
    filtered = filtered.filter(p => p.is_ordained)
  } else if (filterOrdained.value === 'lay') {
    filtered = filtered.filter(p => !p.is_ordained)
  }

  // Active filter
  if (filterActive.value !== '') {
    const active = filterActive.value === 'true'
    filtered = filtered.filter(p => p.is_active === active)
  }

  return filtered
})

const editPerson = (person: LiturgyPerson) => {
  editingPerson.value = { ...person }
}

const confirmDelete = async (person: LiturgyPerson) => {
  if (confirm(`Tem certeza que deseja excluir ${person.name}?`)) {
    await deletePerson(person.id)
    await fetchPeople()
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingPerson.value = null
}

const handleSave = async () => {
  await fetchPeople()
  closeModal()
}

onMounted(async () => {
  await fetchPeople()
})

useHead({
  title: 'Gerenciar Pessoas - Liturgia - Caminho Anglicano'
})
</script>
