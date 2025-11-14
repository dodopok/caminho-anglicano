<template>
  <div class="bg-white rounded-lg shadow-sm p-12 text-center">
    <div
      class="inline-block animate-spin rounded-full border-b-2"
      :class="[sizeClass, colorClass]"
    />
    <p v-if="message" class="mt-4 text-gray-600">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'gray' | 'green' | 'red'
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Carregando...',
  size: 'md',
  color: 'blue',
})

const sizeClass = computed(() => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }
  return sizes[props.size]
})

const colorClass = computed(() => {
  const colors = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600',
  }
  return colors[props.color]
})
</script>
