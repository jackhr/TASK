export type RecurrenceType = 'daily' | 'weekdays' | 'custom';

export interface Task {
  id: number;
  title: string;
  description: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  completionDates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskPayload {
  title: string;
  description: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
}

export interface TaskFormValues {
  title: string;
  description: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
}

export interface CompletionPayload {
  date: string;
  completed: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface TrackerMeta {
  today: string;
  weekDates: string[];
  yearDates: string[];
  currentYear: string;
}

export interface TrackerDashboard {
  tasks: Task[];
  meta: TrackerMeta;
}

export interface MetricsSummary {
  habits: number;
  completedChecks: number;
  yearlyRate: number;
  weekRate: number;
}

export interface MetricsDay {
  date: string;
  completed: number;
  total: number;
  rate: number | null;
  future: boolean;
}

export interface MetricsMonth {
  key: string;
  label: string;
  completed: number;
  possible: number;
  rate: number | null;
}

export interface MetricsRankingRow {
  taskId: number;
  title: string;
  completed: number;
  rate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface MetricsDashboard {
  today: string;
  currentYear: string;
  summary: MetricsSummary;
  weekly: MetricsDay[];
  monthly: MetricsMonth[];
  ranking: MetricsRankingRow[];
}
