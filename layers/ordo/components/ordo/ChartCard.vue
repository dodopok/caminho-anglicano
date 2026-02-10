<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
  iconColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'blue'
})

const iconBgClasses: Record<string, string> = {
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  purple: 'bg-purple-100',
  orange: 'bg-orange-100',
  pink: 'bg-pink-100',
  indigo: 'bg-indigo-100'
}

const iconTextClasses: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  pink: 'text-pink-600',
  indigo: 'text-indigo-600'
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
    <div class="flex items-center mb-6">
      <div
        v-if="icon"
        class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
        :class="iconBgClasses[iconColor]"
      >
        <div class="text-2xl" :class="iconTextClasses[iconColor]">{{ icon }}</div>
      </div>
      <div>
        <h2 class="text-xl font-bold text-slate-900">{{ title }}</h2>
        <p v-if="description" class="text-sm text-slate-600 mt-1">{{ description }}</p>
      </div>
    </div>
    <slot />
  </div>
</template>
