<template>
  <template v-for="(node, i) in nodes" :key="i">
    <template v-if="node.t === 'text'">{{ node.v }}</template>
    <strong v-else-if="node.t === 'strong'" class="font-semibold text-ep-ink"><EpiscopadoInline :nodes="node.c" /></strong>
    <em v-else-if="node.t === 'em'"><EpiscopadoInline :nodes="node.c" /></em>
    <code v-else-if="node.t === 'code'" class="rounded-ep bg-ep-line-2 px-1 font-ep-mono text-[0.9em]">{{ node.v }}</code>
    <NuxtLink v-else-if="node.t === 'link' && node.href.startsWith('/')" :to="node.href" class="ep-link"><EpiscopadoInline :nodes="node.c" /></NuxtLink>
    <EpiscopadoInline v-else-if="node.t === 'link'" :nodes="node.c" />
    <EpiscopadoCites v-else-if="node.t === 'cites'" :cites="node.ns" />
  </template>
</template>

<script setup lang="ts">
import type { Inline } from '../../lib/pergunta/markdown'

/** Trecho de texto das respostas do Pergunte à Rede (ver `lib/pergunta/markdown.ts`). */
defineProps<{ nodes: Inline[] }>()
</script>
