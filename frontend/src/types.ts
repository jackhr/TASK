export interface Task {
  id: number;
  title: string;
  description: string;
  completionDates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskPayload {
  title: string;
  description: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
}

export interface CompletionPayload {
  date: string;
  completed: boolean;
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
