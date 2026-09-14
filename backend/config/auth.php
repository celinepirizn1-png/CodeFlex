<?php
declare(strict_types=1);

function requireSession(): array
{
    session_start();
    if (!isset($_SESSION['usuario'])) {
        jsonResponse(['error' => 'Debes iniciar sesión.'], 401);
    }

    return $_SESSION['usuario'];
}

function requireRole(array $user, array $roles): void
{
    if (!in_array($user['rol'] ?? '', $roles, true)) {
        jsonResponse(['error' => 'No tienes permisos para esta operación.'], 403);
    }
}
