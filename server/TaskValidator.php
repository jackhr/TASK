<?php

declare(strict_types=1);

final class TaskValidator
{
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

        if ($partial && $data === []) {
            $errors['general'] = 'Provide at least one field to update.';
        }

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }

    private static function stringLength(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value);
        }

        return strlen($value);
    }
}
