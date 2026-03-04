import type { CompletionPayload, Task, TaskPayload, TrackerDashboard } from './types';

type DashboardResponse = {
  data: TrackerDashboard;
};

type TaskResponse = {
  data: Task;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: Record<string, string>;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorResponse & T;

  if (!response.ok) {
    throw new ApiError(
      data.error?.message ?? 'The request failed.',
      data.error?.details ?? {},
    );
  }

  return data as T;
}

export const taskApi = {
  async list(): Promise<TrackerDashboard> {
    const response = await request<DashboardResponse>('/tasks');
    return response.data;
  },

  async create(payload: TaskPayload): Promise<Task> {
    const response = await request<TaskResponse>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async update(id: number, payload: Partial<TaskPayload>): Promise<Task> {
    const response = await request<TaskResponse>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async setCompletion(id: number, payload: CompletionPayload): Promise<Task> {
    const response = await request<TaskResponse>(`/tasks/${id}/completion`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
};
