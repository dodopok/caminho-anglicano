<script setup lang="ts">
interface ListItem {
  label: string
  value: number
  subtitle?: string
}

interface Props {
  items: ListItem[]
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  max: 10
})

const displayItems = computed(() => props.items.slice(0, props.max))
const maxValue = computed(() => Math.max(...displayItems.value.map(i => i.value), 1))
</script>

<template>
  <div class="space-y-2 sm:space-y-3">
    <div
      v-for="(item, index) in displayItems"
      :key="index"
      class="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 sm:p-4 transition-colors border border-slate-200"
    >
      <div class="flex items-start sm:items-center gap-2 sm:gap-3">
        <div
          class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs sm:text-sm shadow"
          :class="{
            'bg-gradient-to-br from-yellow-400 to-yellow-500': index === 0,
            'bg-gradient-to-br from-slate-300 to-slate-400': index === 1,
            'bg-gradient-to-br from-orange-400 to-orange-500': index === 2,
            'bg-gradient-to-br from-blue-500 to-blue-600': index > 2
          }"
        >
          {{ index + 1 }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-900 text-sm sm:text-base truncate">{{ item.label }}</div>
          <div v-if="item.subtitle" class="text-xs text-slate-600 mt-0.5 truncate">{{ item.subtitle }}</div>
          <div class="mt-1.5 sm:mt-2">
            <div class="w-full bg-slate-200 rounded-full h-1.5 sm:h-2">
              <div
                class="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                :style="{ width: `${(item.value / maxValue) * 100}%` }"
              />
            </div>
          </div>
        </div>
        <div class="flex-shrink-0 text-right">
          <div class="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {{ item.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
