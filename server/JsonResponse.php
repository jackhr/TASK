<?php

declare(strict_types=1);

final class JsonResponse
{
    public static function send(mixed $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $status = 400, array $details = []): never
    {
        $payload = [
            'error' => [
                'message' => $message,
            ],
        ];

        if ($details !== []) {
            $payload['error']['details'] = $details;
        }

        self::send($payload, $status);
    }

    public static function noContent(): never
    {
        http_response_code(204);
        exit;
    }
}

