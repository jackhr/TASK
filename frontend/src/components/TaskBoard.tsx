import {
  formatCalendarDay,
  formatWeekdayShort,
  isFutureDate,
  isTaskScheduledForDate,
  isTodayDate,
  recurrenceLabel,
} from '../date';
import type { Task } from '../types';

type TaskBoardProps = {
  tasks: Task[];
  today: string;
  weekDates: string[];
  selectedTaskId: number | null;
  busyTaskId: number | null;
  isLoading: boolean;
  onSelect: (task: Task) => void;
  onDelete: (task: Task) => Promise<void>;
  onToggleCompletion: (task: Task, completed: boolean) => Promise<void>;
};

export function TaskBoard({
  tasks,
  today,
  weekDates,
  selectedTaskId,
  busyTaskId,
  isLoading,
  onSelect,
  onDelete,
  onToggleCompletion,
}: TaskBoardProps) {
  return (
    <section className="panel panel--board">
      <div className="panel__header panel__header--split">
        <div>
          <p className="eyebrow">Weekly board</p>
          <h2>Task list left, daily checks right.</h2>
        </div>
        <p className="panel__note">
          Today is the only editable column. The rest stay visible for pattern tracking.
        </p>
      </div>

      <div className="board-scroll">
        <div className="tracker-board">
          <div className="tracker-board__header tracker-board__cell tracker-board__cell--task">
            Task
          </div>
          {weekDates.map((date) => (
            <div
              key={date}
              className={`tracker-board__header${isTodayDate(date, today) ? ' tracker-board__header--today' : ''}`}
            >
              <span>{formatWeekdayShort(date)}</span>
              <strong>{formatCalendarDay(date)}</strong>
            </div>
          ))}

          {isLoading ? (
            <div className="empty-state empty-state--board">Loading tasks...</div>
          ) : null}

          {!isLoading && tasks.length === 0 ? (
            <div className="empty-state empty-state--board">
              Add your first repeating task to start tracking daily progress.
            </div>
          ) : null}

          {!isLoading
            ? tasks.map((task) => {
                const completedDates = new Set(task.completionDates);
                const pending = busyTaskId === task.id;

                return (
                  <div className="tracker-board__row" key={task.id}>
                    <div
                      className={`tracker-board__cell tracker-board__cell--task${
                        selectedTaskId === task.id ? ' tracker-board__cell--selected' : ''
                      }`}
                    >
                      <div className="tracker-task">
                        <button
                          className="tracker-task__title"
                          type="button"
                          onClick={() => onSelect(task)}
                        >
                          {task.title}
                        </button>
                        <div className="tracker-task__meta">
                          <span>{recurrenceLabel(task.recurrenceType)}</span>
                        </div>
                        {task.description ? (
                          <p className="tracker-task__description">{task.description}</p>
                        ) : null}
                        <div className="tracker-task__actions">
                          <button
                            className="button button--ghost button--compact"
                            type="button"
                            onClick={() => onSelect(task)}
                            disabled={pending}
                          >
                            Edit
                          </button>
                          <button
                            className="button button--danger button--compact"
                            type="button"
                            onClick={() => void onDelete(task)}
                            disabled={pending}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {weekDates.map((date) => {
                      const checked = completedDates.has(date);
                      const scheduled = isTaskScheduledForDate(task, date);
                      const disabled = pending || date !== today || !scheduled;

                      return (
                        <div className="tracker-board__cell tracker-board__cell--day" key={date}>
                          <label
                            className={`check-shell${
                              checked ? ' check-shell--checked' : ''
                            }${!scheduled ? ' check-shell--unscheduled' : ''}${
                              isFutureDate(date, today) ? ' check-shell--future' : ''
                            }`}
                            title={`${task.title}: ${date}${scheduled ? '' : ' (not scheduled)'}`}
                          >
                            <input
                              checked={checked}
                              disabled={disabled}
                              type="checkbox"
                              onChange={(event) =>
                                void onToggleCompletion(task, event.target.checked)
                              }
                            />
                            <span className="check-shell__box" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            : null}
        </div>
      </div>
    </section>
  );
}
