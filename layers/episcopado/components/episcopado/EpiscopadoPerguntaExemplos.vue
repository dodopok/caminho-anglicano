<template>
  <section class="mt-10 rounded-ep border border-ep-line bg-ep-paper-2 p-4" aria-labelledby="pergunte-ficha-titulo">
    <p id="pergunte-ficha-titulo" class="ep-eyebrow">Pergunte à Rede</p>
    <p class="mt-1 text-sm text-ep-body">Pergunte em linguagem natural sobre {{ kind === 'person' ? nome : 'esta jurisdição' }}; a resposta vem da base, com as fontes.</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <NuxtLink v-for="q in perguntas" :key="q" :to="perguntaLink(q, nodeId)" class="ep-chip">{{ q }}</NuxtLink>
      <NuxtLink :to="`/episcopado/pergunte?p=${nodeId}`" class="ep-chip">Outra pergunta…</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { exemplosDaFicha, perguntaLink } from '../../lib/pergunta/exemplos'

/** Perguntas de exemplo no fim de uma ficha: abrem o Pergunte à Rede já com a ficha como contexto. */
const props = defineProps<{ nodeId: string; kind: 'person' | 'jurisdiction'; nome: string }>()
const perguntas = computed(() => exemplosDaFicha(props.kind, props.nome))
</script>
