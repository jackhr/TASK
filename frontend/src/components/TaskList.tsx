import type { Task } from '../types';

type TaskListProps = {
  tasks: Task[];
  selectedTaskId: number | null;
  busyTaskId: number | null;
  isLoading: boolean;
  onSelect: (task: Task) => void;
  onToggleDone: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
};

const statusLabels = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
} as const;

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const;

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }

  return new Date(task.dueDate).getTime() < Date.now();
}

export function TaskList({
  tasks,
  selectedTaskId,
  busyTaskId,
  isLoading,
  onSelect,
  onToggleDone,
  onDelete,
}: TaskListProps) {
  return (
    <section className="panel panel--list">
      <div className="panel__header">
        <p className="eyebrow">Task board</p>
        <h2>{tasks.length} task{tasks.length === 1 ? '' : 's'} in view</h2>
      </div>

      {isLoading ? <div className="empty-state">Loading tasks...</div> : null}

      {!isLoading && tasks.length === 0 ? (
        <div className="empty-state">No tasks match the current filter.</div>
      ) : null}

      {!isLoading && tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map((task) => {
            const pending = busyTaskId === task.id;

            return (
              <article
                key={task.id}
                className={`task-card${selectedTaskId === task.id ? ' task-card--selected' : ''}`}
              >
                <div className="task-card__topline">
                  <span className={`pill pill--status pill--${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
                  <span className={`pill pill--priority pill--${task.priority}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </div>

                <h3>{task.title}</h3>
                <p>{task.description || 'No description yet.'}</p>

                <div className="task-card__meta">
                  <span className={isOverdue(task) ? 'meta meta--danger' : 'meta'}>
                    {formatDueDate(task.dueDate)}
                  </span>
                  <span className="meta">
                    Updated{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(task.updatedAt))}
                  </span>
                </div>

                <div className="task-card__actions">
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => onSelect(task)}
                    disabled={pending}
                  >
                    Edit
                  </button>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => void onToggleDone(task)}
                    disabled={pending}
                  >
                    {task.status === 'done' ? 'Mark todo' : 'Mark done'}
                  </button>
                  <button
                    className="button button--danger"
                    type="button"
                    onClick={() => void onDelete(task)}
                    disabled={pending}
                  >
                    {pending ? 'Working...' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

