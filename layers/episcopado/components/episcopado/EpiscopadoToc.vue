<template>
  <nav :aria-label="label" class="text-sm">
    <!-- Celular: fichas em linha, roláveis. Desktop: lista vertical fixa. -->
    <ul class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
      <li v-for="item in items" :key="item.id" class="shrink-0">
        <a
          :href="`#${item.id}`"
          class="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          :class="{ 'bg-amber-50 font-medium text-amber-900': active === item.id }"
          :aria-current="active === item.id ? 'location' : undefined"
        >{{ item.label }}<span v-if="item.count !== undefined" class="ml-1 text-xs text-stone-400">{{ item.count }}</span></a>
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

/** Sumário da ficha; a seção visível fica destacada. */
const props = withDefaults(defineProps<{ items: TocItem[]; label?: string }>(), { label: 'Seções desta ficha' })

const active = ref<string | null>(null)
let observer: IntersectionObserver | null = null

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
