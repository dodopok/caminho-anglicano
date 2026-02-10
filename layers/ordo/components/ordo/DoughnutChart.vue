<script setup lang="ts">
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, type ChartConfiguration } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

interface Props {
  labels: string[]
  data: number[]
}

const props = defineProps<Props>()

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

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: colors.slice(0, props.data.length).map(c => c + 'CC'),
        borderColor: colors.slice(0, props.data.length),
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
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
          caretSize: 8,
          callbacks: {
            label: (context) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value} (${percentage}%)`
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(44, 24, 16, 0.8)',
            font: {
              family: 'Manrope',
              size: 12,
              weight: 500
            },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
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
  <div class="doughnut-chart">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.doughnut-chart {
  position: relative;
  height: 220px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .doughnut-chart {
    height: 270px;
  }
}

@media (min-width: 1024px) {
  .doughnut-chart {
    height: 320px;
  }
}
</style>
