<script setup lang="ts">
import type { FlagChange } from '../../types/flags'
import { canUndo, describeChange, relativeTime, undoBlockedLabel } from '../../utils/flags'

// Últimas mudanças: what changed in the last 30 days, each with Desfazer
// while the API can still undo it. No author: the portal has one admin.
withDefaults(defineProps<{
  changes: FlagChange[]
  now: Date
  /** The list's history names the flag; a flag's own history does not. */
  showFlag?: boolean
  busy?: boolean
}>(), { showFlag: false, busy: false })

const emit = defineEmits<{ undo: [change: FlagChange] }>()
</script>

<template>
  <ul v-if="changes.length" class="op-moves">
    <li v-for="change in changes" :key="change.id" :class="{ 'is-undone': change.undone_at }" :data-change="change.id">
      <span class="op-moves__copy">
        <template v-if="showFlag"><b>{{ change.flag_name || change.flag_key }}</b>: </template>{{ describeChange(change, now) }}.
        <small>{{ relativeTime(change.created_at, now) }}</small>
      </span>
      <button
        v-if="canUndo(change, now)"
        type="button"
        class="op-btn op-btn--small op-btn--ghost"
        :disabled="busy"
        @click="emit('undo', change)"
      >
        Desfazer
      </button>
      <span v-else class="op-pill op-pill--quiet">{{ undoBlockedLabel(change, now) }}</span>
    </li>
  </ul>
  <p v-else class="op-note">Nada mudou nos últimos 30 dias. Mudanças de antes do registro não aparecem aqui.</p>
</template>
