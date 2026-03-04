import { useDeferredValue, useEffect, useState } from 'react';

import { ApiError, taskApi } from './api';
import { TaskBoard } from './components/TaskBoard';
import { TaskForm } from './components/TaskForm';
import { TaskHistory } from './components/TaskHistory';
import type { Task, TaskFormValues, TaskPayload, TrackerDashboard } from './types';

function toPayload(values: TaskFormValues): TaskPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
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
  const [dashboard, setDashboard] = useState<TrackerDashboard>({
    tasks: [],
    meta: {
      today: '',
      weekDates: [],
      historyDates: [],
    },
  });
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const nextDashboard = await taskApi.list();
      setDashboard(nextDashboard);
      setSelectedTaskId((currentId) =>
        nextDashboard.tasks.some((task) => task.id === currentId) ? currentId : null,
      );
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const tasks = dashboard.tasks;
  const { historyDates, today, weekDates } = dashboard.meta;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    if (normalizedSearch === '') {
      return true;
    }

    return `${task.title} ${task.description}`.toLowerCase().includes(normalizedSearch);
  });

  const doneToday = today === ''
    ? 0
    : tasks.reduce(
        (count, task) => count + (task.completionDates.includes(today) ? 1 : 0),
        0,
      );
  const totalHistoryChecks = tasks.reduce(
    (count, task) =>
      count +
      historyDates.reduce(
        (taskCount, date) => taskCount + (task.completionDates.includes(date) ? 1 : 0),
        0,
      ),
    0,
  );
  const possibleHistoryChecks = tasks.length * historyDates.length;
  const historyCompletionRate =
    possibleHistoryChecks === 0 ? 0 : Math.round((totalHistoryChecks / possibleHistoryChecks) * 100);

  const weekCheckCount = tasks.reduce(
    (count, task) =>
      count +
      weekDates.reduce(
        (taskCount, date) => taskCount + (task.completionDates.includes(date) ? 1 : 0),
        0,
      ),
    0,
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

      await loadDashboard();
      setSelectedTaskId(null);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleCompletion(task: Task, completed: boolean) {
    if (today === '') {
      return;
    }

    setBusyTaskId(task.id);

    try {
      await taskApi.setCompletion(task.id, {
        date: today,
        completed,
      });
      await loadDashboard();
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

      await loadDashboard();
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
        <div className="hero__copy hero__copy--lead">
          <p className="eyebrow">Daily tracker</p>
          <h1>Simple tasks, checked once per day.</h1>
          <p className="hero__lede">
            Build a lightweight routine board: task names on the left, a weekly checkbox run on
            the right, then a longer visual history underneath.
          </p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span>Tasks</span>
            <strong>{tasks.length}</strong>
          </article>
          <article className="stat-card">
            <span>Done today</span>
            <strong>{doneToday}</strong>
          </article>
          <article className="stat-card">
            <span>Week checks</span>
            <strong>{weekCheckCount}</strong>
          </article>
          <article className="stat-card">
            <span>Recent rate</span>
            <strong>{historyCompletionRate}%</strong>
          </article>
        </div>

        <div className="hero__toolbar">
          <div className="hero__copy hero__copy--search">
            <label className="field field--search">
              <span>Filter tasks</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by task name or note"
              />
            </label>
          </div>
          <TaskForm
            task={selectedTask}
            isSaving={isSaving}
            onCancel={() => setSelectedTaskId(null)}
            onSubmit={handleSave}
          />
        </div>
      </header>

      {error ? <div className="banner banner--error">{error}</div> : null}

      <main className="workspace">
        <TaskBoard
          tasks={visibleTasks}
          today={today}
          weekDates={weekDates}
          selectedTaskId={selectedTaskId}
          busyTaskId={busyTaskId}
          isLoading={isLoading}
          onSelect={(task) => setSelectedTaskId(task.id)}
          onDelete={handleDelete}
          onToggleCompletion={handleToggleCompletion}
        />
        <TaskHistory
          tasks={visibleTasks}
          historyDates={historyDates}
          selectedTaskId={selectedTaskId}
        />
      </main>
    </div>
  );
}
