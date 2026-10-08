<template>
  <div class="grid grid-cols-[auto_auto] gap-x-[18px] gap-y-1 text-xs text-ep-ink-3">
    <p class="col-span-2 ep-mono-label mb-0.5">Nós</p>
    <span v-for="l in NODE_LEGEND" :key="l.label" class="flex items-center gap-2">
      <span class="h-2.5 w-2.5 flex-none rounded-full" :style="{ background: l.color }" aria-hidden="true" />{{ l.label }}
    </span>
    <p class="col-span-2 ep-mono-label mb-0.5 mt-2">Ligações</p>
    <span v-for="l in EDGE_LEGEND" :key="l.label" class="flex items-center gap-2">
      <span class="h-[3px] w-[18px] flex-none rounded-ep" :style="{ background: l.color }" aria-hidden="true" />{{ l.label }}
    </span>
    <p class="col-span-2 ep-mono-label mb-0.5 mt-2">Status</p>
    <span class="flex items-center gap-2"><span class="h-[3px] w-[18px] flex-none rounded-ep bg-ep-garnet" aria-hidden="true" />Confirmada: traço cheio</span>
    <span class="flex items-center gap-2"><span class="h-[3px] w-[18px] flex-none rounded-ep bg-ep-garnet/50" aria-hidden="true" />Provável: translúcido</span>
    <span class="col-span-2 flex items-center gap-2"><span class="h-[3px] w-[18px] flex-none rounded-ep bg-ep-garnet shadow-[0_0_0_3px_rgba(180,35,24,.3)]" aria-hidden="true" />Contestada: halo vermelho</span>
    <p class="col-span-2 mt-2 text-[11px] text-ep-faint">Tamanho do nó = quantas ligações ele tem.<br>Passe o mouse para destacar; clique para selecionar; duplo clique abre a ficha.</p>
  </div>
</template>

<script setup lang="ts">
import { EDGE_LEGEND, NODE_LEGEND } from '../../lib/style'
</script>
