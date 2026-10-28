<template>
  <section class="my-5" :aria-label="title">
    <p class="mb-2 flex items-baseline gap-2">
      <span class="ep-eyebrow">Bloco {{ n }}</span>
      <span v-if="title" class="text-sm font-medium text-ep-ink">{{ title }}</span>
    </p>
    <EpiscopadoBlocoTabela v-if="bloco.tipo === 'tabela'" :bloco="bloco" />
    <ClientOnly v-else-if="bloco.tipo === 'grafico'">
      <EpiscopadoBlocoGrafico :bloco="bloco" />
      <template #fallback><div class="h-64 rounded-ep border border-ep-line bg-ep-paper-2" /></template>
    </ClientOnly>
    <EpiscopadoBlocoLinhaDoTempo v-else-if="bloco.tipo === 'linha_do_tempo'" :bloco="bloco" />
    <div v-else-if="bloco.tipo === 'sucessao'">
      <p v-if="bloco.view.origin" class="mb-3 text-sm text-ep-body">
        A linha alcança <strong>{{ bloco.view.origin.label }}</strong> em {{ bloco.view.origin.person.name }}.
      </p>
      <EpiscopadoSuccession :steps="bloco.view.steps" :end="bloco.view.end" :alt="bloco.view.alt" />
    </div>
    <EpiscopadoBlocoCaminho v-else-if="bloco.tipo === 'caminho'" :bloco="bloco" />
    <details v-if="'consulta' in bloco" class="mt-2 text-xs text-ep-muted">
      <summary class="cursor-pointer select-none hover:text-ep-ink">Ver consulta</summary>
      <pre class="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-ep bg-ep-line-2 p-2.5 font-ep-mono text-[11px] leading-relaxed text-ep-ink-3">{{ bloco.consulta }}</pre>
      <p class="mt-1">Para reproduzir: <code class="font-ep-mono">pnpm episcopado:sql "…"</code></p>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { Bloco } from '../../lib/pergunta/blocos'

/** Um bloco de resposta do Pergunte à Rede, com o título e a consulta que o gerou. */
const props = defineProps<{ bloco: Bloco; n: number }>()

const title = computed(() => props.bloco.titulo ?? (props.bloco.tipo === 'caminho' ? 'Caminho na rede' : null))
</script>
