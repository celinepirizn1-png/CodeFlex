<?php
declare(strict_types=1);

final class Database
{
    public static function connection(): PDO
    {
        $host = getenv('SGDM_DB_HOST') ?: '127.0.0.1';
        $database = getenv('SGDM_DB_NAME') ?: 'torneos_bd';
        $user = getenv('SGDM_DB_USER') ?: 'root';
        $password = getenv('SGDM_DB_PASSWORD') ?: '';
        $dsn = "mysql:host={$host};dbname={$database};charset=utf8mb4";

        return new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public static function getConnection(): PDO
    {
        return self::connection();
    }
}