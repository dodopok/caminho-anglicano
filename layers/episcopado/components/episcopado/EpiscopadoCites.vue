<template>
  <sup v-if="cites.length" class="ml-0.5 text-[0.7em] font-medium">
    <a
      v-for="n in cites"
      :key="n"
      :href="`#nota-${n}`"
      class="text-amber-700 hover:text-amber-900 hover:underline"
    >[{{ n }}]</a>
  </sup>
</template>

<script setup lang="ts">
defineProps<{ cites: number[] }>()
</script>
