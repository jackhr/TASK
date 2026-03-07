<?php

declare(strict_types=1);

final class AuthValidator
{
    public static function validateRegistration(array $input): array
    {
        $errors = [];
        $data = [];

        $name = trim((string) ($input['name'] ?? ''));
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');

        if ($name === '') {
            $errors['name'] = 'Name is required.';
        } elseif (self::stringLength($name) > 120) {
            $errors['name'] = 'Name must be 120 characters or less.';
        } else {
            $data['name'] = $name;
        }

        self::validateCredentials($email, $password, $errors, $data);

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }

    public static function validateLogin(array $input): array
    {
        $errors = [];
        $data = [];
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');

        self::validateCredentials($email, $password, $errors, $data);

        if ($errors !== []) {
            throw new InvalidArgumentException(json_encode($errors, JSON_UNESCAPED_SLASHES) ?: '{}');
        }

        return $data;
    }

    private static function validateCredentials(
        string $email,
        string $password,
        array &$errors,
        array &$data
    ): void {
        $normalizedEmail = strtolower($email);

        if ($normalizedEmail === '' || !filter_var($normalizedEmail, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email address is required.';
        } elseif (self::stringLength($normalizedEmail) > 255) {
            $errors['email'] = 'Email must be 255 characters or less.';
        } else {
            $data['email'] = $normalizedEmail;
        }

        if ($password === '') {
            $errors['password'] = 'Password is required.';
        } elseif (self::stringLength($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        } elseif (self::stringLength($password) > 72) {
            $errors['password'] = 'Password must be 72 characters or less.';
        } else {
            $data['password'] = $password;
        }
    }

    private static function stringLength(string $value): int
    {
        if (function_exists('mb_strlen')) {
            return mb_strlen($value);
        }

        return strlen($value);
    }
}
