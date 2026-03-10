import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { WEEKDAY_LABELS } from '../date';
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
  recurrenceType: 'daily',
  recurrenceDays: [],
};

function createFormState(task: Task | null): TaskFormValues {
  if (!task) {
    return EMPTY_FORM;
  }

  return {
    title: task.title,
    description: task.description,
    recurrenceType: task.recurrenceType,
    recurrenceDays: [...task.recurrenceDays],
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

    if (name === 'recurrenceType') {
      const recurrenceType = value as TaskFormValues['recurrenceType'];
      setValues((current) => ({
        ...current,
        recurrenceType,
        recurrenceDays: recurrenceType === 'custom' ? current.recurrenceDays : [],
      }));
      return;
    }

    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleCustomDay(day: number) {
    setValues((current) => {
      const hasDay = current.recurrenceDays.includes(day);
      const recurrenceDays = hasDay
        ? current.recurrenceDays.filter((value) => value !== day)
        : [...current.recurrenceDays, day];

      return {
        ...current,
        recurrenceDays: recurrenceDays.sort((left, right) => left - right),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  const isEditing = task !== null;

  return (
    <section className="panel panel--form">
      <div className="panel__header">
        <p className="eyebrow">{isEditing ? 'Edit task' : 'Add task'}</p>
        <h2>{isEditing ? 'Adjust the habit label.' : 'Add a daily line item.'}</h2>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Task name</span>
          <input
            name="title"
            type="text"
            value={values.title}
            onChange={handleChange}
            placeholder="Drink 2L water"
            maxLength={255}
            required
          />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            name="description"
            value={values.description}
            onChange={handleChange}
            placeholder="Optional context, reminder, or target."
            rows={4}
          />
        </label>

        <label className="field">
          <span>Schedule</span>
          <select
            name="recurrenceType"
            value={values.recurrenceType}
            onChange={handleChange}
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays (Mon-Fri)</option>
            <option value="custom">Custom weekdays</option>
          </select>
        </label>

        {values.recurrenceType === 'custom' ? (
          <fieldset className="weekday-picker">
            <legend>Custom days</legend>
            <div className="weekday-picker__grid">
              {WEEKDAY_LABELS.map((label, day) => {
                const selected = values.recurrenceDays.includes(day);

                return (
                  <label
                    key={label}
                    className={`weekday-pill${selected ? ' weekday-pill--selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCustomDay(day)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="task-form__actions">
          <button className="button button--primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save task' : 'Add task'}
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
