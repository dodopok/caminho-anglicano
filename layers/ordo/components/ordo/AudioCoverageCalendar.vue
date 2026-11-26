<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { calendarBucket, coverageText, dayTitle, type CalendarCells, type CalendarColumn, type LiturgicalDays } from '../../utils/audio'
import { liturgicalColor, liturgicalColorName } from '../../utils/liturgical'
import { OFFICE_META } from '../../utils/series'

// Where voice is missing, office by day: each square is one office of one
// day, coloured by how much of it already has voice. Sundays are red as in
// the calendar, today is outlined, the square open below is ringed in blue.
// When the API names the day in the book's calendar, the name goes in each
// square's tooltip and label, and a dot under the date carries its colour.
const props = defineProps<{
  columns: CalendarColumn[]
  offices: string[]
  cells: CalendarCells
  liturgical?: LiturgicalDays
  picked?: { date: string; office: string } | null
}>()

const emit = defineEmits<{ pick: [date: string, office: string] }>()

const day = (date: string) => dayTitle(date, props.liturgical?.[date])
const dot = (date: string) => liturgicalColor(props.liturgical?.[date]?.color)
const heading = (date: string) => {
  const colour = liturgicalColorName(props.liturgical?.[date]?.color)
  return colour ? `${day(date)} (${colour})` : day(date)
}
const label = (date: string, office: string) => {
  const cell = props.cells[date]?.[office]
  const name = OFFICE_META[office]?.label || office
  if (!cell) return `${day(date)}, ${name}: sem este ofício`
  return `${day(date)}, ${name}: ${coverageText(cell.percentage)} com voz, ${cell.missing_clips} trechos faltando`
}
</script>

<template>
  <div class="op-table-wrap">
    <table class="op-cal">
      <thead>
        <tr>
          <th class="op-cal__row" scope="col"><span class="op-sr-only">Ofício</span></th>
          <th v-for="column in columns" :key="column.date" scope="col" :class="{ 'is-sun': column.sunday }" :title="heading(column.date)">
            <span aria-hidden="true">{{ column.initial }}<br>{{ column.day }}</span>
            <span class="op-sr-only">{{ heading(column.date) }}</span>
            <i v-if="dot(column.date)" class="op-cal__lit" :style="{ background: dot(column.date)! }" aria-hidden="true" />
          </th>
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
            <button v-if="cells[column.date]?.[office]" type="button" :aria-label="label(column.date, office)" :title="label(column.date, office)" :aria-pressed="picked?.date === column.date && picked?.office === office" @click="emit('pick', column.date, office)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
