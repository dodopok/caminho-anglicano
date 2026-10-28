<template>
  <ol class="relative ml-1.5 border-l border-ep-rule">
    <li v-for="(item, i) in shown" :key="i" class="relative pb-3 pl-5 last:pb-0">
      <span class="absolute -left-[4.5px] top-[7px] h-2 w-2 rounded-full bg-ep-garnet" aria-hidden="true" />
      <p class="font-ep-mono text-[11px] uppercase tracking-[.05em] text-ep-muted">{{ formatDate(item.data) || item.data }}</p>
      <p class="text-sm leading-snug text-ep-ink-3">{{ item.texto }}</p>
    </li>
  </ol>
  <button v-if="bloco.itens.length > PAGE && !all" type="button" class="mt-2 text-xs font-medium text-ep-garnet-ink hover:underline" @click="all = true">
    Mostrar os {{ bloco.itens.length }} itens
  </button>
</template>

<script setup lang="ts">
import { formatDate } from '../../lib/labels'
import type { Bloco } from '../../lib/pergunta/blocos'

/** Linha do tempo do Pergunte à Rede: datas parciais formatadas como nas fichas. */
const props = defineProps<{ bloco: Extract<Bloco, { tipo: 'linha_do_tempo' }> }>()
const PAGE = 30
const all = ref(false)
const shown = computed(() => (all.value ? props.bloco.itens : props.bloco.itens.slice(0, PAGE)))
</script>
