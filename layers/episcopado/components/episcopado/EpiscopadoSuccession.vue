<template>
  <div>
    <ol class="flex flex-col">
      <li v-for="(s, i) in steps" :key="s.person.id" class="flex flex-col items-start">
        <div
          class="flex w-full max-w-md items-center gap-3 rounded-xl border px-3.5 py-2.5"
          :class="i === 0 ? 'border-amber-300 bg-amber-50/60' : 'border-stone-200 bg-white'"
        >
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold tabular-nums text-stone-600" aria-hidden="true">{{ i }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-stone-900">
              <NuxtLink v-if="i > 0" :to="`/episcopado/pessoa/${s.person.id}`" class="ep-link">{{ s.person.name }}</NuxtLink>
              <template v-else>{{ s.person.name }}</template>
            </p>
            <p class="text-xs text-stone-500">
              <template v-if="s.date">sagrado em {{ formatDate(s.date) }}</template>
              <template v-else>data da sagração não registrada</template>
            </p>
          </div>
          <EpiscopadoStatus v-if="s.status" :status="s.status" :show-confirmed="false" />
        </div>
        <!-- Conector: "sagrado por" -->
        <div v-if="i < steps.length - 1" class="ml-6 flex h-9 items-center gap-2 text-[11px] uppercase tracking-wide text-stone-400" aria-hidden="true">
          <span class="h-full w-px bg-stone-300" />
          <span>sagrado por</span>
        </div>
      </li>
    </ol>

    <p class="mt-4 flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
      <svg class="mt-0.5 h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" /></svg>
      <span>
        <template v-if="end === 'unknown_consecrator'">A linha para em <strong>{{ last }}</strong>: o sagrante dessa pessoa ainda não foi registrado na base.</template>
        <template v-else-if="end === 'no_episcopate'">A linha para em <strong>{{ last }}</strong>: a sagração dessa pessoa ainda não foi registrada.</template>
        <template v-else-if="end === 'cycle'">A linha encontrou um ciclo nos dados e foi interrompida.</template>
        <template v-else>Linha completa até o ponto mais antigo registrado.</template>
        A cadeia segue só os sagrantes principais; os co-sagrantes aparecem em cada ficha.
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '../../lib/labels'
import type { PersonView, SuccessionStep } from '../../lib/views'

/** Linha de sucessão: da pessoa até o sagrante principal mais antigo conhecido. */
const props = defineProps<{ steps: SuccessionStep[]; end: PersonView['successionEnd'] }>()

const last = computed(() => props.steps[props.steps.length - 1]?.person.name ?? '')
</script>
