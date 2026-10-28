<template>
  <div class="episcopado flex min-h-screen flex-col bg-ep-paper">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-40 pt-6 min-[700px]:pt-10">
      <header class="mb-6">
        <p class="ep-eyebrow">Beta</p>
        <h1 class="mt-1 font-ep-serif text-4xl font-semibold text-ep-ink">Pergunte à Rede</h1>
        <p class="mt-2 max-w-[580px] text-sm text-ep-body">
          Pergunte em linguagem natural sobre clérigos, sagrações, cismas e jurisdições. As respostas vêm só da base da rede,
          com a fonte de cada afirmação; tabelas e gráficos são calculados direto dos dados.
        </p>
      </header>

      <p v-if="indisponivel" class="mb-6 rounded-ep border border-ep-line bg-ep-card px-4 py-3 text-sm text-ep-body" role="status">{{ indisponivel }}</p>

      <section v-if="!turnos.length" class="mb-8" aria-labelledby="exemplos-titulo">
        <p id="exemplos-titulo" class="mb-3 text-xs font-medium uppercase tracking-[.06em] text-ep-muted">Experimente</p>
        <div class="grid gap-5 min-[700px]:grid-cols-2">
          <div v-for="g in grupos" :key="g.tema">
            <p class="mb-2 font-ep-serif text-[15px] font-semibold text-ep-ink">{{ g.tema }}</p>
            <div class="flex flex-col items-start gap-2">
              <button v-for="q in g.perguntas" :key="q" type="button" class="ep-chip text-left" :disabled="busy" @click="enviar(q)">{{ q }}</button>
            </div>
          </div>
        </div>
      </section>

      <ol class="flex flex-col gap-8" aria-live="polite">
        <li v-for="(t, i) in turnos" :key="t.id" class="flex flex-col gap-3">
          <p class="self-end rounded-ep bg-ep-ink px-4 py-2.5 text-[15px] text-ep-card max-w-[85%]">{{ t.pergunta }}</p>
          <article class="rounded-ep border border-ep-line bg-ep-card px-5 py-3 min-[700px]:px-6">
            <p v-if="t.status" class="my-3 flex items-center gap-2 text-sm text-ep-muted">
              <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-ep-garnet" aria-hidden="true" />{{ t.status }}
            </p>
            <p v-if="t.erro" class="my-3 text-sm text-ep-red" role="alert">{{ t.erro }}</p>
            <EpiscopadoResposta v-if="t.texto || t.blocos.length" :markdown="t.texto" :notas="t.notas" :blocos="t.blocos" :streaming="!t.done" :open-notes="false" />
            <div v-if="t.done && !t.erro" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ep-line-2 pt-2.5 text-xs text-ep-muted">
              <span v-if="t.cache">Resposta já calculada para esta pergunta.</span>
              <span v-if="t.resultado === 'nao_sabe'">A lacuna fica registrada na pauta de pesquisa da rede.</span>
              <span v-if="i === turnos.length - 1" class="ml-auto">Respostas geradas por IA a partir da base; confira as fontes.</span>
            </div>
          </article>
        </li>
      </ol>

      <details v-if="turnos.length && !busy" class="mt-8 text-sm text-ep-body">
        <summary class="cursor-pointer select-none text-xs font-medium uppercase tracking-[.06em] text-ep-muted hover:text-ep-ink">Mais exemplos de perguntas</summary>
        <div class="mt-3 flex flex-wrap gap-2">
          <button v-for="q in todos" :key="q" type="button" class="ep-chip text-left" @click="enviar(q)">{{ q }}</button>
        </div>
      </details>
    </main>

    <div class="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ep-paper via-ep-paper to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
      <form class="pointer-events-auto mx-auto w-full max-w-3xl px-4" @submit.prevent="enviar(entrada)">
        <div v-if="contextoNode" class="mb-2 flex items-center gap-2 text-xs text-ep-body">
          <span>Perguntando sobre</span>
          <NuxtLink :to="nodeRoute(contextoNode.id)" class="ep-link font-medium">{{ contextoNode.label }}</NuxtLink>
          <button type="button" class="text-ep-faint hover:text-ep-ink" aria-label="Perguntar sobre a rede toda" @click="removerContexto">✕</button>
        </div>
        <div class="flex items-end gap-2 rounded-ep border border-ep-rule bg-ep-card p-2 shadow-[0_2px_8px_rgba(21,19,15,.08)] focus-within:border-ep-ink">
          <label for="pergunta" class="sr-only">Sua pergunta</label>
          <textarea
            id="pergunta"
            ref="input"
            v-model="entrada"
            rows="1"
            maxlength="1000"
            :placeholder="turnos.length ? 'Continue a conversa (ex.: “agora só os da década de 90”)…' : 'Pergunte sobre a rede…'"
            class="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ep-ink outline-none placeholder:text-ep-faint"
            @keydown.enter.exact.prevent="enviar(entrada)"
            @input="autosize"
          />
          <button v-if="busy" type="button" class="ep-btn ep-btn-secondary" @click="cancelar">Parar</button>
          <button v-else type="submit" class="ep-btn ep-btn-primary" :disabled="!entrada.trim() || !!indisponivel">Perguntar</button>
        </div>
        <div class="mt-1.5 flex justify-between px-1 text-[11px] text-ep-faint">
          <span>Enter envia · Shift+Enter quebra a linha</span>
          <button v-if="turnos.length && !busy" type="button" class="hover:text-ep-ink" @click="limpar">Nova conversa</button>
        </div>
      </form>
    </div>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { EXEMPLOS, exemplosDaFicha, type TemaExemplos } from '../../lib/pergunta/exemplos'
