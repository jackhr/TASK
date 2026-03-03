import { useDeferredValue, useEffect, useState } from 'react';

import { ApiError, taskApi } from './api';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import type { Task, TaskFilter, TaskFormValues, TaskPayload } from './types';

function toPayload(values: TaskFormValues): TaskPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate.trim() === '' ? null : values.dueDate,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detailMessage = Object.values(error.details).join(' ');
    return detailMessage ? `${error.message} ${detailMessage}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskFilter>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  async function loadTasks() {
    setIsLoading(true);

    try {
      const nextTasks = await taskApi.list();
      setTasks(nextTasks);
      setSelectedTaskId((currentId) =>
        nextTasks.some((task) => task.id === currentId) ? currentId : null,
      );
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }

    if (normalizedSearch === '') {
      return true;
    }

    return `${task.title} ${task.description}`.toLowerCase().includes(normalizedSearch);
  });

  const stats = tasks.reduce(
    (summary, task) => {
      summary.total += 1;
      summary[task.status] += 1;

      if (task.priority === 'high') {
        summary.highPriority += 1;
      }

      return summary;
    },
    {
      total: 0,
      todo: 0,
      in_progress: 0,
      done: 0,
      highPriority: 0,
    },
  );

  async function handleSave(values: TaskFormValues) {
    setIsSaving(true);

    try {
      const payload = toPayload(values);

      if (selectedTaskId === null) {
        await taskApi.create(payload);
      } else {
        await taskApi.update(selectedTaskId, payload);
      }

      await loadTasks();
      setSelectedTaskId(null);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleDone(task: Task) {
    setBusyTaskId(task.id);

    try {
      await taskApi.update(task.id, {
        status: task.status === 'done' ? 'todo' : 'done',
      });
      await loadTasks();
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    setBusyTaskId(task.id);

    try {
      await taskApi.remove(task.id);

      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
      }

      await loadTasks();
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Starter workspace</p>
          <h1>Task management for a PHP + React deployment flow.</h1>
          <p className="hero__lede">
            This first pass focuses on a working stack: task CRUD, filtering, and a layout
            you can reshape once you share the final UI direction.
          </p>
        </div>

        <div className="hero__toolbar">
          <label className="field field--search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or description"
            />
          </label>

          <div className="filter-strip" role="tablist" aria-label="Task status filters">
            {(['all', 'todo', 'in_progress', 'done'] as const).map((filter) => (
              <button
                key={filter}
                className={`filter-chip${statusFilter === filter ? ' filter-chip--active' : ''}`}
                type="button"
                onClick={() => setStatusFilter(filter)}
              >
                {filter === 'all'
                  ? 'All'
                  : filter === 'in_progress'
                    ? 'In progress'
                    : filter === 'todo'
                      ? 'To do'
                      : 'Done'}
              </button>
            ))}
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card">
            <span>To do</span>
            <strong>{stats.todo}</strong>
          </article>
          <article className="stat-card">
            <span>In progress</span>
            <strong>{stats.in_progress}</strong>
          </article>
          <article className="stat-card">
            <span>High priority</span>
            <strong>{stats.highPriority}</strong>
          </article>
        </div>
      </header>

      {error ? <div className="banner banner--error">{error}</div> : null}

      <main className="workspace">
        <TaskForm
          task={selectedTask}
          isSaving={isSaving}
          onCancel={() => setSelectedTaskId(null)}
          onSubmit={handleSave}
        />
        <TaskList
          tasks={visibleTasks}
          selectedTaskId={selectedTaskId}
          busyTaskId={busyTaskId}
          isLoading={isLoading}
          onSelect={(task) => setSelectedTaskId(task.id)}
          onToggleDone={handleToggleDone}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
