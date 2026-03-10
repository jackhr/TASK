import { useDeferredValue, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError, authApi, taskApi } from './api';
import { MetricsPanel } from './components/MetricsPanel';
import { TaskBoard } from './components/TaskBoard';
import { TaskForm } from './components/TaskForm';
import { TaskHistory } from './components/TaskHistory';
import type {
  LoginPayload,
  MetricsDashboard,
  RegisterPayload,
  Task,
  TaskFormValues,
  TaskPayload,
  TrackerDashboard,
  User,
} from './types';

function toPayload(values: TaskFormValues): TaskPayload {
  const recurrenceDays = Array.from(new Set(values.recurrenceDays)).sort((left, right) => left - right);

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    recurrenceType: values.recurrenceType,
    recurrenceDays,
  };
}

type AppPage = 'tracker' | 'metrics';
type AuthMode = 'login' | 'register';
type AuthFormState = {
  name: string;
  email: string;
  password: string;
};

const EMPTY_DASHBOARD: TrackerDashboard = {
  tasks: [],
  meta: {
    today: '',
    weekDates: [],
    yearDates: [],
    currentYear: '',
  },
};

const EMPTY_AUTH_FORM: AuthFormState = {
  name: '',
  email: '',
  password: '',
};

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
  const [user, setUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthFormState>(EMPTY_AUTH_FORM);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dashboard, setDashboard] = useState<TrackerDashboard>(EMPTY_DASHBOARD);
  const [metrics, setMetrics] = useState<MetricsDashboard | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  function resetWorkspace() {
    setDashboard(EMPTY_DASHBOARD);
    setMetrics(null);
    setSelectedTaskId(null);
    setSearch('');
    setIsLoading(false);
    setIsMetricsLoading(false);
    setIsSaving(false);
    setBusyTaskId(null);
  }

  function handleRequestError(requestError: unknown, options?: { suppressUnauthorized?: boolean }) {
    if (requestError instanceof ApiError && requestError.status === 401) {
      setUser(null);
      resetWorkspace();

      if (!options?.suppressUnauthorized) {
        setError('Your session expired. Please sign in again.');
      }

      return;
    }

    setError(getErrorMessage(requestError));
  }

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
      handleRequestError(requestError);
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
      handleRequestError(requestError);
    } finally {
      setIsMetricsLoading(false);
    }
  }

  async function restoreSession() {
    setIsSessionLoading(true);

    try {
      const nextUser = await authApi.me();
      setUser(nextUser);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setUser(null);
      } else {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setIsSessionLoading(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);

    try {
      const email = authForm.email.trim();
      const password = authForm.password;
      let nextUser: User;

      if (authMode === 'register') {
        const payload: RegisterPayload = {
          name: authForm.name.trim(),
          email,
          password,
        };
        nextUser = await authApi.register(payload);
      } else {
        const payload: LoginPayload = {
          email,
          password,
        };
        nextUser = await authApi.login(payload);
      }

      setUser(nextUser);
      setAuthForm(EMPTY_AUTH_FORM);
      setAuthError(null);
      setError(null);
    } catch (requestError) {
      setAuthError(getErrorMessage(requestError));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch (requestError) {
      handleRequestError(requestError, { suppressUnauthorized: true });
    } finally {
      setUser(null);
      resetWorkspace();
      setAuthMode('login');
      setAuthError(null);
      setError(null);
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
    void restoreSession();
  }, []);

  useEffect(() => {
    if (isSessionLoading || user === null) {
      return;
    }

    if (page === 'tracker') {
      void loadDashboard();
    } else {
      void loadMetrics();
    }
  }, [isSessionLoading, page, user]);

  function navigateToPage(nextPage: AppPage) {
    if (nextPage === page) {
      return;
    }

    const nextPath = pathFromPage(nextPage);
    window.history.pushState({}, '', nextPath);
    setPage(nextPage);
    setError(null);
  }

  function updateAuthField(field: keyof AuthFormState, value: string) {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }));
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
      handleRequestError(requestError);
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
      handleRequestError(requestError);
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
      handleRequestError(requestError);
    } finally {
      setBusyTaskId(null);
    }
  }

  if (isSessionLoading) {
    return (
      <div className="app-shell">
        <section className="panel panel--auth">
          <div className="empty-state">Checking your session...</div>
        </section>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="app-shell">
        <header className="hero">
          <div className="hero__copy hero__copy--lead">
            <p className="eyebrow">Daily tracker</p>
            <h1>Sign in to keep tasks private by account.</h1>
            <p className="hero__lede">
              Each account has its own tasks, completions, and metrics dashboard.
            </p>
          </div>
        </header>

        {error ? <div className="banner banner--error">{error}</div> : null}

        <main className="workspace">
          <section className="panel panel--auth">
            <div className="panel__header panel__header--split">
              <div>
                <p className="eyebrow">{authMode === 'login' ? 'Sign in' : 'Create account'}</p>
                <h2>{authMode === 'login' ? 'Welcome back.' : 'Create your tracker account.'}</h2>
              </div>
              <div className="page-nav" aria-label="Authentication mode">
                <button
                  className={`page-nav__button${authMode === 'login' ? ' page-nav__button--active' : ''}`}
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                >
                  Login
                </button>
                <button
                  className={`page-nav__button${authMode === 'register' ? ' page-nav__button--active' : ''}`}
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                >
                  Register
                </button>
              </div>
            </div>

            <form className="task-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <label className="field">
                  <span>Name</span>
                  <input
                    name="name"
                    type="text"
                    value={authForm.name}
                    onChange={(event) => updateAuthField('name', event.target.value)}
                    placeholder="Your name"
                    maxLength={120}
                    required
                  />
                </label>
              ) : null}

              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) => updateAuthField('email', event.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) => updateAuthField('password', event.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>

              {authError ? <div className="banner banner--error">{authError}</div> : null}

              <div className="task-form__actions">
                <button className="button button--primary" type="submit" disabled={isAuthenticating}>
                  {isAuthenticating
                    ? 'Submitting...'
                    : authMode === 'login'
                      ? 'Sign in'
                      : 'Create account'}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    );
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

        <div className="hero__topbar">
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
          <div className="session-bar">
            <span>{user.name}</span>
            <button
              className="button button--ghost button--compact"
              onClick={() => void handleLogout()}
              type="button"
            >
              Log out
            </button>
          </div>
        </div>

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
