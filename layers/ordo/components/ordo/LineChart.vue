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
  color: '#496451'
})

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const primaryColor = computed(() => props.color)
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
          backgroundColor: 'rgba(35, 51, 40, 0.96)',
          titleColor: '#F8FAF5',
          bodyColor: '#F8FAF5',
          titleFont: {
            family: 'Fraunces',
            size: 14,
            weight: 600
          },
          bodyFont: {
            family: 'DM Sans',
            size: 13
          },
          padding: 12,
          borderColor: 'rgba(201, 147, 77, 0.4)',
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
            color: 'rgba(50, 73, 56, 0.62)',
            font: {
              family: 'DM Sans',
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
            color: 'rgba(50, 73, 56, 0.62)',
            font: {
              family: 'DM Sans',
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
  height: 200px;
  width: 100%;
}

@media (min-width: 640px) {
  .line-chart {
    height: 250px;
  }
}

@media (min-width: 1024px) {
  .line-chart {
    height: 300px;
  }
}
</style>
