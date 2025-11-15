<template>
  <div ref="dropdownContainer" class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <button
      type="button"
      :class="buttonClass"
      class="w-full px-3 py-2 text-sm border rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-left flex items-center justify-between transition-colors"
      @click.stop="toggleDropdown"
    >
      <span class="flex items-center gap-2">
        <span
          v-if="selectedJurisdiction"
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: selectedJurisdiction.color }"
        />
        <span>{{ selectedJurisdiction ? selectedJurisdiction.name : 'Todas' }}</span>
      </span>
      <svg
        class="w-4 h-4 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto"
      >
        <button
          type="button"
          class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
          :class="{ 'bg-gray-50 font-medium': !modelValue }"
          @click="selectJurisdiction(null)"
        >
          <span>Todas</span>
        </button>
        <button
          v-for="jurisdiction in jurisdictions"
          :key="jurisdiction.id"
          type="button"
          class="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
          :class="{ 'bg-gray-50 font-medium': modelValue === jurisdiction.id }"
          @click="selectJurisdiction(jurisdiction.id)"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: jurisdiction.color }"
          />
          <span>{{ jurisdiction.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Jurisdiction {
  id: string
  name: string
  color: string
  fullName?: string
}

interface Props {
  modelValue?: string | null
  jurisdictions: readonly Jurisdiction[]
  label?: string
  buttonClass?: string
}

interface Emits {
  (e: 'update:modelValue', value: string | null): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: 'Filtrar por jurisdição',
  buttonClass: 'border-gray-300'
})

const emit = defineEmits<Emits>()

const dropdownContainer = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const selectedJurisdiction = computed(() => {
  if (!props.modelValue) return null
  return props.jurisdictions.find(j => j.id === props.modelValue) || null
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectJurisdiction = (id: string | null) => {
  emit('update:modelValue', id)
  isOpen.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
