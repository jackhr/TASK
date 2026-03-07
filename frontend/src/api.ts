import type {
  CompletionPayload,
  LoginPayload,
  MetricsDashboard,
  RegisterPayload,
  Task,
  TaskPayload,
  TrackerDashboard,
  User,
} from './types';

type DashboardResponse = {
  data: TrackerDashboard;
};

type MetricsResponse = {
  data: MetricsDashboard;
};

type TaskResponse = {
  data: Task;
};

type UserResponse = {
  data: User;
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
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
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
      response.status,
    );
  }

  return data as T;
}

export const authApi = {
  async me(): Promise<User> {
    const response = await request<UserResponse>('/auth/me');
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<User> {
    const response = await request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async login(payload: LoginPayload): Promise<User> {
    const response = await request<UserResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', {
      method: 'POST',
    });
  },
};

export const taskApi = {
  async list(): Promise<TrackerDashboard> {
    const response = await request<DashboardResponse>('/tasks');
    return response.data;
  },

  async metrics(): Promise<MetricsDashboard> {
    const response = await request<MetricsResponse>('/metrics');
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
