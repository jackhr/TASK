<?php

declare(strict_types=1);

final class TaskValidator
{
    public const STATUSES = ['todo', 'in_progress', 'done'];
    public const PRIORITIES = ['low', 'medium', 'high'];

    public static function validateForCreate(array $input): array
    {
        $data = self::validate($input, false);

        if (!isset($data['status'])) {
            $data['status'] = 'todo';
        }

        if (!isset($data['priority'])) {
            $data['priority'] = 'medium';
        }

        return $data;
    }

    public static function validateForUpdate(array $input): array
    {
        return self::validate($input, true);
    }

    private static function validate(array $input, bool $partial): array
    {
        $errors = [];
        $data = [];

        if (!$partial || array_key_exists('title', $input)) {
            $title = trim((string) ($input['title'] ?? ''));

            if ($title === '') {
                $errors['title'] = 'Title is required.';
            } elseif (mb_strlen($title) > 255) {
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

        if (array_key_exists('status', $input)) {
            $status = (string) $input['status'];

            if (!in_array($status, self::STATUSES, true)) {
                $errors['status'] = 'Status must be todo, in_progress, or done.';
            } else {
                $data['status'] = $status;
            }
        }

        if (array_key_exists('priority', $input)) {
            $priority = (string) $input['priority'];

            if (!in_array($priority, self::PRIORITIES, true)) {
                $errors['priority'] = 'Priority must be low, medium, or high.';
            } else {
                $data['priority'] = $priority;
            }
        }

        if (array_key_exists('dueDate', $input)) {
            $value = $input['dueDate'];

            if ($value === null || trim((string) $value) === '') {
                $data['due_date'] = null;
            } else {
                try {
                    $date = new DateTimeImmutable((string) $value);
                    $data['due_date'] = $date->format('Y-m-d H:i:s');
                } catch (Exception) {
                    $errors['dueDate'] = 'Due date must be a valid date/time.';
                }
            }
        } elseif (!$partial) {
            $data['due_date'] = null;
        }

        if ($partial && $data === []) {
            $errors['general'] = 'Provide at least one field to update.';
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }
}

