<template>
  <ol class="relative ml-3 border-l-2 border-amber-200 sm:ml-4">
    <li v-for="(o, i) in ordinations" :key="i" class="relative pb-8 pl-7 last:pb-0 sm:pl-9">
      <!-- Marcador: D / P / B -->
      <span
        class="absolute -left-[15px] top-0 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-4 ring-white"
        :class="MARK[o.order]"
        aria-hidden="true"
      >{{ ORDER_SHORT[o.order] }}</span>

      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 class="font-serif text-xl font-semibold text-stone-900">{{ ORDER_LABEL[o.order] }}</h3>
        <span v-if="o.office" class="text-sm text-stone-600">({{ OFFICE_LABEL[o.office] }})</span>
        <span v-if="o.mode && o.mode !== 'normal'" class="rounded bg-stone-100 px-1.5 text-xs text-stone-600">{{ MODE_LABEL[o.mode] }}</span>
        <EpiscopadoStatus :status="o.status" />
        <EpiscopadoCites :cites="o.cites" />
      </div>
      <p class="mt-0.5 text-sm font-medium text-stone-700">
        <time v-if="o.date">{{ formatDate(o.date) }}</time>
        <span v-else class="font-normal text-stone-400">data não registrada</span>
      </p>

      <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-stone-700">
        <template v-if="o.order === 'episcopate'">
          <dt class="text-stone-500">Sagrante</dt>
          <dd>
            <NuxtLink v-if="o.principalConsecrator" :to="`/episcopado/pessoa/${o.principalConsecrator.id}`" class="ep-link font-medium">{{ o.principalConsecrator.name }}</NuxtLink>
            <span v-else class="text-stone-400">não registrado</span>
          </dd>
          <template v-if="o.coConsecrators.length">
            <dt class="text-stone-500">Co-sagrantes</dt>
            <dd>
              <template v-for="(c, k) in o.coConsecrators" :key="c.id">
                <NuxtLink :to="`/episcopado/pessoa/${c.id}`" class="ep-link">{{ c.name }}</NuxtLink><span v-if="k < o.coConsecrators.length - 1">, </span>
              </template>
            </dd>
          </template>
        </template>
        <template v-else>
          <dt class="text-stone-500">Ordenante</dt>
          <dd>
            <NuxtLink v-if="o.ordainedBy" :to="`/episcopado/pessoa/${o.ordainedBy.id}`" class="ep-link font-medium">{{ o.ordainedBy.name }}</NuxtLink>
            <span v-else class="text-stone-400">não registrado</span>
          </dd>
        </template>
        <template v-if="o.jurisdiction">
          <dt class="text-stone-500">Jurisdição</dt>
          <dd><NuxtLink :to="`/episcopado/jurisdicao/${o.jurisdiction.id}`" class="ep-link">{{ o.jurisdiction.name }}</NuxtLink></dd>
        </template>
        <template v-if="o.place">
          <dt class="text-stone-500">Local</dt>
          <dd>{{ o.place }}</dd>
        </template>
      </dl>

      <details v-if="o.notes" class="mt-2 text-sm">
        <summary class="cursor-pointer text-stone-500 hover:text-stone-800">Notas de pesquisa</summary>
        <p class="mt-1 whitespace-pre-line rounded-md bg-stone-50 px-3 py-2 text-stone-600">{{ o.notes }}</p>
      </details>
      <EpiscopadoDiscrepancies :items="o.discrepancies" />
    </li>
  </ol>
</template>

<script setup lang="ts">
import { OFFICE_LABEL, ORDER_LABEL, formatDate } from '../../lib/labels'
import type { OrdinationView } from '../../lib/views'

/** Linha do tempo das ordenações de uma pessoa (diaconato → presbiterato → episcopado). */
defineProps<{ ordinations: OrdinationView[] }>()

const ORDER_SHORT = { diaconate: 'D', presbyterate: 'P', episcopate: 'B' } as const
const MARK = { diaconate: 'bg-slate-400', presbyterate: 'bg-slate-600', episcopate: 'bg-amber-700' } as const
const MODE_LABEL = { normal: 'normal', conditional: 'sub conditione', reordination: 'reordenação' } as const
</script>
