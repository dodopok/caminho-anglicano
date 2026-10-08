<template>
  <ol class="relative ml-3.5 border-l-2 border-ep-garnet-line">
    <li v-for="(o, i) in ordinations" :key="i" class="relative pb-8 pl-7 last:pb-0 sm:pl-9">
      <!-- Marcador: D / P / B -->
      <span
        class="absolute -left-[15px] top-0 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-ep-card ring-4 ring-ep-card"
        :class="MARK[o.order]"
        aria-hidden="true"
      >{{ ORDER_SHORT[o.order] }}</span>

      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 class="font-ep-serif text-[21px] font-semibold text-ep-ink">{{ ORDER_LABEL[o.order] }}</h3>
        <span v-if="o.office" class="text-[13px] text-ep-body">({{ OFFICE_LABEL[o.office] }})</span>
        <span v-if="o.mode && o.mode !== 'normal'" class="rounded-ep bg-ep-line-2 px-1.5 text-xs text-ep-body">{{ MODE_LABEL[o.mode] }}</span>
        <EpiscopadoStatus :status="o.status" />
        <EpiscopadoCites :cites="o.cites" />
      </div>
      <p class="mt-0.5 text-sm font-medium text-ep-ink-3">
        <time v-if="o.date">{{ formatDate(o.date) }}</time>
        <span v-else class="font-normal text-ep-faint">data não registrada</span>
      </p>

      <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-ep-ink-3">
        <template v-if="o.order === 'episcopate'">
          <dt class="text-ep-muted">Sagrante</dt>
          <dd>
            <NuxtLink v-if="o.principalConsecrator" :to="link.person(o.principalConsecrator.id)" class="ep-link font-medium">{{ o.principalConsecrator.name }}</NuxtLink>
            <span v-else class="text-ep-faint">não registrado</span>
          </dd>
          <template v-if="o.coConsecrators.length">
            <dt class="text-ep-muted">Co-sagrantes</dt>
            <dd>
              <template v-for="(c, k) in o.coConsecrators" :key="c.id">
                <NuxtLink :to="link.person(c.id)" class="ep-link">{{ c.name }}</NuxtLink><span v-if="k < o.coConsecrators.length - 1">, </span>
              </template>
            </dd>
          </template>
        </template>
        <template v-else>
          <dt class="text-ep-muted">Ordenante</dt>
          <dd>
            <NuxtLink v-if="o.ordainedBy" :to="link.person(o.ordainedBy.id)" class="ep-link font-medium">{{ o.ordainedBy.name }}</NuxtLink>
            <span v-else class="text-ep-faint">não registrado</span>
          </dd>
        </template>
        <template v-if="o.jurisdiction">
          <dt class="text-ep-muted">Jurisdição</dt>
          <dd><NuxtLink :to="link.jurisdiction(o.jurisdiction.id)" class="ep-link">{{ o.jurisdiction.name }}</NuxtLink></dd>
        </template>
        <template v-if="o.place">
          <dt class="text-ep-muted">Local</dt>
          <dd>{{ o.place }}</dd>
        </template>
      </dl>

      <details v-if="o.notes" class="mt-2 text-sm">
        <summary class="cursor-pointer text-ep-muted hover:text-ep-ink">Notas de pesquisa</summary>
        <p class="mt-1 whitespace-pre-line rounded-ep bg-ep-paper px-3 py-2 text-ep-body">{{ o.notes }}</p>
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
const MARK = { diaconate: 'bg-slate-400', presbyterate: 'bg-slate-600', episcopate: 'bg-ep-garnet' } as const

const link = useEpiscopadoNodeLink()
const MODE_LABEL = { normal: 'normal', conditional: 'sub conditione', reordination: 'reordenação' } as const
</script>
