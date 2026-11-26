<script setup lang="ts">
// Stroke icons drawn for the portal, in the family of the Ordo Web's Material
// Symbols (rounded joins, 1.75px stroke). They replace the Unicode glyphs the
// old panel used as icons, which read differently on every platform and let
// one glyph stand for six things.
const PATHS = {
  overview: 'M3.5 3.5h7v8.5h-7zM13.5 3.5h7v5h-7zM13.5 11.5h7v9h-7zM3.5 15h7v5.5h-7z',
  people: 'M9 4.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2',
  book: 'M12 6.5C10.2 5 7.6 4.5 3.5 4.5v14c4.1 0 6.7.5 8.5 2 1.8-1.5 4.4-2 8.5-2v-14c-4.1 0-6.7.5-8.5 2zM12 6.5v14',
  inbox: 'M3.5 13.5 6 5.5h12l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5zM3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5',
  audio: 'M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10.5v3',
  layers: 'M12 3 3 7.5 12 12l9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 3.5V8h4.5M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20.5V16h-4.5',
  calendar: 'M5.5 5h13a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3.5 9.5h17M8 3v4M16 3v4',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-up': 'm6 15 6-6 6 6',
  'chevron-right': 'm9 6 6 6-6 6',
  'chevron-left': 'm15 6-6 6 6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 4.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13zM20 20l-4.2-4.2',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  alert: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.3',
  clock: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 7.5V12l3 2',
  info: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 11v5M12 7.8v.2',
  logout: 'M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5 5.5 12 10 7.5M5.5 12H15',
  lock: 'M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  table: 'M4 5h16v14H4zM4 10h16M4 14.5h16M10 10v9',
  globe: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  key: 'M7.5 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7zM11 12h9.5M16.5 12v3M19.5 12v2',
  heart: 'M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.3-7.5 9.7-7.5 9.7z',
  pen: 'M15.5 4.5l4 4L9 19H5v-4zM13.5 6.5l4 4',
  share: 'M17 3.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM7 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM17 15.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM9.2 10.8l5.6-3.1M9.2 13.2l5.6 3.1',
  star: 'M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z',
  morning: 'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  midday: 'M7.5 15a4.5 4.5 0 0 1 9 0M3 15h18M6 19h12M12 4.5V7M5.6 8.6l1.6 1.6M18.4 8.6l-1.6 1.6',
  evening: 'M19.5 14.2A7.5 7.5 0 1 1 9.8 4.5a6 6 0 0 0 9.7 9.7z',
  compline: 'M15.5 15.6A6.5 6.5 0 1 1 7.4 7.5a5.2 5.2 0 0 0 8.1 8.1zM17.5 3.5v3M16 5h3M20.5 9v2M19.5 10h2',
  late: 'M12 4.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15zM12 8v4l2.5 1.5',
  // The Little Hours are named for the hour they keep, so each is a dial set
  // to it: prime at six, terce at nine, none at three in the afternoon.
  prime: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 7v5M12 12v4.5',
  terce: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 7v5M12 12H7.5',
  none: 'M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM12 7v5M12 12h4.5',
  filter: 'M4 5.5h16M7 12h10M10 18.5h4',
  activity: 'M3 12h4l3-7.5 4 15 3-7.5h4',
  external: 'M7 17 17 7M9 7h8v8',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l10.5-6.5z',
  copy: 'M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9',
  funnel: 'M4 5h16l-6 7.5V19l-4 1.5v-8z',
  trend: 'M3.5 16.5 9 11l4 4 7.5-7.5M15 7.5h5.5V13',
  // Feature flags
  flag: 'M5.5 21V4M5.5 4.5h12l-2.5 4.25 2.5 4.25h-12',
  trash: 'M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  // Áudio
  // Uso
  dash: 'M6 12h12'
} as const

export type OrdoIconName = keyof typeof PATHS

const props = withDefaults(defineProps<{
  name: OrdoIconName
  size?: number
  strokeWidth?: number
}>(), {
  size: 20,
  strokeWidth: 1.75
})

const path = computed(() => PATHS[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>
