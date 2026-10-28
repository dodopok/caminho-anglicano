<template>
  <div>
    <ol class="flex flex-col">
      <li v-for="(s, i) in bloco.steps" :key="`${s.id}-${i}`" class="flex flex-col items-start">
        <div v-if="i > 0 && s.via" class="ml-6 flex h-[30px] items-center gap-2 text-[10px] uppercase tracking-[.08em] text-ep-faint">
          <span class="h-full w-px bg-ep-rule" aria-hidden="true" />
          <span>{{ via(s) }}<template v-if="s.via.year"> · {{ s.via.year }}</template></span>
          <EpiscopadoStatus :status="s.via.status" :show-confirmed="false" />
        </div>
        <div class="flex w-full max-w-[440px] items-center gap-3 rounded-ep border px-3.5 py-2" :class="i === 0 || i === bloco.steps.length - 1 ? 'border-ep-garnet-mid bg-ep-garnet-soft' : 'border-ep-line bg-ep-card'">
          <span class="font-ep-mono text-[10px] uppercase tracking-[.06em] text-ep-faint">{{ s.kind === 'person' ? 'pessoa' : 'jurisdição' }}</span>
          <NuxtLink :to="nodeRoute(s.id)" class="ep-link truncate text-[15px] font-medium">{{ s.label }}</NuxtLink>
        </div>
      </li>
    </ol>
    <p class="mt-2 text-xs text-ep-muted">
      {{ bloco.steps.length - 1 }} {{ bloco.steps.length === 2 ? 'ligação' : 'ligações' }}, {{ bloco.modo === 'sagracoes' ? 'só por ordenações e sagrações' : 'por qualquer tipo de ligação' }}.
      <NuxtLink :to="`/episcopado?no=${bloco.de}`" class="ep-link">Ver na rede</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { EDGE_LABEL } from '../../lib/labels'
import type { Bloco, PathStepView } from '../../lib/pergunta/blocos'
import { nodeRoute } from '../../lib/style'

/** Caminho entre dois nós, passo a passo, com o tipo de cada ligação. */
defineProps<{ bloco: Extract<Bloco, { tipo: 'caminho' }> }>()

const via = (s: PathStepView) => `${EDGE_LABEL[s.via!.kind] ?? s.via!.kind}${s.via!.reversed ? ' (←)' : ''}`
</script>
