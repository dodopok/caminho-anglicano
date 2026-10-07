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

    <!-- Linha alternativa: quando a principal para, outro caminho pode ir mais longe. -->
    <div v-if="alt && alt.length > 1" class="mt-6 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
      <p class="text-sm text-stone-700">
        Por outros sagrantes, a linha chega a <strong>{{ alt[alt.length - 1].person.name }}</strong>
        <template v-if="alt[alt.length - 1].date">({{ formatDate(alt[alt.length - 1].date) }})</template>
        em {{ alt.length - 1 }} passos:
      </p>
      <ol class="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
        <li v-for="(s, i) in alt" :key="s.person.id" class="flex items-center gap-1.5">
          <span v-if="i > 0" class="text-xs text-stone-400" :title="s.via === 'co' ? 'como co-sagrante' : 'como sagrante principal'">
            ← <span v-if="s.via === 'co'" class="rounded bg-teal-100 px-1 text-[10px] font-medium uppercase tracking-wide text-teal-800">co</span>
          </span>
          <NuxtLink v-if="i > 0" :to="`/episcopado/pessoa/${s.person.id}`" class="ep-link">{{ s.person.name }}</NuxtLink>
          <span v-else class="font-medium text-stone-900">{{ s.person.name }}</span>
          <span v-if="s.date && i > 0" class="text-xs text-stone-400">{{ s.date.slice(0, 4) }}</span>
          <EpiscopadoStatus v-if="s.status && i > 0" :status="s.status" :show-confirmed="false" />
        </li>
      </ol>
      <p class="mt-2 text-xs text-stone-500"><span class="rounded bg-teal-100 px-1 font-medium uppercase text-teal-800">co</span> = a ligação é por co-sagração; os demais passos são por sagrante principal.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '../../lib/labels'
import type { PersonView, SuccessionStep } from '../../lib/views'

/** Linha de sucessão: da pessoa até o sagrante principal mais antigo conhecido. */
const props = defineProps<{ steps: SuccessionStep[]; end: PersonView['successionEnd']; alt?: SuccessionStep[] }>()

const last = computed(() => props.steps[props.steps.length - 1]?.person.name ?? '')
</script>
