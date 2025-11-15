<template>
  <div>
    <button
      :class="[
        'inline-flex items-center justify-center space-x-2 font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
        sizeClasses,
        variant === 'floating'
          ? 'fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
          : variant === 'header'
          ? 'bg-purple-600 hover:bg-purple-700 text-white'
          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
      ]"
      @click="openModal"
    >
      <span class="text-xl">☕</span>
      <span>{{ label }}</span>
    </button>

    <DonationModal
      :is-open="isModalOpen"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'floating' | 'header'
    size?: 'sm' | 'md' | 'lg'
    label?: string
  }>(),
  {
    variant: 'default',
    size: 'md',
    label: 'Apoie o Projeto'
  }
)

const isModalOpen = ref(false)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-4 py-2 text-sm'
    case 'lg':
      return 'px-8 py-4 text-lg'
    default:
      return 'px-6 py-3 text-base'
  }
})

const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}
</script>
