<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { DateValue } from '@internationalized/date';
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
} from 'reka-ui';
import { calendarClasses } from './calendar.js';
import { glassSurfaceStrong } from './glass.js';

/**
 * A date typed by segments or picked on a calendar (UI-UX.md §2.3), in the `es-CO` locale. The value
 * is a calendar date without a time zone; the caller anchors it to America/Bogota (UI-UX.md §10).
 */
defineProps<{ labels: { open: string; previous: string; next: string }; locale?: string }>();
const model = defineModel<DateValue | null>({ default: null });
</script>

<template>
  <DatePickerRoot v-model="model" :locale="locale ?? 'es-CO'" :week-starts-on="1">
    <DatePickerField v-slot="{ segments }" :class="calendarClasses.field">
      <template v-for="item in segments" :key="item.part">
        <DatePickerInput v-if="item.part === 'literal'" :part="item.part">{{ item.value }}</DatePickerInput>
        <DatePickerInput v-else :part="item.part" :class="calendarClasses.segment">{{ item.value }}</DatePickerInput>
      </template>
      <DatePickerTrigger :aria-label="labels.open" :class="calendarClasses.trigger">
        <CalendarDays class="size-4" aria-hidden="true" />
      </DatePickerTrigger>
    </DatePickerField>
    <DatePickerContent :side-offset="4" :class="[glassSurfaceStrong, calendarClasses.content]">
      <DatePickerCalendar v-slot="{ weekDays, grid }">
        <DatePickerHeader :class="calendarClasses.header">
          <DatePickerPrev :aria-label="labels.previous" :class="calendarClasses.nav">
            <ChevronLeft class="size-4" aria-hidden="true" />
          </DatePickerPrev>
          <DatePickerHeading :class="calendarClasses.heading" />
          <DatePickerNext :aria-label="labels.next" :class="calendarClasses.nav">
            <ChevronRight class="size-4" aria-hidden="true" />
          </DatePickerNext>
        </DatePickerHeader>
        <DatePickerGrid v-for="month in grid" :key="month.value.toString()" :class="calendarClasses.grid">
          <DatePickerGridHead>
            <DatePickerGridRow :class="calendarClasses.row">
              <DatePickerHeadCell v-for="day in weekDays" :key="day" :class="calendarClasses.headCell">{{
                day
              }}</DatePickerHeadCell>
            </DatePickerGridRow>
          </DatePickerGridHead>
          <DatePickerGridBody>
            <DatePickerGridRow v-for="(week, index) in month.rows" :key="`week-${index}`" :class="calendarClasses.row">
              <DatePickerCell v-for="day in week" :key="day.toString()" :date="day">
                <DatePickerCellTrigger :day="day" :month="month.value" :class="calendarClasses.day" />
              </DatePickerCell>
            </DatePickerGridRow>
          </DatePickerGridBody>
        </DatePickerGrid>
      </DatePickerCalendar>
    </DatePickerContent>
  </DatePickerRoot>
</template>
