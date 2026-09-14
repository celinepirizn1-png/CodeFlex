<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../services/UsuarioService.php';

header('Content-Type: application/json; charset=utf-8');

$db = Database::getConnection();
$service = new UsuarioService(new UsuarioRepository($db));

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

        if ($id !== null) {
            $usuario = $service->obtenerUsuarioPorId($id);
            echo json_encode($usuario ? ['ok' => true, 'data' => $usuario] : ['ok' => false, 'mensaje' => 'Usuario no encontrado.']);
            return;
        }

        echo json_encode(['ok' => true, 'data' => $service->listarUsuarios()]);
        return;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $resultado = $service->crearUsuario(
            (string) ($input['nombre'] ?? ''),
            (string) ($input['email'] ?? ''),
            (string) ($input['password'] ?? ''),
            (string) ($input['rol'] ?? 'participante')
        );
        echo json_encode($resultado);
        return;
    }

    if ($method === 'PUT') {
        parse_str(file_get_contents('php://input'), $input);
        $id = isset($_GET['id']) ? (int) $_GET['id'] : (int) ($input['id'] ?? 0);
        $resultado = $service->actualizarUsuario(
            $id,
            (string) ($input['nombre'] ?? ''),
            (string) ($input['email'] ?? ''),
            $input['password'] ?? null
        );
        echo json_encode($resultado);
        return;
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $resultado = $service->eliminarUsuario($id);
        echo json_encode($resultado);
        return;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'Error interno: ' . $e->getMessage()]);
}
