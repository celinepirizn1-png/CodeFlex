<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../config/api.php';
require_once __DIR__ . '/../../repositories/UsuarioRepository.php';
require_once __DIR__ . '/../../repositories/SeguridadCuentaRepository.php';
require_once __DIR__ . '/../../repositories/HistorialPasswordRepository.php';
require_once __DIR__ . '/../../services/AuthService.php';

try {
    $data = requestData();
    $email = sanitizedEmail($data['email'] ?? null);
    $password = sanitizedPassword($data['password'] ?? '');
    if ($email === null || $password === '') {
        jsonResponse(['error' => 'Correo y contraseña son obligatorios.'], 422);
    }

    $pdo = Database::connection();
    $service = new AuthService($pdo, new UsuarioRepository($pdo), new SeguridadCuentaRepository($pdo), new HistorialPasswordRepository($pdo));
    jsonResponse($service->login($email, $password));
} catch (AuthException $exception) {
    jsonResponse(['error' => $exception->getMessage()], $exception->status);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo iniciar sesión.'], 500);
}