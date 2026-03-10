import type { RecurrenceType } from './types';

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days, 12, 0, 0, 0);
}

export function formatWeekdayShort(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
  }).format(parseDateOnly(value));
}

export function formatCalendarDay(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(parseDateOnly(value));
}

export function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateOnly(value));
}

export function isTodayDate(value: string, today: string): boolean {
  return value === today;
}

export function isFutureDate(value: string, today: string): boolean {
  return value > today;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type RecurrenceTaskLike = {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
};

export function dateWeekdayIndex(value: string): number {
  return parseDateOnly(value).getDay();
}

export function recurrenceLabel(recurrenceType: RecurrenceType): string {
  if (recurrenceType === 'weekdays') {
    return 'Weekdays';
  }

  if (recurrenceType === 'custom') {
    return 'Custom';
  }

  return 'Daily';
}

export function isTaskScheduledForDate(task: RecurrenceTaskLike, date: string): boolean {
  if (task.recurrenceType === 'daily') {
    return true;
  }

  const weekday = dateWeekdayIndex(date);

  if (task.recurrenceType === 'weekdays') {
    return weekday >= 1 && weekday <= 5;
  }

  return task.recurrenceDays.includes(weekday);
}

type ContributionWeek = {
  label: string;
  dates: Array<string | null>;
};

export function buildContributionWeeks(yearDates: string[]): ContributionWeek[] {
  if (yearDates.length === 0) {
    return [];
  }

  const yearDateSet = new Set(yearDates);
  const firstDate = parseDateOnly(yearDates[0]);
  const lastDate = parseDateOnly(yearDates[yearDates.length - 1]);

  const start = addDays(firstDate, -firstDate.getDay());
  const end = addDays(lastDate, 6 - lastDate.getDay());
  const weeks: ContributionWeek[] = [];

  for (let current = start; current <= end; current = addDays(current, 7)) {
    const dates: Array<string | null> = [];
    let label = '';

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = addDays(current, dayIndex);
      const dateString = formatDateOnly(day);
      const inYear = yearDateSet.has(dateString);

      dates.push(inYear ? dateString : null);

      if (inYear && day.getDate() === 1 && label === '') {
        label = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(day);
      }
    }

    if (weeks.length === 0 && label === '') {
      label = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(firstDate);
    }

    weeks.push({ label, dates });
  }

  return weeks;
}
