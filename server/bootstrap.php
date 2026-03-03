<?php

declare(strict_types=1);

require_once __DIR__ . '/Config.php';

Config::loadEnv(dirname(__DIR__) . '/.env');

$timezone = Config::get('APP_TIMEZONE', 'UTC');

if (is_string($timezone) && $timezone !== '') {
    date_default_timezone_set($timezone);
}

