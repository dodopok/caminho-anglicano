<script setup lang="ts">
// A book's cover, edge to edge in whatever holds it. Without a cover (or if
// it fails to load) the book's name stands in its place on the paper tone.
const props = withDefaults(defineProps<{
  src?: string | null
  name: string
  mini?: boolean
  decorative?: boolean
}>(), { src: null, mini: false, decorative: false })

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<template>
  <img
    v-if="src && !failed"
    class="op-cover"
    :class="{ 'op-cover--mini': mini }"
    :src="src"
    :alt="decorative ? '' : `Capa do ${name}`"
    @error="failed = true"
  >
  <div v-else class="op-cover op-cover--blank" :class="{ 'op-cover--mini': mini }" :aria-hidden="decorative || undefined">
    <span v-if="!mini">{{ name }}</span>
  </div>
</template>
