<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['usuario'])) {
    http_response_code(401);
    echo json_encode(['autenticado' => false], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'autenticado' => true,
    'usuario' => $_SESSION['usuario'],
], JSON_UNESCAPED_UNICODE);
