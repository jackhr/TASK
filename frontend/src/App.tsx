import { useDeferredValue, useEffect, useState } from 'react';

import { ApiError, taskApi } from './api';
import { MetricsPanel } from './components/MetricsPanel';
import { TaskBoard } from './components/TaskBoard';
import { TaskForm } from './components/TaskForm';
import { TaskHistory } from './components/TaskHistory';
import type {
  MetricsDashboard,
  Task,
  TaskFormValues,
  TaskPayload,
  TrackerDashboard,
} from './types';

function toPayload(values: TaskFormValues): TaskPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
  };
}

type AppPage = 'tracker' | 'metrics';

function pageFromPath(pathname: string): AppPage {
  return pathname === '/metrics' || pathname.startsWith('/metrics/') ? 'metrics' : 'tracker';
}

function pathFromPage(page: AppPage): string {
  return page === 'metrics' ? '/metrics' : '/';
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
  const [page, setPage] = useState<AppPage>(() => pageFromPath(window.location.pathname));
  const [dashboard, setDashboard] = useState<TrackerDashboard>({
    tasks: [],
    meta: {
      today: '',
      weekDates: [],
      yearDates: [],
      currentYear: '',
    },
  });
  const [metrics, setMetrics] = useState<MetricsDashboard | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
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

  async function loadMetrics() {
    setIsMetricsLoading(true);

    try {
      const nextMetrics = await taskApi.metrics();
      setMetrics(nextMetrics);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsMetricsLoading(false);
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      setPage(pageFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (page === 'tracker') {
      void loadDashboard();
    } else {
      void loadMetrics();
    }
  }, [page]);

  function navigateToPage(nextPage: AppPage) {
    if (nextPage === page) {
      return;
    }

    const nextPath = pathFromPage(nextPage);
    window.history.pushState({}, '', nextPath);
    setPage(nextPage);
    setError(null);
  }

  const tasks = dashboard.tasks;
  const { currentYear, today, weekDates, yearDates } = dashboard.meta;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    if (normalizedSearch === '') {
      return true;
    }

    return `${task.title} ${task.description}`.toLowerCase().includes(normalizedSearch);
  });

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
          <h1>Simple tasks, tighter layout, clearer metrics.</h1>
          <p className="hero__lede">
            A spreadsheet-inspired tracker with a compact weekly board, separate metrics page, and
            full-year contribution history for each habit.
          </p>
        </div>

        <nav className="page-nav" aria-label="Page navigation">
          <button
            className={`page-nav__button${page === 'tracker' ? ' page-nav__button--active' : ''}`}
            onClick={() => navigateToPage('tracker')}
            type="button"
          >
            Tracker
          </button>
          <button
            className={`page-nav__button${page === 'metrics' ? ' page-nav__button--active' : ''}`}
            onClick={() => navigateToPage('metrics')}
            type="button"
          >
            Metrics
          </button>
        </nav>

        {page === 'tracker' ? (
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
        ) : null}
      </header>

      {error ? <div className="banner banner--error">{error}</div> : null}

      <main className="workspace">
        {page === 'tracker' ? (
          <>
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
              yearDates={yearDates}
              today={today}
              currentYear={currentYear}
              selectedTaskId={selectedTaskId}
            />
          </>
        ) : (
          <MetricsPanel
            metrics={metrics}
            isLoading={isMetricsLoading}
          />
        )}
      </main>
    </div>
  );
}
