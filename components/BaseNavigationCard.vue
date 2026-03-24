<script setup lang="ts">
interface Props {
  to?: string
  href?: string
  icon: string
  title: string
  description: string
  external?: boolean
  size?: 'normal' | 'large' | 'wide' | 'tall' | 'featured'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal'
})

const isExternal = computed(() => props.external || !!props.href)
const linkTo = computed(() => props.to || props.href || '#')

const iconPaths: Record<string, string> = {
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  library: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
}

const sizeClasses = {
  normal: 'col-span-1 row-span-1',
  wide: 'col-span-1 md:col-span-2 lg:col-span-2 row-span-1',
  tall: 'col-span-1 row-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2',
  featured: 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2'
}

const commonClasses = "group relative overflow-hidden bg-white rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-700 border border-slate-200 hover:border-amber-500/30 flex flex-col p-6 sm:p-8 md:p-10 cursor-pointer"
</script>

<template>
  <NuxtLink
    v-if="!isExternal"
    :to="linkTo"
    :aria-label="`Acessar o ${title}`"
    :class="[commonClasses, sizeClasses[props.size]]"
  >
    <!-- Background Decoration (Com pointer-events-none) -->
    <div class="absolute inset-0 bg-gradient-to-br from-transparent via-slate-50/30 to-amber-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter%22)/%3E%3C/svg%3E');"></div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col h-full pointer-events-none" :class="{ 'justify-center': props.size === 'featured' || props.size === 'wide' }">
      <div 
        class="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 shadow-sm ring-1 ring-slate-200 group-hover:ring-amber-500/50"
        :class="{ 'mx-auto': props.size === 'normal' || props.size === 'tall' }"
      >
        <svg class="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" :d="iconPaths[icon]" />
        </svg>
      </div>

      <div :class="{ 'text-center': props.size === 'normal' || props.size === 'tall' }">
        <h3 class="font-serif font-bold text-slate-900 mb-2 tracking-tight transition-colors duration-500 group-hover:text-amber-900" :class="[props.size === 'featured' ? 'text-2xl sm:text-3xl lg:text-5xl' : 'text-xl sm:text-2xl lg:text-3xl']">
          {{ title }}
        </h3>
        <p class="text-slate-500 leading-relaxed font-sans font-medium text-sm sm:text-base">
          {{ description }}
        </p>
      </div>

      <div class="mt-auto pt-4 flex justify-end">
        <div class="group/arrow flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase tracking-[0.2em] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          <span class="hidden sm:inline">Explorar</span>
          <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>

  <a
    v-else
    :href="linkTo"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`Acessar o ${title}`"
    :class="[commonClasses, sizeClasses[props.size]]"
  >
    <!-- Mesma estrutura interna para links externos -->
    <div class="absolute inset-0 bg-gradient-to-br from-transparent via-slate-50/30 to-amber-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter%22)/%3E%3C/svg%3E');"></div>

    <div class="relative z-10 flex flex-col h-full pointer-events-none" :class="{ 'justify-center': props.size === 'featured' || props.size === 'wide' }">
      <div 
        class="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 shadow-sm ring-1 ring-slate-200 group-hover:ring-amber-500/50"
        :class="{ 'mx-auto': props.size === 'normal' || props.size === 'tall' }"
      >
        <svg class="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" :d="iconPaths[icon]" />
        </svg>
      </div>

      <div :class="{ 'text-center': props.size === 'normal' || props.size === 'tall' }">
        <h3 class="font-serif font-bold text-slate-900 mb-2 tracking-tight transition-colors duration-500 group-hover:text-amber-900" :class="[props.size === 'featured' ? 'text-2xl sm:text-3xl lg:text-5xl' : 'text-xl sm:text-2xl lg:text-3xl']">
          {{ title }}
        </h3>
        <p class="text-slate-500 leading-relaxed font-sans font-medium text-sm sm:text-base">
          {{ description }}
        </p>
      </div>

      <div class="mt-auto pt-4 flex justify-end">
        <div class="group/arrow flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase tracking-[0.2em] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          <span class="hidden sm:inline">Explorar</span>
          <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </a>
</template>
