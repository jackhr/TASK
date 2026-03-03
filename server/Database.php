<?php

declare(strict_types=1);

require_once __DIR__ . '/Config.php';

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $database = Config::get('DB_DATABASE');
        $username = Config::get('DB_USERNAME');

        if ($database === null || $database === '' || $username === null || $username === '') {
            throw new RuntimeException('Database configuration is incomplete. Set DB_DATABASE and DB_USERNAME in .env.');
        }

        $host = Config::get('DB_HOST', '127.0.0.1');
        $port = Config::get('DB_PORT', '3306');
        $password = Config::get('DB_PASSWORD', '');

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

        self::$connection = new PDO(
            $dsn,
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        return self::$connection;
    }
}

