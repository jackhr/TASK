import { formatLongDate } from '../date';
import type { Task } from '../types';

type TaskHistoryProps = {
  tasks: Task[];
  historyDates: string[];
  selectedTaskId: number | null;
};

function countCompleted(historyDates: string[], completionDates: string[]): number {
  const completed = new Set(completionDates);
  return historyDates.reduce((count, date) => count + (completed.has(date) ? 1 : 0), 0);
}

export function TaskHistory({ tasks, historyDates, selectedTaskId }: TaskHistoryProps) {
  return (
    <section className="panel panel--history">
      <div className="panel__header panel__header--split">
        <div>
          <p className="eyebrow">Completion history</p>
          <h2>Each task gets its own recent streak strip.</h2>
        </div>
        <div className="history-legend">
          <span className="history-legend__item">
            <i className="history-dot history-dot--done" />
            Completed
          </span>
          <span className="history-legend__item">
            <i className="history-dot history-dot--missed" />
            Missed
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">Your history rows will appear here once tasks exist.</div>
      ) : (
        <div className="history-list">
          {tasks.map((task) => {
            const completedDates = new Set(task.completionDates);
            const doneCount = countCompleted(historyDates, task.completionDates);
            const ratio = historyDates.length === 0 ? 0 : Math.round((doneCount / historyDates.length) * 100);

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
                    <span>{ratio}% of recent days</span>
                  </div>
                </div>

                <div className="history-strip" aria-label={`${task.title} recent completion history`}>
                  {historyDates.map((date) => (
                    <span
                      key={date}
                      className={`history-cell${
                        completedDates.has(date) ? ' history-cell--done' : ' history-cell--missed'
                      }`}
                      title={`${formatLongDate(date)}: ${completedDates.has(date) ? 'completed' : 'missed'}`}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

