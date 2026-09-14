<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../config/auth.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $pdo = Database::connection();

    if ($method === 'GET') {
        $where = isset($_GET['id']) ? ' WHERE t.id_torneo = :id' : '';
        $statement = $pdo->prepare(
            'SELECT t.id_torneo, t.nombre, t.estado, t.formato, t.fecha_inicio, t.fecha_fin,
                    o.id_organizador, u.email AS owner_email, u.nombre AS owner_name
             FROM Torneo t
             INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
             INNER JOIN Usuario u ON u.id_usuario = o.id_usuario_FK
             ' . $where . ' ORDER BY t.id_torneo DESC'
        );
        $statement->execute(isset($_GET['id']) ? ['id' => (int) $_GET['id']] : []);
        jsonResponse(['torneos' => $statement->fetchAll()]);
    }

    if ($method === 'POST') {
        $user = requireSession();
        requireRole($user, ['organizador', 'administrador']);
        $data = requestData();
        $name = sanitizedText($data['nombre'] ?? '');
        $format = (string) ($data['formato'] ?? 'eliminacion_directa');
        $start = (string) ($data['fecha_inicio'] ?? date('Y-m-d'));
        $end = ($data['fecha_fin'] ?? '') !== '' ? (string) $data['fecha_fin'] : null;
        $formats = ['liga', 'eliminacion_directa', 'sistema_suizo'];
        if ($name === '' || !in_array($format, $formats, true)) {
            jsonResponse(['error' => 'Nombre y formato son obligatorios.'], 422);
        }

        $organizer = $pdo->prepare(
            'SELECT id_organizador FROM Organizador_de_Torneo WHERE id_usuario_FK = :id LIMIT 1'
        );
        $organizer->execute(['id' => (int) $user['id_usuario']]);
        $organizerId = $organizer->fetchColumn();
        if ($organizerId === false) {
            jsonResponse(['error' => 'El usuario no tiene perfil de organizador.'], 422);
        }

        $statement = $pdo->prepare(
            "INSERT INTO Torneo (nombre, estado, formato, fecha_inicio, fecha_fin, id_organizador_FK)
             VALUES (:nombre, 'planificado', :formato, :fecha_inicio, :fecha_fin, :organizador)"
        );
        $statement->execute([
            'nombre' => $name,
            'formato' => $format,
            'fecha_inicio' => $start,
            'fecha_fin' => $end,
            'organizador' => $organizerId,
        ]);

        jsonResponse(['torneo' => ['id_torneo' => (int) $pdo->lastInsertId(), 'nombre' => $name]], 201);
    }

    if ($method === 'PATCH') {
        $user = requireSession();
        requireRole($user, ['organizador', 'administrador']);
        $data = requestData();
        $id = (int) ($data['id_torneo'] ?? 0);
        $estado = (string) ($data['estado'] ?? '');
        if ($id <= 0 || !in_array($estado, ['planificado', 'en_progreso', 'finalizado', 'suspendido'], true)) {
            jsonResponse(['error' => 'Torneo o estado inválido.'], 422);
        }

        $statement = $pdo->prepare(
            'UPDATE Torneo t
             INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
             SET t.estado = :estado
             WHERE t.id_torneo = :id AND (:admin = 1 OR o.id_usuario_FK = :user_id)'
        );
        $statement->execute([
            'estado' => $estado,
            'id' => $id,
            'admin' => ($user['rol'] ?? '') === 'administrador' ? 1 : 0,
            'user_id' => (int) $user['id_usuario'],
        ]);
        jsonResponse(['mensaje' => 'Torneo actualizado.']);
    }

    jsonResponse(['error' => 'Método no permitido.'], 405);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo procesar el torneo.'], 500);
}
