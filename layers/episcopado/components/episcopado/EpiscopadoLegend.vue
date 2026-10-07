<template>
  <details class="group rounded-xl border border-stone-200 bg-white text-xs text-stone-600" :open="open">
    <summary class="flex cursor-pointer select-none items-center justify-between px-3 py-2 font-medium text-stone-700 hover:text-stone-900">
      Legenda
      <svg class="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
    </summary>
    <div class="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-stone-100 px-3 py-3 sm:grid-cols-3">
      <div>
        <p class="mb-1 font-semibold uppercase tracking-wide text-stone-400">Nós</p>
        <ul class="space-y-1">
          <li v-for="l in NODE_LEGEND" :key="l.label" class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: l.color }" aria-hidden="true" />{{ l.label }}
          </li>
        </ul>
        <p class="mt-1.5 text-[11px] text-stone-400">Tamanho = quantas ligações o nó tem.</p>
      </div>
      <div>
        <p class="mb-1 font-semibold uppercase tracking-wide text-stone-400">Ligações</p>
        <ul class="space-y-1">
          <li v-for="l in EDGE_LEGEND" :key="l.label" class="flex items-center gap-2">
            <span class="h-0.5 w-5 shrink-0" :style="{ background: l.color }" aria-hidden="true" />{{ l.label }}
          </li>
        </ul>
      </div>
      <div>
        <p class="mb-1 font-semibold uppercase tracking-wide text-stone-400">Status</p>
        <ul class="space-y-1">
          <li class="flex items-center gap-2"><span class="h-0.5 w-5 shrink-0 bg-amber-700" aria-hidden="true" />Confirmada: traço cheio</li>
          <li class="flex items-center gap-2"><span class="h-0.5 w-5 shrink-0 bg-amber-700/40" aria-hidden="true" />Provável: traço translúcido</li>
          <li class="flex items-center gap-2"><span class="h-0.5 w-5 shrink-0 bg-amber-700 ring-[3px] ring-red-500/30" aria-hidden="true" />Contestada: halo vermelho</li>
        </ul>
        <p class="mt-1.5 text-[11px] text-stone-400">Passe o mouse para destacar; clique para selecionar; duplo clique abre a ficha.</p>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { EDGE_LEGEND, NODE_LEGEND } from '../../lib/style'

withDefaults(defineProps<{ open?: boolean }>(), { open: false })
</script>
