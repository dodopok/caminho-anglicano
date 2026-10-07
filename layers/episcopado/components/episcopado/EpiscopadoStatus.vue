<template>
  <EpiscopadoTip v-if="status !== 'confirmed' || showConfirmed" :title="STATUS_LABEL[status]" :text="STATUS_DESCRIPTION[status]">
    <span
      class="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium leading-4 ring-1 whitespace-nowrap cursor-help"
      :class="STATUS_STYLE[status].badge"
    >
      <span aria-hidden="true" class="font-bold">{{ STATUS_STYLE[status].glyph }}</span>
      <span>{{ STATUS_LABEL[status] }}</span>
    </span>
  </EpiscopadoTip>
</template>

<script setup lang="ts">
import { STATUS_DESCRIPTION, STATUS_LABEL } from '../../lib/labels'
import { STATUS_STYLE } from '../../lib/style'

/** Selo de status de uma afirmação, com explicação ao passar o mouse ou focar. */
withDefaults(defineProps<{ status: keyof typeof STATUS_LABEL; showConfirmed?: boolean }>(), { showConfirmed: true })
</script>
