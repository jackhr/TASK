import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import type { Task, TaskFormValues } from '../types';

type TaskFormProps = {
  task: Task | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
};

const EMPTY_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
};

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function createFormState(task: Task | null): TaskFormValues {
  if (!task) {
    return EMPTY_FORM;
  }

  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: toDateTimeLocalValue(task.dueDate),
  };
}

export function TaskForm({ task, isSaving, onCancel, onSubmit }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(createFormState(task));

  useEffect(() => {
    setValues(createFormState(task));
  }, [task]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  const isEditing = task !== null;

  return (
    <section className="panel panel--form">
      <div className="panel__header">
        <p className="eyebrow">{isEditing ? 'Update task' : 'Quick add'}</p>
        <h2>{isEditing ? 'Refine the current task' : 'Capture the next task'}</h2>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            type="text"
            value={values.title}
            onChange={handleChange}
            placeholder="Finish hosting setup"
            maxLength={255}
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="Track the details you do not want to lose."
            rows={5}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Status</span>
            <select name="status" value={values.status} onChange={handleChange}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>

          <label className="field">
            <span>Priority</span>
            <select name="priority" value={values.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Due date</span>
          <input
            name="dueDate"
            type="datetime-local"
            value={values.dueDate}
            onChange={handleChange}
          />
        </label>

        <div className="task-form__actions">
          <button className="button button--primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create task'}
          </button>

          {isEditing ? (
            <button
              className="button button--ghost"
              type="button"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel edit
            </button>
          ) : (
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setValues(EMPTY_FORM)}
              disabled={isSaving}
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

