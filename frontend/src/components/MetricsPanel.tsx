import type { CSSProperties } from 'react';

import { formatCalendarDay, formatWeekdayShort } from '../date';
import type { MetricsDashboard } from '../types';

type MetricsPanelProps = {
  metrics: MetricsDashboard | null;
  isLoading: boolean;
};
export function MetricsPanel({ metrics, isLoading }: MetricsPanelProps) {
  if (isLoading) {
    return (
      <section className="panel panel--metrics">
        <div className="empty-state">Loading metrics...</div>
      </section>
    );
  }

  if (metrics === null) {
    return (
      <section className="panel panel--metrics">
        <div className="empty-state">No metrics available yet.</div>
      </section>
    );
  }

  const { currentYear, monthly, ranking, summary, weekly } = metrics;

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
          <strong>{summary.habits}</strong>
        </article>
        <article className="metric-card">
          <span>Completed checks</span>
          <strong>{summary.completedChecks}</strong>
        </article>
        <article className="metric-card metric-card--progress">
          <span>{currentYear || 'Year'} progress</span>
          <strong>{summary.yearlyRate}%</strong>
          <div className="metric-progress">
            <span style={{ width: `${summary.yearlyRate}%` }} />
          </div>
        </article>
        <article className="metric-card">
          <span>This week</span>
          <strong>{summary.weekRate}%</strong>
        </article>
      </div>

      <div className="metrics-layout">
        <section className="metrics-block">
          <div className="metrics-block__head">
            <h3>Daily completion</h3>
            <span>Current week</span>
          </div>
          <div className="metrics-days">
            {weekly.map((day) => {
              const ringStyle = {
                background: day.future
                  ? 'conic-gradient(rgba(212, 216, 210, 0.55) 0 100%)'
                  : `conic-gradient(var(--accent) 0 ${day.rate ?? 0}%, rgba(214, 220, 208, 0.9) ${day.rate ?? 0}% 100%)`,
              } satisfies CSSProperties;

              return (
                <article className="day-metric" key={day.date}>
                  <span className="day-metric__label">{formatWeekdayShort(day.date)}</span>
                  <strong>{formatCalendarDay(day.date)}</strong>
                  <div className="day-ring" style={ringStyle}>
                    <div className="day-ring__inner">
                      {day.future ? '--' : `${day.rate ?? 0}%`}
                    </div>
                  </div>
                  <small>
                    {day.completed}/{day.total || 0} done
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
            {monthly.map((month) => (
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

        {ranking.length === 0 ? (
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
            {ranking.map((task) => (
              <div className="metrics-table__row" key={task.taskId}>
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
