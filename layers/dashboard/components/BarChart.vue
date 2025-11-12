<template>
  <div class="relative">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup lang="ts">
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, type ChartConfiguration } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

interface Props {
  labels: string[]
  data: number[]
  label: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: '#3b82f6'
})

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const createChart = () => {
  if (!chartCanvas.value) return

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        label: props.label,
        data: props.data,
        backgroundColor: props.color,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.parsed.y} ${context.parsed.y === 1 ? 'igreja' : 'igrejas'}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
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

watch(() => [props.labels, props.data], () => {
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
