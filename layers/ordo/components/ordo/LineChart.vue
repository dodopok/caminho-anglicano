<script setup lang="ts">
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, type ChartConfiguration } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

interface Props {
  labels: string[]
  data: number[]
  label?: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Dados',
  color: '#8B4513'
})

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const primaryColor = computed(() => props.color)
const gradientColor = computed(() => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return props.color

  const gradient = ctx.createLinearGradient(0, 0, 0, 300)
  gradient.addColorStop(0, `${props.color}33`)
  gradient.addColorStop(1, `${props.color}00`)
  return gradient
})

onMounted(() => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const gradient = ctx.createLinearGradient(0, 0, 0, 300)
  gradient.addColorStop(0, `${primaryColor.value}33`)
  gradient.addColorStop(1, `${primaryColor.value}00`)

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label,
        data: props.data,
        borderColor: primaryColor.value,
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: primaryColor.value,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(44, 24, 16, 0.95)',
          titleColor: '#F5F0E6',
          bodyColor: '#F5F0E6',
          titleFont: {
            family: 'Crimson Text',
            size: 14,
            weight: 600
          },
          bodyFont: {
            family: 'Manrope',
            size: 13
          },
          padding: 12,
          borderColor: 'rgba(139, 69, 19, 0.3)',
          borderWidth: 1,
          displayColors: false,
          caretSize: 8
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(44, 24, 16, 0.6)',
            font: {
              family: 'Manrope',
              size: 11
            }
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(139, 69, 19, 0.08)'
          },
          ticks: {
            color: 'rgba(44, 24, 16, 0.6)',
            font: {
              family: 'Manrope',
              size: 11
            },
            padding: 8
          },
          border: {
            display: false
          }
        }
      }
    }
  }

  chart = new Chart(ctx, config)
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
  }
})

watch(() => [props.labels, props.data], () => {
  if (chart) {
    chart.data.labels = props.labels
    chart.data.datasets[0].data = props.data
    chart.update()
  }
}, { deep: true })
</script>

<template>
  <div class="line-chart">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.line-chart {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
