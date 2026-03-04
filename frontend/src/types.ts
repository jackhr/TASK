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
