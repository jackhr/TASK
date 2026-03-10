<?php

declare(strict_types=1);

final class TaskValidator
{
    private const RECURRENCE_DAILY = 'daily';
    private const RECURRENCE_WEEKDAYS = 'weekdays';
    private const RECURRENCE_CUSTOM = 'custom';

    public static function validateForCreate(array $input): array
    {
        return self::validateTask($input, false);
    }

    public static function validateForUpdate(array $input): array
    {
        return self::validateTask($input, true);
    }

    public static function validateCompletion(array $input): array
    {
        $errors = [];
        $data = [];

        $date = trim((string) ($input['date'] ?? ''));
        $completed = $input['completed'] ?? null;

        $dateObject = DateTimeImmutable::createFromFormat('Y-m-d', $date);

        if ($date === '' || $dateObject === false || $dateObject->format('Y-m-d') !== $date) {
            $errors['date'] = 'Date must use the YYYY-MM-DD format.';
        } else {
            $data['date'] = $date;
        }

        $normalizedCompleted = filter_var($completed, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

        if ($normalizedCompleted === null && !is_bool($completed)) {
            $errors['completed'] = 'Completed must be true or false.';
        } else {
            $data['completed'] = (bool) $normalizedCompleted;
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }

    private static function validateTask(array $input, bool $partial): array
    {
        $errors = [];
        $data = [];

        if (!$partial || array_key_exists('title', $input)) {
            $title = trim((string) ($input['title'] ?? ''));

            if ($title === '') {
                $errors['title'] = 'Title is required.';
            } elseif (self::stringLength($title) > 255) {
                $errors['title'] = 'Title must be 255 characters or less.';
            } else {
                $data['title'] = $title;
            }
        }

        if (array_key_exists('description', $input)) {
            $description = trim((string) ($input['description'] ?? ''));
            $data['description'] = $description === '' ? null : $description;
        } elseif (!$partial) {
            $data['description'] = null;
        }

        $hasRecurrenceType = array_key_exists('recurrenceType', $input);
        $hasRecurrenceDays = array_key_exists('recurrenceDays', $input);
        $recurrenceType = self::RECURRENCE_DAILY;

        if ($partial && $hasRecurrenceDays && !$hasRecurrenceType) {
            $errors['recurrenceType'] = 'Recurrence type is required when updating recurrence days.';
        }

        if (!$partial || $hasRecurrenceType) {
            $recurrenceType = strtolower(trim((string) ($input['recurrenceType'] ?? self::RECURRENCE_DAILY)));
            $validTypes = [
                self::RECURRENCE_DAILY,
                self::RECURRENCE_WEEKDAYS,
                self::RECURRENCE_CUSTOM,
            ];

            if (!in_array($recurrenceType, $validTypes, true)) {
                $errors['recurrenceType'] = 'Recurrence type must be daily, weekdays, or custom.';
            } else {
                $data['recurrence_type'] = $recurrenceType;
            }

            if ($recurrenceType === self::RECURRENCE_CUSTOM) {
                if (!$hasRecurrenceDays) {
                    $errors['recurrenceDays'] = 'Custom recurrence requires one or more weekdays.';
                } else {
                    $days = self::normalizeWeekdays($input['recurrenceDays']);

                    if ($days === []) {
                        $errors['recurrenceDays'] = 'Select at least one weekday for custom recurrence.';
                    } else {
                        $data['recurrence_days'] = implode(',', $days);
                    }
                }
            } else {
                $data['recurrence_days'] = null;
            }
        }

        if ($partial && $data === []) {
            $errors['general'] = 'Provide at least one field to update.';
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }

    private static function normalizeWeekdays(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $days = [];

        foreach ($value as $day) {
            $weekday = filter_var($day, FILTER_VALIDATE_INT, [
                'options' => [
                    'min_range' => 0,
                    'max_range' => 6,
                ],
            ]);

            if ($weekday === false) {
                continue;
            }

            $days[$weekday] = true;
        }

        $normalized = array_map('intval', array_keys($days));
        sort($normalized, SORT_NUMERIC);

        return $normalized;
    }

    private static function stringLength(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value);
        }

        return strlen($value);
    }
}
