<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/../../config/api.php';

try {
    $data = requestData();
    $codigo = trim((string) ($data['codigo'] ?? ''));
    $verificacion = $_SESSION['verificacion_2fa'] ?? null;

    if (!is_array($verificacion) || !isset($verificacion['usuario'], $verificacion['codigo'], $verificacion['expira'])) {
        jsonResponse(['error' => 'No hay una verificación pendiente.'], 401);
    }
    if ((int) $verificacion['expira'] < time()) {
        unset($_SESSION['verificacion_2fa']);
        jsonResponse(['error' => 'El código expiró. Inicia sesión nuevamente.'], 401);
    }
    if (!preg_match('/^\d{6}$/', $codigo) || !hash_equals((string) $verificacion['codigo'], $codigo)) {
        $_SESSION['verificacion_2fa']['intentos']++;
        if ($_SESSION['verificacion_2fa']['intentos'] >= 5) {
            unset($_SESSION['verificacion_2fa']);
            jsonResponse(['error' => 'Demasiados intentos. Inicia sesión nuevamente.'], 429);
        }
        jsonResponse(['error' => 'El código no es válido.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['usuario'] = $verificacion['usuario'];
    unset($_SESSION['verificacion_2fa']);
    jsonResponse(['usuario' => $_SESSION['usuario']]);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo verificar el código.'], 500);
}