<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/server/bootstrap.php';
require_once dirname(__DIR__, 2) . '/server/AuthValidator.php';
require_once dirname(__DIR__, 2) . '/server/Database.php';
require_once dirname(__DIR__, 2) . '/server/JsonResponse.php';
require_once dirname(__DIR__, 2) . '/server/TaskRepository.php';
require_once dirname(__DIR__, 2) . '/server/TaskValidator.php';
require_once dirname(__DIR__, 2) . '/server/UserRepository.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

startSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = trim((string) ($_GET['route'] ?? ''), '/');
$segments = $route === '' ? [] : explode('/', $route);

try {
    $pdo = Database::connection();
    $repository = new TaskRepository($pdo);
    $userRepository = new UserRepository($pdo);

    if ($segments === []) {
        if ($method !== 'GET') {
            JsonResponse::error('Method not allowed.', 405);
        }

        JsonResponse::send([
            'name' => 'Task Manager API',
            'version' => '1.0.0',
            'endpoints' => [
                'GET /api/health',
                'GET /api/auth/me',
                'POST /api/auth/register',
                'POST /api/auth/login',
                'POST /api/auth/logout',
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

    if ($segments[0] === 'auth') {
        handleAuthRoutes($segments, $method, $userRepository);
    }

    if ($segments[0] !== 'tasks' && $segments[0] !== 'metrics') {
        JsonResponse::error('Endpoint not found.', 404);
    }

    $userId = requireUserId($userRepository);

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

        $tasks = $repository->getAllWithCompletions($userId, $completionWindowStart, $today);

        JsonResponse::send([
            'data' => buildMetricsPayload($tasks, $weekDates, $yearDates, $today, $yearStart->format('Y')),
        ]);
    }

    if (count($segments) === 1) {
        if ($method === 'GET') {
            JsonResponse::send([
                'data' => [
                    'tasks' => $repository->getAllWithCompletions($userId, $completionWindowStart, $today),
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
                $task = $repository->create($userId, TaskValidator::validateForCreate($payload));
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

        $task = $repository->setCompletion($userId, (int) $taskId, $completion['date'], $completion['completed']);

        if ($task === null) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::send(['data' => $task]);
    }

    if ($method === 'PATCH') {
        $payload = decodeJsonBody();

        try {
            $task = $repository->update($userId, (int) $taskId, TaskValidator::validateForUpdate($payload));
        } catch (InvalidArgumentException $exception) {
            JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
        }

        if ($task === null) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::send(['data' => $task]);
    }

    if ($method === 'DELETE') {
        if (!$repository->delete($userId, (int) $taskId)) {
            JsonResponse::error('Task not found.', 404);
        }

        JsonResponse::noContent();
    }

    if ($method === 'GET') {
        $task = $repository->find($userId, (int) $taskId);

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
    header('Access-Control-Allow-Credentials: true');

    $allowedOrigins = array_filter(array_map('trim', explode(',', Config::get('ALLOWED_ORIGINS', '') ?? '')));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}

function startSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $sessionName = Config::get('SESSION_NAME', 'task_manager_session') ?? 'task_manager_session';
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443';

    session_name($sessionName);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function currentUserId(): ?int
{
    $value = $_SESSION['user_id'] ?? null;
    $userId = filter_var($value, FILTER_VALIDATE_INT);

    if ($userId === false || $userId <= 0) {
        return null;
    }

    return (int) $userId;
}

function loginUser(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logoutUser(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires' => time() - 42000,
                'path' => $params['path'] ?? '/',
                'domain' => $params['domain'] ?? '',
                'secure' => (bool) ($params['secure'] ?? false),
                'httponly' => (bool) ($params['httponly'] ?? true),
                'samesite' => $params['samesite'] ?? 'Lax',
            ]
        );
    }

    session_destroy();
}

function requireUserId(UserRepository $users): int
{
    $userId = currentUserId();

    if ($userId === null) {
        JsonResponse::error('Authentication required.', 401);
    }

    if ($users->findById($userId) === null) {
        logoutUser();
        JsonResponse::error('Authentication required.', 401);
    }

    return $userId;
}

function handleAuthRoutes(array $segments, string $method, UserRepository $users): void
{
    if (count($segments) !== 2) {
        JsonResponse::error('Endpoint not found.', 404);
    }

    $route = $segments[1];

    if ($route === 'register') {
        if ($method !== 'POST') {
            JsonResponse::error('Method not allowed.', 405);
        }

        $payload = decodeJsonBody();

        try {
            $registration = AuthValidator::validateRegistration($payload);
        } catch (InvalidArgumentException $exception) {
            JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
        }

        if ($users->emailExists($registration['email'])) {
            JsonResponse::error('Validation failed.', 422, [
                'email' => 'An account with this email already exists.',
            ]);
        }

        $passwordHash = password_hash($registration['password'], PASSWORD_DEFAULT);

        if (!is_string($passwordHash) || $passwordHash === '') {
            throw new RuntimeException('Unable to process password.');
        }

        $user = $users->create([
            'name' => $registration['name'],
            'email' => $registration['email'],
            'passwordHash' => $passwordHash,
        ]);

        loginUser((int) $user['id']);

        JsonResponse::send(['data' => $user], 201);
    }

    if ($route === 'login') {
        if ($method !== 'POST') {
            JsonResponse::error('Method not allowed.', 405);
        }

        $payload = decodeJsonBody();

        try {
            $credentials = AuthValidator::validateLogin($payload);
        } catch (InvalidArgumentException $exception) {
            JsonResponse::error('Validation failed.', 422, decodeValidationErrors($exception));
        }

        $user = $users->findAuthByEmail($credentials['email']);

        if ($user === null || !password_verify($credentials['password'], (string) $user['passwordHash'])) {
            JsonResponse::error('Invalid credentials.', 401);
        }

        loginUser((int) $user['id']);
        $publicUser = $users->findById((int) $user['id']);

        if ($publicUser === null) {
            throw new RuntimeException('Unable to load account.');
        }

        JsonResponse::send(['data' => $publicUser]);
    }

    if ($route === 'logout') {
        if ($method !== 'POST') {
            JsonResponse::error('Method not allowed.', 405);
        }

        logoutUser();
        JsonResponse::noContent();
    }

    if ($route === 'me') {
        if ($method !== 'GET') {
            JsonResponse::error('Method not allowed.', 405);
        }

        $userId = currentUserId();

        if ($userId === null) {
            JsonResponse::error('Authentication required.', 401);
        }

        $user = $users->findById($userId);

        if ($user === null) {
            logoutUser();
            JsonResponse::error('Authentication required.', 401);
        }

        JsonResponse::send(['data' => $user]);
    }

    JsonResponse::error('Endpoint not found.', 404);
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
