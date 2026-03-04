import { buildContributionWeeks, formatLongDate, isFutureDate } from '../date';
import type { Task } from '../types';

type TaskHistoryProps = {
  tasks: Task[];
  yearDates: string[];
  today: string;
  currentYear: string;
  selectedTaskId: number | null;
};

function countCompleted(dates: string[], completionDates: string[]): number {
  const completed = new Set(completionDates);
  return dates.reduce((count, date) => count + (completed.has(date) ? 1 : 0), 0);
}

export function TaskHistory({
  tasks,
  yearDates,
  today,
  currentYear,
  selectedTaskId,
}: TaskHistoryProps) {
  const contributionWeeks = buildContributionWeeks(yearDates);
  const elapsedDates = yearDates.filter((date) => date <= today);

  return (
    <section className="panel panel--history">
      <div className="panel__header panel__header--split">
        <div>
          <p className="eyebrow">Yearly history</p>
          <h2>Each task gets a {currentYear} contribution grid.</h2>
        </div>
        <div className="history-legend">
          <span className="history-legend__item">
            <i className="history-dot history-dot--done" />
            Completed
          </span>
          <span className="history-legend__item">
            <i className="history-dot history-dot--missed" />
            Not completed
          </span>
          <span className="history-legend__item">
            <i className="history-dot history-dot--future" />
            Future day
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">Your history rows will appear here once tasks exist.</div>
      ) : (
        <div className="history-list">
          {tasks.map((task) => {
            const completedDates = new Set(task.completionDates);
            const doneCount = countCompleted(elapsedDates, task.completionDates);
            const ratio =
              elapsedDates.length === 0 ? 0 : Math.round((doneCount / elapsedDates.length) * 100);

            return (
              <article
                key={task.id}
                className={`history-row${selectedTaskId === task.id ? ' history-row--selected' : ''}`}
              >
                <div className="history-row__copy">
                  <div>
                    <h3>{task.title}</h3>
                    {task.description ? <p>{task.description}</p> : null}
                  </div>
                  <div className="history-row__stats">
                    <strong>{doneCount}</strong>
                    <span>{ratio}% of days so far</span>
                  </div>
                </div>

                <div className="history-grid-scroll">
                  <div className="contribution-chart" aria-label={`${task.title} yearly completion history`}>
                    <div className="contribution-months">
                      <span className="contribution-months__spacer" />
                      {contributionWeeks.map((week, index) => (
                        <span className="contribution-month" key={`${task.id}-month-${index}`}>
                          {week.label}
                        </span>
                      ))}
                    </div>

                    <div className="contribution-body">
                      <div className="contribution-weekdays" aria-hidden="true">
                        <span />
                        <span>Mon</span>
                        <span />
                        <span>Wed</span>
                        <span />
                        <span>Fri</span>
                        <span />
                      </div>

                      <div className="contribution-weeks">
                        {contributionWeeks.map((week, weekIndex) => (
                          <div className="contribution-week" key={`${task.id}-week-${weekIndex}`}>
                            {week.dates.map((date, dayIndex) => {
                              if (date === null) {
                                return (
                                  <span
                                    className="contribution-cell contribution-cell--pad"
                                    key={`${task.id}-pad-${weekIndex}-${dayIndex}`}
                                  />
                                );
                              }

                              const completed = completedDates.has(date);
                              const future = isFutureDate(date, today);

                              return (
                                <span
                                  key={date}
                                  className={`contribution-cell${
                                    completed
                                      ? ' contribution-cell--done'
                                      : future
                                        ? ' contribution-cell--future'
                                        : ' contribution-cell--missed'
                                  }`}
                                  title={`${formatLongDate(date)}: ${
                                    completed ? 'completed' : future ? 'future day' : 'not completed'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
