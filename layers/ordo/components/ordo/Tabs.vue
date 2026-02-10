<script setup lang="ts">
interface Tab {
  id: string
  label: string
  icon?: string
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="bg-white rounded-lg sm:rounded-xl shadow-md border border-slate-200 overflow-hidden">
    <div class="flex overflow-x-auto scrollbar-hide -mb-px">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 min-w-fit px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-xs sm:text-sm font-semibold transition-all border-b-2 whitespace-nowrap"
        :class="[
          activeTab === tab.id
            ? 'text-blue-600 border-blue-600 bg-blue-50'
            : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
        ]"
      >
        <span class="hidden sm:inline">
          <span v-if="tab.icon" class="mr-2">{{ tab.icon }}</span>
          {{ tab.label }}
        </span>
        <span class="sm:hidden">{{ tab.icon }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
