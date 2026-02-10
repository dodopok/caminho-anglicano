<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo'
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue'
})

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  pink: 'from-pink-500 to-pink-600',
  indigo: 'from-indigo-500 to-indigo-600'
}

const iconBgClasses = {
  blue: 'bg-white/20',
  green: 'bg-white/20',
  purple: 'bg-white/20',
  orange: 'bg-white/20',
  pink: 'bg-white/20',
  indigo: 'bg-white/20'
}
</script>

<template>
  <div
    class="rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 text-white transform hover:scale-105 transition-transform bg-gradient-to-br"
    :class="colorClasses[color]"
  >
    <div class="flex items-center justify-between gap-2 sm:gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-white/80 text-xs sm:text-sm font-medium mb-1">{{ title }}</p>
        <p class="text-2xl sm:text-3xl lg:text-4xl font-bold truncate">{{ value }}</p>
        <p v-if="subtitle" class="text-white/70 text-xs sm:text-sm mt-1 sm:mt-2 truncate">{{ subtitle }}</p>
      </div>
      <div v-if="icon" class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center" :class="iconBgClasses[color]">
        <div class="text-2xl sm:text-3xl lg:text-4xl">{{ icon }}</div>
      </div>
    </div>
  </div>
</template>
