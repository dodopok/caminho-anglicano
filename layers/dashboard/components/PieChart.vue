<template>
  <div class="relative">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup lang="ts">
import { Chart, PieController, ArcElement, Tooltip, Legend, type ChartConfiguration } from 'chart.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

interface Props {
  labels: string[]
  data: number[]
  colors: string[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const createChart = () => {
  if (!chartCanvas.value) return

  const config: ChartConfiguration<'pie'> = {
    type: 'pie',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: props.colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 12
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  }

  chartInstance = new Chart(chartCanvas.value, config)
}

const destroyChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

watch(() => [props.labels, props.data, props.colors], () => {
  destroyChart()
  nextTick(() => createChart())
}, { deep: true })

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  destroyChart()
})
</script>
