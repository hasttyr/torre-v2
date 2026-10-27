<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { DateRange } from 'reka-ui';
import {
  DateRangePickerCalendar,
  DateRangePickerCell,
  DateRangePickerCellTrigger,
  DateRangePickerContent,
  DateRangePickerField,
  DateRangePickerGrid,
  DateRangePickerGridBody,
  DateRangePickerGridHead,
  DateRangePickerGridRow,
  DateRangePickerHeadCell,
  DateRangePickerHeader,
  DateRangePickerHeading,
  DateRangePickerInput,
  DateRangePickerNext,
  DateRangePickerPrev,
  DateRangePickerRoot,
  DateRangePickerTrigger,
} from 'reka-ui';
import { calendarClasses } from './calendar.js';
import { glassSurfaceStrong } from './glass.js';

/** A range of dates (from–to), typed or picked on a calendar, like DatePicker (UI-UX.md §2.3). */
defineProps<{ labels: { open: string; previous: string; next: string }; locale?: string }>();
const model = defineModel<DateRange | null>({ default: null });
</script>

<template>
  <DateRangePickerRoot v-model="model" :locale="locale ?? 'es-CO'" :week-starts-on="1">
    <DateRangePickerField v-slot="{ segments }" :class="calendarClasses.field">
      <template v-for="item in segments.start" :key="`start-${item.part}`">
        <DateRangePickerInput v-if="item.part === 'literal'" :part="item.part" type="start">{{
          item.value
        }}</DateRangePickerInput>
        <DateRangePickerInput v-else :part="item.part" type="start" :class="calendarClasses.segment">{{
          item.value
        }}</DateRangePickerInput>
      </template>
      <span aria-hidden="true" class="px-1 text-muted-foreground">–</span>
      <template v-for="item in segments.end" :key="`end-${item.part}`">
        <DateRangePickerInput v-if="item.part === 'literal'" :part="item.part" type="end">{{
          item.value
        }}</DateRangePickerInput>
        <DateRangePickerInput v-else :part="item.part" type="end" :class="calendarClasses.segment">{{
          item.value
        }}</DateRangePickerInput>
      </template>
      <DateRangePickerTrigger :aria-label="labels.open" :class="calendarClasses.trigger">
        <CalendarDays class="size-4" aria-hidden="true" />
      </DateRangePickerTrigger>
    </DateRangePickerField>
    <DateRangePickerContent :side-offset="4" :class="[glassSurfaceStrong, calendarClasses.content]">
      <DateRangePickerCalendar v-slot="{ weekDays, grid }">
        <DateRangePickerHeader :class="calendarClasses.header">
          <DateRangePickerPrev :aria-label="labels.previous" :class="calendarClasses.nav">
            <ChevronLeft class="size-4" aria-hidden="true" />
          </DateRangePickerPrev>
          <DateRangePickerHeading :class="calendarClasses.heading" />
          <DateRangePickerNext :aria-label="labels.next" :class="calendarClasses.nav">
            <ChevronRight class="size-4" aria-hidden="true" />
          </DateRangePickerNext>
        </DateRangePickerHeader>
        <DateRangePickerGrid v-for="month in grid" :key="month.value.toString()" :class="calendarClasses.grid">
          <DateRangePickerGridHead>
            <DateRangePickerGridRow :class="calendarClasses.row">
              <DateRangePickerHeadCell v-for="day in weekDays" :key="day" :class="calendarClasses.headCell">{{
                day
              }}</DateRangePickerHeadCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridHead>
          <DateRangePickerGridBody>
            <DateRangePickerGridRow
              v-for="(week, index) in month.rows"
              :key="`week-${index}`"
              :class="calendarClasses.row"
            >
              <DateRangePickerCell v-for="day in week" :key="day.toString()" :date="day">
                <DateRangePickerCellTrigger :day="day" :month="month.value" :class="calendarClasses.day" />
              </DateRangePickerCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridBody>
        </DateRangePickerGrid>
      </DateRangePickerCalendar>
    </DateRangePickerContent>
  </DateRangePickerRoot>
</template>
