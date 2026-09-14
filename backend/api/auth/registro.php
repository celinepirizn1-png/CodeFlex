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
    $name = sanitizedText($data['nombre'] ?? '');
    $password = sanitizedPassword($data['password'] ?? '');
    $role = strtolower(sanitizedText($data['rol'] ?? 'participante'));
    if ($email === null) {
        jsonResponse(['error' => 'El correo no es válido.'], 422);
    }

    $pdo = Database::connection();
    $service = new AuthService($pdo, new UsuarioRepository($pdo), new SeguridadCuentaRepository($pdo), new HistorialPasswordRepository($pdo));
    jsonResponse(['usuario' => $service->register($name, $password, $email, $role)], 201);
} catch (AuthException $exception) {
    jsonResponse(['error' => $exception->getMessage()], $exception->status);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo completar el registro.'], 500);
}