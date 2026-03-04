<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/server/bootstrap.php';
require_once dirname(__DIR__, 2) . '/server/Database.php';
require_once dirname(__DIR__, 2) . '/server/JsonResponse.php';
require_once dirname(__DIR__, 2) . '/server/TaskRepository.php';
require_once dirname(__DIR__, 2) . '/server/TaskValidator.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = trim((string) ($_GET['route'] ?? ''), '/');
$segments = $route === '' ? [] : explode('/', $route);

try {
    if ($segments === []) {
        if ($method !== 'GET') {
            JsonResponse::error('Method not allowed.', 405);
        }

        JsonResponse::send([
            'name' => 'Task Manager API',
            'version' => '1.0.0',
            'endpoints' => [
                'GET /api/health',
                'GET /api/tasks',
                'POST /api/tasks',
                'PATCH /api/tasks/{id}',
                'PATCH /api/tasks/{id}/completion',
                'DELETE /api/tasks/{id}',
            ],
        ]);
    }

    if ($segments[0] === 'health') {
        if ($method !== 'GET') {
            JsonResponse::error('Method not allowed.', 405);
        }

        JsonResponse::send([
            'status' => 'ok',
            'timestamp' => (new DateTimeImmutable())->format(DATE_ATOM),
        ]);
    }

    if ($segments[0] !== 'tasks') {
        JsonResponse::error('Endpoint not found.', 404);
    }

    $repository = new TaskRepository(Database::connection());
    $today = currentDate();
    $weekDates = buildDateRange(new DateTimeImmutable('monday this week'), 7);
    $yearStart = new DateTimeImmutable('first day of january this year');
    $yearEnd = new DateTimeImmutable('last day of december this year');
    $yearDates = buildDateRangeBetween($yearStart, $yearEnd);
    $completionWindowStart = min($weekDates[0], $yearDates[0]);

    if (count($segments) === 1) {
        if ($method === 'GET') {
            JsonResponse::send([
                'data' => [
                    'tasks' => $repository->getAllWithCompletions($completionWindowStart, $today),
                    'meta' => [
                        'today' => $today,
                        'weekDates' => $weekDates,
                        'yearDates' => $yearDates,
                        'currentYear' => $yearStart->format('Y'),
                    ],
                ],
            ]);
        }

        if ($method === 'POST') {
            $payload = decodeJsonBody();

            try {
                $task = $repository->create(TaskValidator::validateForCreate($payload));
            } catch (InvalidArgumentException $exception) {
                JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
            }

            JsonResponse::send(['data' => $task], 201);
        }

        JsonResponse::error('Method not allowed.', 405);
    }

    $taskId = filter_var($segments[1], FILTER_VALIDATE_INT);

    if ($taskId === false) {
        JsonResponse::error('Task id must be a number.', 422);
    }

    if (count($segments) === 3 && $segments[2] === 'completion') {
        if ($method !== 'PATCH') {
            JsonResponse::error('Method not allowed.', 405);
        }

        $payload = decodeJsonBody();

        try {
            $completion = TaskValidator::validateCompletion($payload);
        } catch (InvalidArgumentException $exception) {
            JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
        }

        if ($completion['date'] !== $today) {
            JsonResponse::error('Only the current day can be updated.', 422, [
                'date' => 'Only the current day can be updated.',
            ]);
        }

        $task = $repository->setCompletion((int) $taskId, $completion['date'], $completion['completed']);

        if ($task === null) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::send(['data' => $task]);
    }

    if ($method === 'PATCH') {
        $payload = decodeJsonBody();

        try {
            $task = $repository->update((int) $taskId, TaskValidator::validateForUpdate($payload));
        } catch (InvalidArgumentException $exception) {
            JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
        }

        if ($task === null) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::send(['data' => $task]);
    }

    if ($method === 'DELETE') {
        if (!$repository->delete((int) $taskId)) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::noContent();
    }

    if ($method === 'GET') {
        $task = $repository->find((int) $taskId);

        if ($task === null) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::send(['data' => $task]);
    }

    JsonResponse::error('Method not allowed.', 405);
} catch (Throwable $exception) {
    $message = Config::bool('APP_DEBUG') ? $exception->getMessage() : 'Internal server error.';
    JsonResponse::error($message, 500);
}

function handleCors(): void
{
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');

    $allowedOrigins = array_filter(array_map('trim', explode(',', Config::get('ALLOWED_ORIGINS', '') ?? '')));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}

function decodeJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
        return [];
    }

    try {
        $payload = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        JsonResponse::error('Request body must be valid JSON.', 400);
    }

    if (!is_array($payload)) {
        JsonResponse::error('Request body must decode to a JSON object.', 400);
    }

    return $payload;
}

function decodeValidationErrors(InvalidArgumentException $exception): array
{
    $decoded = json_decode($exception->getMessage(), true);

    return is_array($decoded) ? $decoded : [];
}

function currentDate(): string
{
    return (new DateTimeImmutable('today'))->format('Y-m-d');
}

function buildDateRange(DateTimeImmutable $start, int $days): array
{
    $dates = [];

    for ($offset = 0; $offset < $days; $offset += 1) {
        $dates[] = $start->modify(sprintf('+%d days', $offset))->format('Y-m-d');
    }

    return $dates;
}

function buildDateRangeBetween(DateTimeImmutable $start, DateTimeImmutable $end): array
{
    $dates = [];
    $current = $start;

    while ($current <= $end) {
        $dates[] = $current->format('Y-m-d');
        $current = $current->modify('+1 day');
    }

    return $dates;
}
