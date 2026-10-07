<template>
  <span
    v-if="status !== 'confirmed'"
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="status === 'contested' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-stone-100 text-stone-600 ring-1 ring-stone-200'"
    :title="status === 'contested' ? 'As fontes divergem; veja as versões abaixo.' : 'Sustentado por uma única fonte secundária ou testemunho.'"
  >{{ STATUS_LABEL[status] }}</span>
</template>

<script setup lang="ts">
import { STATUS_LABEL } from '../../lib/labels'

defineProps<{ status: keyof typeof STATUS_LABEL }>()
</script>
