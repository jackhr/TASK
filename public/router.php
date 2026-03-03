<?php

declare(strict_types=1);

$requestedPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$resolvedPath = __DIR__ . $requestedPath;

if ($requestedPath !== '/' && is_file($resolvedPath)) {
    return false;
}

if (str_starts_with($requestedPath, '/api')) {
    $_GET['route'] = trim(substr($requestedPath, 4), '/');
    require __DIR__ . '/api/index.php';
    return true;
}

require __DIR__ . '/index.php';
return true;

