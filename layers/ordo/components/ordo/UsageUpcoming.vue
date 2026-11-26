<script setup lang="ts">
import OrdoChartCard from './ChartCard.vue'
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import { createReport, errorText } from '../../composables/useReport'
import { useUsageApi, type CalendarDay } from '../../composables/useUsageApi'
import { useUsageContext } from '../../composables/useUsageContext'
import { toDateInput } from '../../utils/period'
import { slugify } from '../../utils/slug'
import { addDays, daysBetween, shortDate, type ContentItem } from '../../utils/usage'

// "Vem aí": the feasts of the next 14 days, from the liturgical calendar, with
// how much each one is already being opened.
const props = defineProps<{ saints: ContentItem[] }>()

const api = useUsageApi()
const { today, reloadKey } = useUsageContext()
const DAYS = 14

const calendar = createReport<CalendarDay[]>(async () => {
  const start = toDateInput(today())
  const end = addDays(start, DAYS - 1)
  const months = [...new Set([start.slice(0, 7), end.slice(0, 7)])]
  const answers = await Promise.all(months.map(month => api.calendarMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)))))
  return answers.flat().filter(day => day.date >= start && day.date <= end)
}, { lazy: false })
watch(reloadKey, () => calendar.load(), { immediate: true })

const items = computed(() => {
  const start = toDateInput(today())
  return (calendar.state.data || [])
    .filter(day => day.celebration_name || (new Date(`${day.date}T12:00:00`).getDay() === 0 && day.week_name))
    .slice(0, 4)
    .map(day => {
      const name = day.celebration_name || day.week_name || ''
      const sunday = new Date(`${day.date}T12:00:00`).getDay() === 0
      const slug = slugify(name)
      // By the CMS title when the API sends it, by the slug otherwise.
      const rank = props.saints.findIndex(item => (item.title && slugify(item.title) === slug) || item.slug === slug || item.slug.startsWith(`${slug}-`) || slug.startsWith(item.slug))
      const left = daysBetween(start, day.date) - 1
      const when = left === 0 ? 'É hoje' : left === 1 ? 'É amanhã' : `Faltam ${left} dias`
      const detail = rank >= 0
        ? `Já é o ${rank + 1}º mais aberto${left > 1 ? ` e ainda faltam ${left} dias` : ''}.`
        : `${when}; ainda não foi aberto no período.`
      return { key: day.date, title: `${shortDate(day.date)} · ${name}.`, detail, icon: sunday ? 'calendar' as const : 'star' as const, tone: sunday ? 'op-tone-gold' : 'op-tone-info' }
    })
})
</script>

<template>
  <OrdoChartCard eyebrow="Para preparar" title="Vem aí" description="Datas dos próximos 14 dias, do calendário litúrgico, com o que já se abre de cada uma." :loading="calendar.state.loading && !calendar.state.data">
    <OrdoSoonState v-if="calendar.state.soon" title="Em breve" text="O calendário não respondeu nesta API." />
    <ul v-else-if="items.length" class="op-moves">
      <li v-for="item in items" :key="item.key">
        <span class="op-moves__icon" :class="item.tone"><OrdoIcon :name="item.icon" :size="15" /></span>
        <span><b>{{ item.title }}</b> {{ item.detail }}</span>
      </li>
    </ul>
    <p v-else class="op-empty">{{ errorText(calendar.state.error) || 'Nenhuma festa nos próximos 14 dias.' }}</p>
    <template #footer><span>Com um ano de telemetria, cada data mostra também quanto foi aberta no ano anterior.</span></template>
  </OrdoChartCard>
</template>
