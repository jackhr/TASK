function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
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

