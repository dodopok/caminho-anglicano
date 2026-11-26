<script setup lang="ts">
import type { FlagTextLine } from '../../composables/useFlagActions'

// One sentence of a confirmation, with its bold numbers and keys, drawn as
// text (never as HTML: names and descriptions come from the API).
defineProps<{ line: FlagTextLine }>()
</script>

<template>
  <template v-for="(part, index) in line" :key="index">
    <b v-if="typeof part === 'object' && 'strong' in part">{{ part.strong }}</b>
    <code v-else-if="typeof part === 'object' && 'mono' in part" class="op-mono">{{ part.mono }}</code>
    <template v-else>{{ part }}</template>
  </template>
</template>
