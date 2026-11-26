<script setup lang="ts">
// Placeholder while the Áudio redesign is built: the old panel.
import OrdoAudioOperationsPanel from './AudioOperationsPanel.vue'
import type { DashboardAudio } from '../../types/dashboard'

defineProps<{ reloadKey: number }>()
defineEmits<{ summary: [summary: DashboardAudio | null] }>()
</script>

<template>
  <OrdoAudioOperationsPanel />
</template>
