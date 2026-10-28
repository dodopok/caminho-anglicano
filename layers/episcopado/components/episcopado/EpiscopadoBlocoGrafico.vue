<template>
  <figure>
    <div class="relative h-64 w-full rounded-ep border border-ep-line bg-ep-card p-3">
      <canvas ref="canvas" role="img" :aria-label="summary" />
    </div>
    <figcaption class="sr-only">{{ summary }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { BarController, BarElement, CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'
import type { Bloco } from '../../lib/pergunta/blocos'

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

/** Gráfico de barras ou linha do Pergunte à Rede, nas cores da rede (granada sobre papel). */
const props = defineProps<{ bloco: Extract<Bloco, { tipo: 'grafico' }> }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const summary = computed(() => `${props.bloco.titulo ?? 'Gráfico'}: ${props.bloco.labels.map((l, i) => `${l}, ${props.bloco.data[i]}`).join('; ')}`)

function draw() {
  chart?.destroy()
  if (!canvas.value) return
  const line = props.bloco.forma === 'linha'
  chart = new Chart(canvas.value, {
    type: line ? 'line' : 'bar',
    data: {
      labels: props.bloco.labels,
      datasets: [
        {
          label: props.bloco.y,
          data: props.bloco.data,
          backgroundColor: line ? '#8b2e1f' : 'rgba(139, 46, 31, 0.78)',
          borderColor: '#8b2e1f',
          borderWidth: line ? 2 : 0,
          borderRadius: 1,
          pointRadius: line ? 2.5 : 0,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#15130f', titleFont: { family: 'IBM Plex Sans', size: 12 }, bodyFont: { family: 'IBM Plex Sans', size: 12 }, padding: 8, cornerRadius: 2 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6b6354', font: { family: 'IBM Plex Sans', size: 11 } } },
        y: { beginAtZero: true, grid: { color: '#ece8de' }, ticks: { color: '#6b6354', precision: 0, font: { family: 'IBM Plex Sans', size: 11 } } }
      }
    }
  })
}

onMounted(draw)
watch(() => props.bloco, draw)
onBeforeUnmount(() => chart?.destroy())
</script>
