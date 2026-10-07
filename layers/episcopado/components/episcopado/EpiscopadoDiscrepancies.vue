<template>
  <div v-if="items.length" class="mt-2 rounded-lg bg-red-50/60 border border-red-100 px-3 py-2 text-sm text-stone-700">
    <p class="font-medium text-red-800">Versões divergentes</p>
    <ul class="mt-1 space-y-0.5">
      <li v-for="(d, i) in items" :key="i">
        {{ FIELD_LABEL[d.field] ?? d.field }}:
        <template v-if="d.refs?.length">{{ d.refs.map((r) => r.name).join(', ') }}</template>
        <template v-else>{{ display(d.value) }}</template>
        <EpiscopadoCites :cites="d.cites" />
        <span v-if="d.notes" class="text-stone-500"> — {{ d.notes }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '../../lib/labels'
import type { DiscrepancyView } from '../../lib/views'

defineProps<{ items: DiscrepancyView[] }>()

const FIELD_LABEL: Record<string, string> = {
  date: 'data',
  start: 'início',
  end: 'fim',
  place: 'local',
  jurisdiction: 'jurisdição',
  principal_consecrator: 'sagrante principal',
  co_consecrators: 'co-sagrantes',
  ordained_by: 'ordenante',
  office: 'cargo',
  led_by: 'liderada por'
}

function display(value: DiscrepancyView['value']): string {
  if (value === null) return 'não informado'
  const list = Array.isArray(value) ? value : [value]
  return list.map((v) => (/^(c\.)?\d{4}/.test(v) ? formatDate(v) : v)).join(', ')
}
</script>
