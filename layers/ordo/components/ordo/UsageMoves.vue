<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { useUsageContext } from '../../composables/useUsageContext'
import type { UsageMove } from '../../utils/usage'

// "Vale olhar": the biggest rises, falls and error jumps against the window
// before, each one a link to its feature.
defineProps<{ moves: UsageMove[]; hasPrevious: boolean }>()

const { open } = useUsageContext()
const TONES = {
  up: { tone: 'op-tone-ok', icon: 'arrow' },
  down: { tone: 'op-tone-danger', icon: 'alert' },
  errors: { tone: 'op-tone-warn', icon: 'alert' }
} as const
</script>

<template>
  <section class="op-card op-panel">
    <div class="op-panel__heading">
      <p class="op-eyebrow">O que mudou</p>
      <h3>Vale olhar</h3>
      <p>As maiores mudanças contra o período anterior.</p>
    </div>
    <ul v-if="moves.length" class="op-moves">
      <li v-for="move in moves" :key="`${move.kind}-${move.feature}`">
        <span class="op-moves__icon" :class="TONES[move.kind].tone"><OrdoIcon :name="TONES[move.kind].icon" :size="15" /></span>
        <span>
          <b>{{ move.title }}</b> {{ move.detail }}
          <button type="button" class="op-link" @click="open('recursos', { recurso: move.feature })">{{ move.kind === 'errors' ? 'Ver erros' : 'Ver recurso' }}</button>
        </span>
      </li>
    </ul>
    <p v-else class="op-empty">{{ hasPrevious ? 'Nada mudou muito contra o período anterior.' : 'Sem período anterior com dados para comparar.' }}</p>
  </section>
</template>
