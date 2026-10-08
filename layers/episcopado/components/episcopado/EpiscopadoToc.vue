<template>
  <nav :aria-label="label" class="min-w-0 text-xs">
    <ul class="flex gap-0.5 overflow-x-auto whitespace-nowrap">
      <li v-for="item in items" :key="item.id" class="shrink-0">
        <button
          type="button"
          class="block rounded-ep px-2 py-1.5 text-ep-body hover:bg-ep-line-2 hover:text-ep-ink"
          :class="{ 'bg-ep-line-2 font-medium text-ep-ink': active === item.id }"
          :aria-current="active === item.id ? 'location' : undefined"
          @click="go(item.id)"
        >{{ item.label }}<span v-if="item.count !== undefined" class="ml-1 text-ep-faint">{{ item.count }}</span></button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
export interface TocItem {
  id: string
  label: string
  count?: number
}

/**
 * Sumário da ficha, em linha na barra superior; a seção visível fica destacada.
 * Rola até a seção sem mexer na URL, para funcionar também na folha sobre o grafo.
 */
const props = withDefaults(defineProps<{ items: TocItem[]; label?: string }>(), { label: 'Seções desta ficha' })

const active = ref<string | null>(null)
let observer: IntersectionObserver | null = null

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  active.value = id
}

function observe() {
  observer?.disconnect()
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) active.value = visible[0].target.id
    },
    { rootMargin: '-20% 0px -65% 0px' }
  )
  for (const item of props.items) {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
}

onMounted(() => nextTick(observe))
watch(() => props.items.map((i) => i.id).join(), () => nextTick(observe))
onBeforeUnmount(() => observer?.disconnect())
</script>
