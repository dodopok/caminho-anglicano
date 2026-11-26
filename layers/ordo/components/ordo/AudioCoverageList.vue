<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import OrdoSoonState from './SoonState.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { coverageColor, coverageText, worstFirst } from '../../utils/audio'

// The coverage on a phone: one line per book (its default Bible), the worst
// first, and the complete ones folded into a count.
const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 5 })

const store = useAudioStore()
const data = computed(() => store.readiness.data)
const items = computed(() => worstFirst(data.value, code => store.runningFor(code) !== null))
const shown = computed(() => items.value.slice(0, props.limit))
const complete = computed(() => items.value.slice(props.limit).filter(item => (item.percentage ?? 0) >= 100).length)
const others = computed(() => items.value.length - shown.value.length)
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__heading">
      <p class="op-eyebrow">Próximas {{ Math.round(store.readinessDays.value / 7) }} semanas</p>
      <h3>Cobertura por livro</h3>
      <p>Bíblia padrão de cada livro. Toque para ver dia a dia.</p>
    </div>
    <span v-if="store.readiness.loading && !data" class="op-skeleton" style="height: 220px" aria-hidden="true" />
    <OrdoSoonState v-else-if="store.readiness.soon" title="Em breve" text=" A cobertura de todos os livros chega com o cálculo noturno da API. Abra Cobertura para calcular um livro na hora." />
    <OrdoSoonState v-else-if="data && !data.computed_at" title="Depois da primeira rodada noturna" text=" A API calcula a cobertura toda madrugada (00:45)." />
    <template v-else-if="data">
      <ul class="op-covlist">
        <li v-for="item in shown" :key="item.code">
          <button type="button" @click="store.go('cobertura', { livro: item.code })">
            <span class="op-covlist__name"><OrdoLocBadge :code="item.code" /> {{ [item.bible, item.note].filter(Boolean).join(' · ') }}</span>
            <strong class="op-covlist__rate" :style="{ color: coverageColor(item.percentage) }">{{ coverageText(item.percentage) }}</strong>
            <OrdoIcon name="chevron-right" :size="16" />
            <span class="op-track" aria-hidden="true"><span :style="{ width: `${Math.min(item.percentage ?? 0, 100)}%`, background: coverageColor(item.percentage) }" /></span>
          </button>
        </li>
      </ul>
      <div class="op-panel__foot">
        <span>Pior primeiro<template v-if="others"> · mais {{ others }} {{ others === 1 ? 'livro' : 'livros' }}{{ complete === others ? (others === 1 ? ' completo' : ' completos') : '' }}</template></span>
        <button v-if="others" type="button" class="op-link" @click="store.go('cobertura')">Ver todos</button>
      </div>
    </template>
  </section>
</template>
