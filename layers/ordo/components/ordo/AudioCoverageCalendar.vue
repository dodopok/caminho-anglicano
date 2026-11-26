<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { calendarBucket, coverageText, longDay, type CalendarCells, type CalendarColumn } from '../../utils/audio'
import { OFFICE_META } from '../../utils/series'

// Where voice is missing, office by day: each square is one office of one
// day, coloured by how much of it already has voice. Sundays are red as in
// the calendar, today is outlined, the square open below is ringed in blue.
const props = defineProps<{
  columns: CalendarColumn[]
  offices: string[]
  cells: CalendarCells
  picked?: { date: string; office: string } | null
}>()

const emit = defineEmits<{ pick: [date: string, office: string] }>()

const label = (date: string, office: string) => {
  const cell = props.cells[date]?.[office]
  const name = OFFICE_META[office]?.label || office
  if (!cell) return `${longDay(date)}, ${name}: sem este ofício`
  return `${longDay(date)}, ${name}: ${coverageText(cell.percentage)} com voz, ${cell.missing_clips} trechos faltando`
}
</script>

<template>
  <div class="op-table-wrap">
    <table class="op-cal">
      <thead>
        <tr>
          <th class="op-cal__row" scope="col"><span class="op-sr-only">Ofício</span></th>
          <th v-for="column in columns" :key="column.date" scope="col" :class="{ 'is-sun': column.sunday }">{{ column.initial }}<br>{{ column.day }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="office in offices" :key="office">
          <th class="op-cal__row" scope="row"><span><OrdoIcon :name="OFFICE_META[office]?.icon || 'clock'" :size="15" />{{ OFFICE_META[office]?.label || office }}</span></th>
          <td
            v-for="column in columns"
            :key="column.date"
            :class="[calendarBucket(cells[column.date]?.[office]), { 'is-today': column.today, 'is-picked': picked?.date === column.date && picked?.office === office }]"
          >
            <button v-if="cells[column.date]?.[office]" type="button" :aria-label="label(column.date, office)" :aria-pressed="picked?.date === column.date && picked?.office === office" @click="emit('pick', column.date, office)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
