<script setup lang="ts">
import type { Church } from '../types/church'

const props = defineProps<{
  church: Church
  /** Mostra a cidade no card (útil em listas que misturam cidades) */
  showCity?: boolean
}>()

const color = computed(() => props.church.jurisdiction?.color || '#94a3b8')
const jurisdictionName = computed(() => props.church.jurisdiction?.name || 'Independente')
const to = computed(() =>
  `/igrejas/${props.church.jurisdiction?.slug || 'nao-especificado'}/${props.church.slug}`
)
const nextSchedules = computed(() => (props.church.schedules || []).slice(0, 2))
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 p-5 transition-all hover:border-amber-300 hover:shadow-lg hover:shadow-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
  >
    <div class="flex items-start gap-3">
      <span
        class="mt-1.5 w-2 h-2 rounded-full shrink-0"
        :style="{ backgroundColor: color }"
        aria-hidden="true"
      />
      <h3 class="font-serif text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-amber-800 transition-colors">
        {{ church.name }}
      </h3>
    </div>

    <p class="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
      <span v-if="showCity" class="font-semibold text-slate-700">{{ church.city }} · </span>{{ church.address }}
    </p>

    <ul v-if="nextSchedules.length" class="mt-3 space-y-0.5">
      <li
        v-for="(schedule, index) in nextSchedules"
        :key="index"
        class="text-xs text-slate-500"
      >
        <span class="font-semibold text-slate-700">{{ schedule.day }}</span>
        <span v-if="schedule.time"> · {{ schedule.time }}</span>
      </li>
      <li v-if="church.schedules.length > nextSchedules.length" class="text-xs text-slate-400">
        + {{ church.schedules.length - nextSchedules.length }}
        {{ church.schedules.length - nextSchedules.length === 1 ? 'outro horário' : 'outros horários' }}
      </li>
    </ul>

    <div class="mt-auto pt-4 flex items-center justify-between gap-3">
      <span
        class="text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-lg truncate"
        :style="{ backgroundColor: color + '14', color }"
      >
        {{ jurisdictionName }}
      </span>
      <span class="text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" aria-hidden="true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </div>
  </NuxtLink>
</template>
