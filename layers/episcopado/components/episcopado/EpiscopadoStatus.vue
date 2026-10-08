<template>
  <EpiscopadoTip v-if="status !== 'confirmed' || showConfirmed" :title="STATUS_LABEL[status]" :text="STATUS_DESCRIPTION[status]">
    <span
      class="inline-flex items-center rounded-ep border px-[5px] py-px align-middle font-ep-mono text-[10px] uppercase leading-4 tracking-[.06em] whitespace-nowrap cursor-help"
      :class="STATUS_STYLE[status].badge"
    >{{ STATUS_LABEL[status] }}
    </span>
  </EpiscopadoTip>
</template>

<script setup lang="ts">
import { STATUS_DESCRIPTION, STATUS_LABEL } from '../../lib/labels'
import { STATUS_STYLE } from '../../lib/style'

/** Selo de status de uma afirmação, com explicação ao passar o mouse ou focar. */
withDefaults(defineProps<{ status: keyof typeof STATUS_LABEL; showConfirmed?: boolean }>(), { showConfirmed: true })
</script>
