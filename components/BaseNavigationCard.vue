<script setup lang="ts">
interface Props {
  to?: string
  href?: string
  icon: string
  title: string
  description: string
  ariaLabel: string
  external?: boolean
}

const props = defineProps<Props>()

const isExternal = computed(() => props.external || !!props.href)
const linkTo = computed(() => props.to || props.href || '#')

const iconPaths: Record<string, string> = {
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
}
</script>

<template>
  <NuxtLink
    v-if="!isExternal"
    :to="linkTo"
    :aria-label="ariaLabel"
    class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-8 border border-slate-200 hover:border-slate-300 block"
  >
    <div class="flex flex-col items-center text-center">
      <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
        <svg
          class="w-8 h-8 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="iconPaths[icon]"
          />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-900 mb-2">
        {{ title }}
      </h3>
      <p class="text-slate-600">
        {{ description }}
      </p>
    </div>
  </NuxtLink>

  <a
    v-else
    :href="linkTo"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="ariaLabel"
    class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-8 border border-slate-200 hover:border-slate-300 block"
  >
    <div class="flex flex-col items-center text-center">
      <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
        <svg
          class="w-8 h-8 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            :d="iconPaths[icon]"
          />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-900 mb-2">
        {{ title }}
      </h3>
      <p class="text-slate-600">
        {{ description }}
      </p>
    </div>
  </a>
</template>
