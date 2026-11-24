<script setup lang="ts">
// The prayer book code (loc_2015) as a small badge beside its name, so the
// code stays findable without reading as part of the sentence.
defineProps<{ code?: string | null }>()
</script>

<template>
  <span v-if="code" class="op-loc">{{ code }}</span>
</template>
