<script setup lang="ts">
// A single-series chart drawn in SVG: a line with a light area, or columns.
// Hover or Tab moves a cursor across the days and shows the exact value, so
// nobody has to guess a number from the height of a line.
export interface TrendPoint {
  key: string
  /** Short label for the x axis, e.g. "24 nov". */
  tick: string
  /** Full label for the tooltip, e.g. "ter, 24 de nov.". */
  title: string
  value: number
  /** Darker column, e.g. Sundays. Only used by the bars variant. */
  strong?: boolean
}

const props = withDefaults(defineProps<{
  points: TrendPoint[]
  variant?: 'area' | 'bars'
  unit?: string
  height?: number
  ariaLabel?: string
  format?: (value: number) => string
}>(), {
  variant: 'area',
  unit: '',
  height: 240,
  ariaLabel: undefined,
  format: (value: number) => Math.round(value).toLocaleString('pt-BR')
})

const hover = ref<number | null>(null)
const VIEW_W = 1000
const VIEW_H = 260
const TOP = 8
const BOTTOM = 256

const niceCeil = (value: number) => {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 3 ? 3 : fraction <= 5 ? 5 : 10
  return nice * 10 ** exponent
}

const yMax = computed(() => niceCeil(Math.max(...props.points.map(point => point.value), 0) * 1.08))
const count = computed(() => props.points.length)
const xOf = (index: number) => count.value <= 1 ? VIEW_W / 2 : index / (count.value - 1) * VIEW_W
const yOf = (value: number) => BOTTOM - value / yMax.value * (BOTTOM - TOP)

const lineD = computed(() => props.points
  .map((point, index) => `${index ? 'L' : 'M'}${xOf(index).toFixed(1)} ${yOf(point.value).toFixed(1)}`)
  .join(' '))
const areaD = computed(() => lineD.value ? `${lineD.value} L${VIEW_W} ${BOTTOM} L0 ${BOTTOM} Z` : '')

const compact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

const yTicks = computed(() => [0, 1, 2, 3].map(step => {
  const value = yMax.value / 3 * step
  return { value, top: yOf(value) / VIEW_H * 100, label: step === 0 ? '0' : compact(value) }
}))

const xTicks = computed(() => {
  const total = count.value
  if (!total) return []
  const steps = Math.min(5, total - 1)
  if (steps <= 0) return [{ index: 0, left: 50, label: props.points[0].tick, shift: '-50%' }]
  const seen = new Set<number>()
  return Array.from({ length: steps + 1 }, (_, step) => Math.round(step * (total - 1) / steps))
    .filter(index => !seen.has(index) && seen.add(index))
    .map((index, position, list) => ({
      index,
      left: index / (total - 1) * 100,
      label: props.points[index].tick,
      shift: position === 0 ? '0' : position === list.length - 1 ? '-100%' : '-50%'
    }))
})

const barHeights = computed(() => props.points.map(point => Math.max(point.value / yMax.value * 100, point.value > 0 ? 1.5 : 0)))

const tip = computed(() => {
  const index = hover.value
  if (index === null || !props.points[index]) return null
  const point = props.points[index]
  const left = props.variant === 'bars'
    ? (index + .5) / count.value * 100
    : xOf(index) / VIEW_W * 100
  const top = yOf(point.value) / VIEW_H * 100
  const shiftX = left > 82 ? 'calc(-100% + 14px)' : left < 14 ? '-14px' : '-50%'
  return {
    left,
    top,
    style: { left: `${left}%`, top: `${top}%`, transform: `translate(${shiftX}, calc(-100% - 16px))` },
    title: point.title,
    value: props.format(point.value)
  }
})

const pointLabel = (point: TrendPoint) => `${point.title}: ${props.format(point.value)}${props.unit ? ` ${props.unit}` : ''}`
</script>

<template>
  <div class="op-chart" :aria-label="ariaLabel" role="group">
    <div class="op-chart__y" :style="{ height: `${height}px` }" aria-hidden="true">
      <span v-for="tick in yTicks" :key="tick.value" :style="{ top: `${tick.top}%` }">{{ tick.label }}</span>
    </div>
    <div class="op-chart__plot-wrap">
      <div class="op-chart__plot" :style="{ height: `${height}px` }" @mouseleave="hover = null">
        <span
          v-for="tick in yTicks"
          :key="`grid-${tick.value}`"
          class="op-chart__grid"
          :class="{ 'is-base': tick.value === 0 }"
          :style="{ top: `${tick.top}%` }"
          aria-hidden="true"
        />
        <svg v-if="variant === 'area'" class="op-chart__svg" :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" preserveAspectRatio="none" aria-hidden="true">
          <path :d="areaD" fill="rgba(23, 84, 207, .07)" />
          <path :d="lineD" fill="none" stroke="var(--op-action)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        </svg>
        <div v-else class="op-chart__bars" aria-hidden="true">
          <span
            v-for="(point, index) in points"
            :key="point.key"
            :class="{ 'is-strong': point.strong, 'is-hover': hover === index }"
            :style="{ height: `${barHeights[index]}%` }"
          />
        </div>
        <template v-if="tip">
          <span v-if="variant === 'area'" class="op-chart__cross" :style="{ left: `${tip.left}%` }" aria-hidden="true" />
          <span v-if="variant === 'area'" class="op-chart__dot" :style="{ left: `${tip.left}%`, top: `${tip.top}%` }" aria-hidden="true" />
          <div class="op-tooltip" :style="tip.style" role="status">
            <small>{{ tip.title }}</small>
            <strong>{{ tip.value }}<small v-if="unit">{{ unit }}</small></strong>
          </div>
        </template>
        <div class="op-chart__hits">
          <button
            v-for="(point, index) in points"
            :key="`hit-${point.key}`"
            type="button"
            :aria-label="pointLabel(point)"
            @mouseenter="hover = index"
            @focus="hover = index"
            @blur="hover = null"
          />
        </div>
      </div>
      <div class="op-chart__x" aria-hidden="true">
        <span
          v-for="tick in xTicks"
          :key="`x-${tick.index}`"
          :style="{ left: `${variant === 'bars' ? (tick.index + .5) / count * 100 : tick.left}%`, transform: `translateX(${tick.shift})` }"
        >{{ tick.label }}</span>
      </div>
    </div>
  </div>
</template>
