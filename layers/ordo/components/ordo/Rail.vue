<script setup lang="ts">
import OrdoIcon, { type OrdoIconName } from './Icon.vue'

export interface RailTab {
  id: string
  label: string
  shortLabel: string
  icon: OrdoIconName
  group: 'reading' | 'care'
  count?: number | null
  countTone?: 'gold' | 'quiet'
}

export interface RailSeason {
  name: string
  line?: string
  note?: string
  color: string
}

const props = defineProps<{
  tabs: RailTab[]
  active: string
  user?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null
  season?: RailSeason | null
}>()

const emit = defineEmits<{
  select: [id: string]
  logout: []
}>()

const GROUPS = [
  { id: 'reading', label: 'Leitura' },
  { id: 'care', label: 'Cuidado' }
] as const

const grouped = computed(() => GROUPS.map(group => ({
  ...group,
  tabs: props.tabs.filter(tab => tab.group === group.id)
})))

const initial = computed(() => (props.user?.displayName || props.user?.email || 'A').charAt(0).toUpperCase())
const countLabel = (tab: RailTab) => tab.count ? `${tab.count.toLocaleString('pt-BR')} esperando` : ''

// On a phone the tabs scroll sideways; the active one is brought into view,
// so a tab at the end (Feature flags) is not hidden off screen.
const mobileNav = ref<HTMLElement | null>(null)
const revealActive = () => nextTick(() => {
  const nav = mobileNav.value
  const item = nav?.querySelector<HTMLElement>('.is-active')
  if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return
  const navBox = nav.getBoundingClientRect()
  const itemBox = item.getBoundingClientRect()
  nav.scrollLeft += itemBox.left - navBox.left - (navBox.width - itemBox.width) / 2
})
onMounted(revealActive)
watch(() => props.active, revealActive)
</script>

<template>
  <aside class="op-rail" aria-label="Navegação do portal">
    <div class="op-rail__brand">
      <img src="/ordo/icon.png" alt="" width="38" height="38">
      <div class="op-rail__wordmark">
        <strong>Ordo</strong>
        <span>Portal</span>
      </div>
    </div>

    <nav class="op-rail__nav" aria-label="Seções do portal">
      <template v-for="group in grouped" :key="group.id">
        <span class="op-rail__group">{{ group.label }}</span>
        <button
          v-for="tab in group.tabs"
          :key="tab.id"
          type="button"
          class="op-nav-item"
          :class="{ 'is-active': active === tab.id }"
          :aria-current="active === tab.id ? 'page' : undefined"
          @click="emit('select', tab.id)"
        >
          <OrdoIcon :name="tab.icon" />
          <span class="op-nav-item__label">{{ tab.label }}</span>
          <span v-if="tab.count" class="op-nav-item__count" :class="{ 'is-gold': tab.countTone !== 'quiet' }" :aria-label="countLabel(tab)">{{ tab.count.toLocaleString('pt-BR') }}</span>
        </button>
      </template>
    </nav>

    <div class="op-rail__spacer" />

    <section v-if="season" class="op-lit-card" aria-label="Calendário litúrgico de hoje">
      <svg width="30" height="38" viewBox="0 0 24 30" aria-hidden="true">
        <path d="M3 29V13C3 7.4 6.8 3 12 1c5.2 2 9 6.4 9 12v16z" :fill="season.color" />
        <path d="M12 3v26M3 15h18" stroke="#0D2744" stroke-width="2.2" />
      </svg>
      <div class="op-lit-card__copy">
        <small>Hoje no calendário</small>
        <strong>{{ season.name }}</strong>
        <span v-if="season.line">{{ season.line }}</span>
        <em v-if="season.note">{{ season.note }}</em>
      </div>
    </section>

    <div class="op-rail__user">
      <span class="op-avatar" aria-hidden="true">
        <img v-if="user?.photoURL" :src="user.photoURL" alt="" referrerpolicy="no-referrer">
        <template v-else>{{ initial }}</template>
      </span>
      <span class="op-rail__user-copy">
        <strong>{{ user?.displayName || 'Administrador' }}</strong>
        <span>{{ user?.email || 'Conta Google autorizada' }}</span>
      </span>
      <button type="button" class="op-rail__logout" aria-label="Sair do portal" @click="emit('logout')">
        <OrdoIcon name="logout" :size="18" />
      </button>
    </div>
  </aside>

  <header class="op-mobile-bar">
    <div class="op-mobile-bar__top">
      <div class="op-mobile-bar__brand">
        <img src="/ordo/icon.png" alt="" width="32" height="32">
        <strong>Ordo</strong>
      </div>
      <span v-if="season" class="op-pill op-pill--lit" style="background: rgba(251, 248, 240, .1); color: var(--op-rail-ink)">
        <i :style="{ background: season.color }" />{{ season.name }}
      </span>
      <button type="button" class="op-rail__logout" aria-label="Sair do portal" @click="emit('logout')">
        <OrdoIcon name="logout" :size="18" />
      </button>
    </div>
    <nav ref="mobileNav" class="op-mobile-bar__nav" aria-label="Seções do portal">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="op-nav-item"
        :class="{ 'is-active': active === tab.id }"
        :aria-current="active === tab.id ? 'page' : undefined"
        @click="emit('select', tab.id)"
      >
        <OrdoIcon :name="tab.icon" :size="18" />
        <span>{{ tab.shortLabel }}</span>
        <span v-if="tab.count" class="op-nav-item__count" :class="{ 'is-gold': tab.countTone !== 'quiet' }" :aria-label="countLabel(tab)">{{ tab.count.toLocaleString('pt-BR') }}</span>
      </button>
    </nav>
  </header>
</template>
