<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="badgeClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
interface Props {
  status: 'pending' | 'approved' | 'rejected'
}

const props = defineProps<Props>()

const badgeClass = computed(() => {
  switch (props.status) {
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'approved':
      return 'Aprovado'
    case 'rejected':
      return 'Rejeitado'
    case 'pending':
    default:
      return 'Pendente'
  }
})
</script>
