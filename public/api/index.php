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
                'GET /api/metrics',
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

    $repository = new TaskRepository(Database::connection());
    $today = currentDate();
    $weekDates = buildDateRange(new DateTimeImmutable('monday this week'), 7);
    $yearStart = new DateTimeImmutable('first day of january this year');
    $yearEnd = new DateTimeImmutable('last day of december this year');
    $yearDates = buildDateRangeBetween($yearStart, $yearEnd);
    $completionWindowStart = min($weekDates[0], $yearDates[0]);

    if ($segments[0] === 'metrics') {
        if ($method !== 'GET') {
            JsonResponse::error('Method not allowed.', 405);
        }

        $tasks = $repository->getAllWithCompletions($completionWindowStart, $today);

        JsonResponse::send([
            'data' => buildMetricsPayload($tasks, $weekDates, $yearDates, $today, $yearStart->format('Y')),
        ]);
    }

    if ($segments[0] !== 'tasks') {
        JsonResponse::error('Endpoint not found.', 404);
    }

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

function buildMetricsPayload(
    array $tasks,
    array $weekDates,
    array $yearDates,
    string $today,
    string $currentYear
): array {
    $elapsedYearDates = array_values(array_filter($yearDates, fn (string $date): bool => $date <= $today));
    $taskCount = count($tasks);
    $totalCompleted = countCompletedAcrossTasks($tasks, $elapsedYearDates);
    $totalPossible = $taskCount * count($elapsedYearDates);
    $yearlyRate = $totalPossible === 0 ? 0 : (int) round(($totalCompleted / $totalPossible) * 100);

    $thisWeekDates = array_values(array_filter($weekDates, fn (string $date): bool => $date <= $today));
    $thisWeekCompleted = countCompletedAcrossTasks($tasks, $thisWeekDates);
    $thisWeekPossible = $taskCount * count($thisWeekDates);
    $weekRate = $thisWeekPossible === 0 ? 0 : (int) round(($thisWeekCompleted / $thisWeekPossible) * 100);

    return [
        'today' => $today,
        'currentYear' => $currentYear,
        'summary' => [
            'habits' => $taskCount,
            'completedChecks' => $totalCompleted,
            'yearlyRate' => $yearlyRate,
            'weekRate' => $weekRate,
        ],
        'weekly' => buildWeeklyMetrics($tasks, $weekDates, $today),
        'monthly' => buildMonthlyMetrics($tasks, $yearDates, $today),
        'ranking' => buildRankingMetrics($tasks, $elapsedYearDates),
    ];
}

function buildWeeklyMetrics(array $tasks, array $weekDates, string $today): array
{
    $taskCount = count($tasks);
    $rows = [];

    foreach ($weekDates as $date) {
        $completed = countCompletedAcrossTasks($tasks, [$date]);
        $future = $date > $today;

        $rows[] = [
            'date' => $date,
            'completed' => $completed,
            'total' => $taskCount,
            'rate' => ($future || $taskCount === 0) ? null : (int) round(($completed / $taskCount) * 100),
            'future' => $future,
        ];
    }

    return $rows;
}

function buildMonthlyMetrics(array $tasks, array $yearDates, string $today): array
{
    $months = [];

    foreach ($yearDates as $date) {
        $key = substr($date, 0, 7);
        $months[$key] ??= [];
        $months[$key][] = $date;
    }

    $taskCount = count($tasks);
    $rows = [];

    foreach ($months as $key => $dates) {
        $elapsedDates = array_values(array_filter($dates, fn (string $date): bool => $date <= $today));
        $possible = count($elapsedDates) * $taskCount;
        $completed = countCompletedAcrossTasks($tasks, $elapsedDates);
        [$year, $month] = array_map('intval', explode('-', $key));
        $label = (new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->format('M');

        $rows[] = [
            'key' => $key,
            'label' => $label,
            'completed' => $completed,
            'possible' => $possible,
            'rate' => $possible === 0 ? null : (int) round(($completed / $possible) * 100),
        ];
    }

    return $rows;
}

function buildRankingMetrics(array $tasks, array $elapsedYearDates): array
{
    $dateCount = count($elapsedYearDates);
    $rows = [];

    foreach ($tasks as $task) {
        $completedDates = completionSet((array) ($task['completionDates'] ?? []));
        $completed = countCompletedFromSet($completedDates, $elapsedYearDates);
        ['current' => $currentStreak, 'best' => $bestStreak] = calculateStreaks($completedDates, $elapsedYearDates);

        $rows[] = [
            'taskId' => (int) ($task['id'] ?? 0),
            'title' => (string) ($task['title'] ?? ''),
            'completed' => $completed,
            'rate' => $dateCount === 0 ? 0 : (int) round(($completed / $dateCount) * 100),
            'currentStreak' => $currentStreak,
            'bestStreak' => $bestStreak,
        ];
    }

    usort($rows, function (array $left, array $right): int {
        if ($right['rate'] !== $left['rate']) {
            return $right['rate'] <=> $left['rate'];
        }

        if ($right['currentStreak'] !== $left['currentStreak']) {
            return $right['currentStreak'] <=> $left['currentStreak'];
        }

        return strcmp((string) $left['title'], (string) $right['title']);
    });

    return $rows;
}

function countCompletedAcrossTasks(array $tasks, array $dates): int
{
    $total = 0;

    foreach ($tasks as $task) {
        $completedSet = completionSet((array) ($task['completionDates'] ?? []));
        $total += countCompletedFromSet($completedSet, $dates);
    }

    return $total;
}

function countCompletedFromSet(array $completedSet, array $dates): int
{
    $count = 0;

    foreach ($dates as $date) {
        if (isset($completedSet[$date])) {
            $count += 1;
        }
    }

    return $count;
}

function completionSet(array $completionDates): array
{
    $set = [];

    foreach ($completionDates as $date) {
        $set[(string) $date] = true;
    }

    return $set;
}

function calculateStreaks(array $completedSet, array $orderedDates): array
{
    $running = 0;
    $best = 0;

    foreach ($orderedDates as $date) {
        if (isset($completedSet[$date])) {
            $running += 1;
            $best = max($best, $running);
        } else {
            $running = 0;
        }
    }

    $current = 0;

    for ($index = count($orderedDates) - 1; $index >= 0; $index -= 1) {
        if (!isset($completedSet[$orderedDates[$index]])) {
            break;
        }

        $current += 1;
    }

    return [
        'current' => $current,
        'best' => $best,
    ];
}
