<template>
  <div v-if="items.length" class="mt-3 rounded-lg border border-red-100 bg-red-50/60 px-3.5 py-3 text-sm text-stone-700">
    <p class="flex items-center gap-1.5 font-semibold text-red-800">
      <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
      As fontes divergem
    </p>
    <p class="mt-1 text-xs text-stone-600">
      A versão acima é a mais bem sustentada. Outras fontes registram {{ items.length === 1 ? 'esta variante' : 'estas variantes' }}; cada uma tem suas próprias notas.
    </p>
    <ul class="mt-2 space-y-1.5">
      <li v-for="(d, i) in items" :key="i" class="flex flex-wrap items-baseline gap-x-1.5">
        <span class="rounded bg-white/80 px-1.5 py-0.5 text-xs font-medium text-red-900 ring-1 ring-red-100">{{ FIELD_LABEL[d.field] ?? d.field }}</span>
        <span class="font-medium text-stone-900">
          <template v-if="d.refs?.length">
            <template v-for="(r, k) in d.refs" :key="r.id">
              <NuxtLink :to="refRoute(d.field, r.id)" class="ep-link">{{ r.name }}</NuxtLink><span v-if="k < d.refs.length - 1">, </span>
            </template>
          </template>
          <template v-else>{{ display(d.value) }}</template>
        </span>
        <EpiscopadoCites :cites="d.cites" />
        <span v-if="d.notes" class="basis-full text-xs text-stone-500">{{ d.notes }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { FIELD_LABEL, formatDate } from '../../lib/labels'
import type { DiscrepancyView } from '../../lib/views'

defineProps<{ items: DiscrepancyView[] }>()

const PERSON_FIELDS = new Set(['ordained_by', 'principal_consecrator', 'co_consecrators', 'led_by'])

function refRoute(field: string, id: string): string {
  return PERSON_FIELDS.has(field) ? `/episcopado/pessoa/${id}` : `/episcopado/jurisdicao/${id}`
}

function display(value: DiscrepancyView['value']): string {
  if (value === null) return 'não informado'
  const list = Array.isArray(value) ? value : [value]
  return list.map((v) => (/^(c\.)?\d{4}/.test(v) ? formatDate(v) : v)).join(', ')
}
</script>
