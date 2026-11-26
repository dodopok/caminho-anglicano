<script setup lang="ts">
import OrdoFlagConfirm from './FlagConfirm.vue'
import OrdoFlagCreate from './FlagCreate.vue'
import OrdoFlagDetail from './FlagDetail.vue'
import OrdoFlagsList from './FlagsList.vue'
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { createFlagActions, provideFlagActions } from '../../composables/useFlagActions'
import { useFlagsApi } from '../../composables/useFlagsApi'
import { usePortalQuery } from '../../composables/usePortalQuery'
import { createReport, errorText } from '../../composables/useReport'
import type { FlagChange } from '../../types/flags'

// The "Feature flags" tab (Cuidado): what is on and for whom, what changes on
// its own soon, the books in pre-release, and every change with Desfazer for
// 30 days. Reads /api/v1/admin/feature_flags (contract:
// notes/painel-flags-livros/API-flags.md); while the API in use does not have
// it (404) the tab says "em breve", never an error.
//
//   ?aba=flags&estado=agendadas&tipo=livros&busca=…   the list
//   ?aba=flags&flag=prayer_groups                      one flag
//   ?aba=flags&vista=nova                              a new flag
const props = withDefaults(defineProps<{
  /** Bumped by the page's refresh button. */
  reloadKey: number
  /** Today, for tests and screenshots; the real clock otherwise. */
  now?: Date | null
}>(), { now: null })

const api = useFlagsApi()
const query = usePortalQuery()
const today = computed(() => props.now ? new Date(props.now) : new Date())

const flagKey = computed(() => query.values.value.flag || '')
const creating = computed(() => !flagKey.value && query.values.value.vista === 'nova')
const focus = computed(() => query.values.value.foco || null)
const perPage = ref(50)

const list = createReport(() => api.list(), { lazy: false })
const detail = createReport(() => api.detail(flagKey.value, { perPage: perPage.value }))

const loadDetail = () => flagKey.value ? detail.load() : Promise.resolve(detail.reset())
const reload = () => Promise.all([list.load(), loadDetail()])

onMounted(() => { reload() })
watch(() => props.reloadKey, () => { reload() })
watch(flagKey, () => {
  perPage.value = 50
  detail.reset()
  loadDetail()
})

const open = (key: string) => query.set({ flag: key, vista: null, foco: null }, { push: true })
const backToList = () => query.set({ flag: null, vista: null, foco: null }, { push: true })

const flags = computed(() => list.state.data?.flags || [])
const knownChanges = (): FlagChange[] => [...(list.state.data?.recent_changes || []), ...(detail.state.data?.changes || [])]

const actions = provideFlagActions(createFlagActions({
  api,
  flags: () => flags.value,
  knownChanges,
  reload,
  openSchedule: key => query.set({ flag: key, vista: null, foco: 'agendamento' }, { push: !flagKey.value }),
  onDeleted: () => backToList(),
  onCreated: key => query.set({ flag: key, vista: null, foco: null }, { push: false }),
  now: () => today.value
}))

const showMore = () => {
  perPage.value = 100
  detail.load()
}

// "Em breve" only when the list itself is missing (404): the API in use has
// no feature flags yet. Any other failure is an error with "Tentar de novo".
const soon = computed(() => list.state.soon)
const listError = computed(() => list.state.soon ? null : errorText(list.state.error, 'Não foi possível ler as flags.'))
const detailMissing = computed(() => Boolean(flagKey.value && detail.state.settled && !detail.state.data && detail.state.soon))
const detailError = computed(() => flagKey.value && !detail.state.soon ? errorText(detail.state.error, 'Não foi possível ler esta flag.') : null)
const booting = computed(() => !list.state.settled)
</script>

<template>
  <OrdoSoonState v-if="soon" title="Feature flags em breve" data-flags-soon>
    <span>A API em uso ainda não tem as flags no banco. Quando ela chegar, esta aba mostra o que está ligado, para quem, o que está agendado e o histórico para desfazer. Até lá, as flags continuam sendo mudadas pelo terminal da API.</span>
  </OrdoSoonState>

  <template v-else>
    <div v-if="actions.notice.value" class="op-inline-note" role="status" data-flags-notice>
      <OrdoIcon name="check" :size="18" />
      <span style="flex: 1">{{ actions.notice.value.text }}</span>
      <button v-if="actions.notice.value.changes.length" type="button" class="op-btn op-btn--small" :disabled="actions.busy.value" @click="actions.undoNotice()">Desfazer</button>
      <button type="button" class="op-icon-btn" aria-label="Fechar aviso" @click="actions.dismiss()"><OrdoIcon name="close" :size="16" /></button>
    </div>
    <div v-if="actions.error.value && !actions.pending.value && !creating" class="op-inline-error" role="alert">
      <OrdoIcon name="alert" :size="18" />
      <span style="flex: 1">{{ actions.error.value }}</span>
      <button type="button" class="op-btn op-btn--small" :disabled="actions.busy.value" @click="actions.retry()">Tentar de novo</button>
    </div>

    <div v-if="listError" class="op-inline-error" role="alert">
      <OrdoIcon name="alert" :size="18" />
      <span style="flex: 1">{{ listError }}</span>
      <button type="button" class="op-btn op-btn--small" @click="reload">Tentar de novo</button>
    </div>

    <template v-if="booting">
      <section class="op-tiles op-tiles--4" aria-busy="true" aria-label="Lendo as flags">
        <article v-for="index in 4" :key="index" class="op-card op-metric">
          <span class="op-skeleton op-metric__skeleton-line" />
          <span class="op-skeleton op-metric__skeleton-value" />
        </article>
      </section>
      <section class="op-card op-panel" aria-hidden="true">
        <span v-for="index in 5" :key="index" class="op-skeleton" style="height: 44px" />
      </section>
    </template>

    <OrdoFlagCreate v-else-if="creating" :taken-keys="flags.map(flag => flag.key)" :now="today" @cancel="backToList" />

    <template v-else-if="flagKey">
      <button type="button" class="op-link" style="align-self: flex-start" @click="backToList"><OrdoIcon name="chevron-left" :size="14" /> Todas as flags</button>
      <div v-if="detailMissing" class="op-empty" role="note">Esta flag não existe mais (pode ter sido apagada). Se foi há menos de 30 dias, desfaça a remoção em Últimas mudanças.</div>
      <div v-else-if="detailError" class="op-inline-error" role="alert">
        <OrdoIcon name="alert" :size="18" />
        <span style="flex: 1">{{ detailError }}</span>
        <button type="button" class="op-btn op-btn--small" @click="detail.load()">Tentar de novo</button>
      </div>
      <OrdoFlagDetail
        v-else-if="detail.state.data"
        :detail="detail.state.data"
        :flags="flags"
        :now="today"
        :api="api"
        :focus="focus"
        @more="showMore"
        @focused="query.set({ foco: null })"
      />
      <section v-else class="op-card op-panel" aria-busy="true" aria-label="Lendo a flag">
        <span v-for="index in 4" :key="index" class="op-skeleton" style="height: 56px" />
      </section>
    </template>

    <OrdoFlagsList v-else-if="list.state.data" :data="list.state.data" :now="today" :api="api" @open="open" @create="query.set({ vista: 'nova' }, { push: true })" />

    <OrdoFlagConfirm
      v-if="actions.pending.value"
      :request="actions.pending.value"
      :busy="actions.busy.value"
      :error="actions.error.value"
      @cancel="actions.cancel()"
      @confirm="actions.confirm()"
    />
  </template>
</template>
