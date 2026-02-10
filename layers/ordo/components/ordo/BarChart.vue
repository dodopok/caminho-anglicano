<script setup lang="ts">
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, type ChartConfiguration } from 'chart.js'

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip)

interface Props {
  labels: string[]
  data: number[]
  label?: string
  horizontal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Dados',
  horizontal: false
})

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const colors = [
  '#8B4513',
  '#B8860B',
  '#CD853F',
  '#DAA520',
  '#D2691E',
  '#A0522D',
  '#8B7355',
  '#BC8F8F'
]

onMounted(() => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label,
        data: props.data,
        backgroundColor: props.data.map((_, index) => colors[index % colors.length] + '99'),
        borderColor: props.data.map((_, index) => colors[index % colors.length]),
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: props.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
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
          displayColors: true,
          caretSize: 8
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: !props.horizontal,
            color: 'rgba(139, 69, 19, 0.08)'
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
            display: props.horizontal,
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
  <div class="bar-chart">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.bar-chart {
  position: relative;
  height: 200px;
  width: 100%;
}

@media (min-width: 640px) {
  .bar-chart {
    height: 250px;
  }
}

@media (min-width: 1024px) {
  .bar-chart {
    height: 300px;
  }
}
</style>
