<template>
  <aside class="mt-8 rounded-ep border border-ep-line-2 bg-ep-paper-2 px-4 py-3 text-xs text-ep-body">
    <p class="ep-mono-label">Como ler</p>
    <p class="mt-1.5">Cada [n] abre a fonte e o trecho que sustenta a afirmação. Os selos indicam o grau de certeza:</p>
    <ul class="mt-2 flex flex-col gap-1.5">
      <li v-for="s in (['confirmed', 'probable', 'contested'] as const)" :key="s" class="flex items-start gap-2">
        <EpiscopadoStatus :status="s" />
        <span class="text-ep-muted">{{ STATUS_DESCRIPTION[s] }}</span>
      </li>
    </ul>
    <p class="mt-3 text-center text-ep-muted">Encontrou um erro ou tem uma fonte? Esta base está em construção — toda correção com fonte é bem-vinda.</p>
  </aside>
</template>

<script setup lang="ts">
import { STATUS_DESCRIPTION } from '../../lib/labels'
</script>