import { nodeRoute } from '../../lib/style'

definePageMeta({ layout: false })
useEpiscopadoFonts()

const route = useRoute()
const router = useRouter()
const { data: graph } = await useEpiscopadoGraph()

const contexto = ref<string | null>(typeof route.query.p === 'string' && /^[pj]:[a-z0-9-]+$/.test(route.query.p) ? route.query.p : null)
const contextoNode = computed(() => (contexto.value ? (graph.value.nodes.find((n) => n.id === contexto.value) ?? null) : null))

const { turnos, busy, perguntar, cancelar, limpar } = useEpiscopadoPergunta(contexto)
const entrada = ref(typeof route.query.q === 'string' ? route.query.q : '')
const input = ref<HTMLTextAreaElement | null>(null)
const indisponivel = ref<string | null>(null)

/** Exemplos da lista única (`lib/pergunta/exemplos.ts`); com uma ficha como contexto, os da ficha vêm primeiro. */
const grupos = computed<TemaExemplos[]>(() => {
  const n = contextoNode.value
  return n ? [{ tema: `Sobre ${n.label}`, perguntas: exemplosDaFicha(n.kind, n.label) }, ...EXEMPLOS.gerais] : EXEMPLOS.gerais
})
const todos = computed(() => grupos.value.flatMap((g) => g.perguntas))

function autosize() {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

/**
 * Rolagem que acompanha a resposta: ao perguntar, a pergunta vai para a vista; enquanto o texto chega, a página
 * segue o fim, mas só se o leitor já está lá embaixo (quem subiu para ler não é puxado de volta). Na resposta
 * final os blocos aparecem abaixo do texto sem mover a página.
 */
const SEGUIR_MARGEM = 160
const pertoDoFim = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - SEGUIR_MARGEM
const irAoFim = (behavior: ScrollBehavior = 'auto') => window.scrollTo({ top: document.documentElement.scrollHeight, behavior })

watch(
  () => {
    const t = turnos.value.at(-1)
    return t && !t.done ? `${t.texto.length}:${t.blocos.length}:${t.status}` : null
  },
  (sinal) => {
    // flush 'pre': mede antes de o texto novo crescer a página.
    if (sinal && pertoDoFim()) nextTick(() => irAoFim())
  },
  { flush: 'pre' }
)

async function enviar(q: string) {
  if (!q.trim() || busy.value) return
  entrada.value = ''
  nextTick(autosize)
  const resposta = perguntar(q)
  await nextTick()
  irAoFim(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
  await resposta
}

function removerContexto() {
  contexto.value = null
  router.replace({ query: { ...route.query, p: undefined } })
}

onMounted(async () => {
  try {
    const r = await $fetch<{ ok: boolean; motivo?: string }>('/api/episcopado/pergunta/aquecer')
    if (!r.ok) indisponivel.value = 'O Pergunte à Rede está desativado neste ambiente.'
  } catch {
    // Aquecimento é só otimização: a pergunta mostra o erro se houver.
  }
  if (entrada.value) enviar(entrada.value)
  else input.value?.focus()
})

useSeoMeta({
  title: 'Pergunte à Rede - Rede do Episcopado Histórico',
  description: 'Perguntas em linguagem natural sobre a Rede do Episcopado Histórico, respondidas com as fontes da base.',
  robots: 'noindex, nofollow'
})
</script>
