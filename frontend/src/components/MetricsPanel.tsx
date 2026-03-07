import type { CSSProperties } from 'react';

import { formatCalendarDay, formatWeekdayShort } from '../date';
import type { Task } from '../types';

type MetricsPanelProps = {
  tasks: Task[];
  today: string;
  weekDates: string[];
  yearDates: string[];
  currentYear: string;
};

type MonthSummary = {
  key: string;
  label: string;
  completed: number;
  possible: number;
  rate: number | null;
};

type TaskMetric = {
  id: number;
  title: string;
  completed: number;
  rate: number;
  currentStreak: number;
  bestStreak: number;
};

function countCompletedDates(task: Task, dates: string[]): number {
  const completed = new Set(task.completionDates);
  return dates.reduce((count, date) => count + (completed.has(date) ? 1 : 0), 0);
}

function getStreaks(task: Task, dates: string[]): { current: number; best: number } {
  const completed = new Set(task.completionDates);
  let running = 0;
  let best = 0;

  for (const date of dates) {
    if (completed.has(date)) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  let current = 0;

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    if (!completed.has(dates[index])) {
      break;
    }

    current += 1;
  }

  return { current, best };
}

function buildMonthSummaries(tasks: Task[], yearDates: string[], today: string): MonthSummary[] {
  const monthMap = new Map<string, string[]>();

  for (const date of yearDates) {
    const key = date.slice(0, 7);
    const dates = monthMap.get(key) ?? [];
    dates.push(date);
    monthMap.set(key, dates);
  }

  return [...monthMap.entries()].map(([key, dates]) => {
    const elapsedDates = dates.filter((date) => date <= today);
    const possible = elapsedDates.length * tasks.length;
    const completed = tasks.reduce(
      (count, task) => count + countCompletedDates(task, elapsedDates),
      0,
    );
    const [year, month] = key.split('-').map(Number);
    const label = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(
      new Date(year, month - 1, 1, 12, 0, 0, 0),
    );

    return {
      key,
      label,
      completed,
      possible,
      rate: possible === 0 ? null : Math.round((completed / possible) * 100),
    };
  });
}

function buildTaskMetrics(tasks: Task[], elapsedYearDates: string[]): TaskMetric[] {
  return tasks
    .map((task) => {
      const completed = countCompletedDates(task, elapsedYearDates);
      const { best, current } = getStreaks(task, elapsedYearDates);

      return {
        id: task.id,
        title: task.title,
        completed,
        rate:
          elapsedYearDates.length === 0
            ? 0
            : Math.round((completed / elapsedYearDates.length) * 100),
        currentStreak: current,
        bestStreak: best,
      };
    })
    .sort((left, right) => {
      if (right.rate !== left.rate) {
        return right.rate - left.rate;
      }

      if (right.currentStreak !== left.currentStreak) {
        return right.currentStreak - left.currentStreak;
      }

      return left.title.localeCompare(right.title);
    });
}

export function MetricsPanel({
  tasks,
  today,
  weekDates,
  yearDates,
  currentYear,
}: MetricsPanelProps) {
  const elapsedYearDates = yearDates.filter((date) => date <= today);
  const totalCompleted = tasks.reduce(
    (count, task) => count + countCompletedDates(task, elapsedYearDates),
    0,
  );
  const totalPossible = tasks.length * elapsedYearDates.length;
  const overallRate = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);
  const thisWeekDates = weekDates.filter((date) => date <= today);
  const thisWeekCompleted = tasks.reduce(
    (count, task) => count + countCompletedDates(task, thisWeekDates),
    0,
  );
  const thisWeekPossible = tasks.length * thisWeekDates.length;
  const thisWeekRate =
    thisWeekPossible === 0 ? 0 : Math.round((thisWeekCompleted / thisWeekPossible) * 100);
  const monthSummaries = buildMonthSummaries(tasks, yearDates, today);
  const taskMetrics = buildTaskMetrics(tasks, elapsedYearDates);

  return (
    <section className="panel panel--metrics">
      <div className="panel__header panel__header--split">
        <div>
          <p className="eyebrow">Metrics</p>
          <h2>Spreadsheet-style summaries for the habits in view.</h2>
        </div>
        <p className="panel__note">
          Compact weekly rings, monthly pace, and a habit ranking section.
        </p>
      </div>

      <div className="metrics-summary">
        <article className="metric-card">
          <span>Habits</span>
          <strong>{tasks.length}</strong>
        </article>
        <article className="metric-card">
          <span>Completed checks</span>
          <strong>{totalCompleted}</strong>
        </article>
        <article className="metric-card metric-card--progress">
          <span>{currentYear || 'Year'} progress</span>
          <strong>{overallRate}%</strong>
          <div className="metric-progress">
            <span style={{ width: `${overallRate}%` }} />
          </div>
        </article>
        <article className="metric-card">
          <span>This week</span>
          <strong>{thisWeekRate}%</strong>
        </article>
      </div>

      <div className="metrics-layout">
        <section className="metrics-block">
          <div className="metrics-block__head">
            <h3>Daily completion</h3>
            <span>Current week</span>
          </div>
          <div className="metrics-days">
            {weekDates.map((date) => {
              const completed = tasks.reduce(
                (count, task) => count + (task.completionDates.includes(date) ? 1 : 0),
                0,
              );
              const isFuture = date > today;
              const rate = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
              const ringStyle = {
                background: isFuture
                  ? 'conic-gradient(rgba(212, 216, 210, 0.55) 0 100%)'
                  : `conic-gradient(var(--accent) 0 ${rate}%, rgba(214, 220, 208, 0.9) ${rate}% 100%)`,
              } satisfies CSSProperties;

              return (
                <article className="day-metric" key={date}>
                  <span className="day-metric__label">{formatWeekdayShort(date)}</span>
                  <strong>{formatCalendarDay(date)}</strong>
                  <div className="day-ring" style={ringStyle}>
                    <div className="day-ring__inner">{isFuture ? '--' : `${rate}%`}</div>
                  </div>
                  <small>
                    {completed}/{tasks.length || 0} done
                  </small>
                </article>
              );
            })}
          </div>
        </section>

        <section className="metrics-block">
          <div className="metrics-block__head">
            <h3>Monthly pace</h3>
            <span>{currentYear || 'Year'} to date</span>
          </div>
          <div className="month-bars">
            {monthSummaries.map((month) => (
              <div className="month-bar" key={month.key}>
                <div className="month-bar__copy">
                  <span>{month.label}</span>
                  <strong>{month.rate === null ? '--' : `${month.rate}%`}</strong>
                </div>
                <div className="month-bar__track">
                  <span style={{ width: `${month.rate ?? 0}%` }} />
                </div>
                <small>
                  {month.completed}/{month.possible || 0}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="metrics-block metrics-block--table">
        <div className="metrics-block__head">
          <h3>Habit ranking</h3>
          <span>Completion, current streak, best streak</span>
        </div>

        {taskMetrics.length === 0 ? (
          <div className="empty-state">Add tasks to generate performance metrics.</div>
        ) : (
          <div className="metrics-table">
            <div className="metrics-table__row metrics-table__row--head">
              <span>Habit</span>
              <span>Done</span>
              <span>Rate</span>
              <span>Current</span>
              <span>Best</span>
            </div>
            {taskMetrics.map((task) => (
              <div className="metrics-table__row" key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.completed}</span>
                <span>{task.rate}%</span>
                <span>{task.currentStreak}d</span>
                <span>{task.bestStreak}d</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

