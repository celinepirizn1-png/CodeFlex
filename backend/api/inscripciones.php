<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../config/auth.php';

try {
    $user = requireSession();
    $pdo = Database::connection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $query = 'SELECT i.id_inscripcion, i.estado, i.fecha_inscripcion, i.id_torneo_FK AS torneo_id,
                         t.nombre AS torneo_nombre, u.email AS participante_email
                  FROM Inscripcion i
                  INNER JOIN Torneo t ON t.id_torneo = i.id_torneo_FK
                  INNER JOIN Competidor c ON c.id_competidor = i.id_competidor_FK
                  INNER JOIN Participante p ON p.id_participante = c.id_participante_FK
                  INNER JOIN Usuario u ON u.id_usuario = p.id_usuario_FK';
        $params = [];
        if (($user['rol'] ?? '') === 'participante') {
            $query .= ' WHERE u.id_usuario = :user_id';
            $params['user_id'] = (int) $user['id_usuario'];
        } elseif (($user['rol'] ?? '') === 'organizador') {
            $query .= ' INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
                        WHERE o.id_usuario_FK = :user_id';
            $params['user_id'] = (int) $user['id_usuario'];
        }
        $query .= ' ORDER BY i.id_inscripcion DESC';
        $statement = $pdo->prepare($query);
        $statement->execute($params);
        jsonResponse(['inscripciones' => $statement->fetchAll()]);
    }

    if ($method === 'POST') {
        requireRole($user, ['participante']);
        $data = requestData();
        $tournamentId = (int) ($data['torneo_id'] ?? 0);
        if ($tournamentId <= 0) {
            jsonResponse(['error' => 'Torneo inválido.'], 422);
        }

        $participant = $pdo->prepare('SELECT id_participante FROM Participante WHERE id_usuario_FK = :user_id LIMIT 1');
        $participant->execute(['user_id' => (int) $user['id_usuario']]);
        $participantId = $participant->fetchColumn();
        if ($participantId === false) {
            jsonResponse(['error' => 'El usuario no tiene perfil de participante.'], 422);
        }

        $competitor = $pdo->prepare('SELECT id_competidor FROM Competidor WHERE id_participante_FK = :participant LIMIT 1');
        $competitor->execute(['participant' => (int) $participantId]);
        $competitorId = $competitor->fetchColumn();
        if ($competitorId === false) {
            $createCompetitor = $pdo->prepare('INSERT INTO Competidor (id_participante_FK) VALUES (:participant)');
            $createCompetitor->execute(['participant' => (int) $participantId]);
            $competitorId = (int) $pdo->lastInsertId();
        }

        $existing = $pdo->prepare('SELECT id_inscripcion, estado FROM Inscripcion WHERE id_competidor_FK = :competitor AND id_torneo_FK = :tournament LIMIT 1');
        $existing->execute(['competitor' => (int) $competitorId, 'tournament' => $tournamentId]);
        $row = $existing->fetch();
        if ($row && $row['estado'] === 'pendiente') {
            jsonResponse(['error' => 'Ya existe una solicitud pendiente.'], 409);
        }
        if ($row) {
            $statement = $pdo->prepare("UPDATE Inscripcion SET estado = 'pendiente', fecha_inscripcion = CURRENT_TIMESTAMP WHERE id_inscripcion = :id");
            $statement->execute(['id' => (int) $row['id_inscripcion']]);
        } else {
            $statement = $pdo->prepare("INSERT INTO Inscripcion (estado, horario, id_competidor_FK, id_torneo_FK) VALUES ('pendiente', 'Mañana', :competitor, :tournament)");
            $statement->execute(['competitor' => (int) $competitorId, 'tournament' => $tournamentId]);
        }
        jsonResponse(['mensaje' => 'Solicitud enviada.'], 201);
    }

    if ($method === 'PATCH') {
        requireRole($user, ['organizador', 'administrador']);
        $data = requestData();
        $id = (int) ($data['id_inscripcion'] ?? 0);
        $estado = (string) ($data['estado'] ?? '');
        if ($id <= 0 || !in_array($estado, ['aceptada', 'rechazada'], true)) {
            jsonResponse(['error' => 'Solicitud o estado inválido.'], 422);
        }

        $statement = $pdo->prepare(
            'UPDATE Inscripcion i
             INNER JOIN Torneo t ON t.id_torneo = i.id_torneo_FK
             INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
             SET i.estado = :estado
             WHERE i.id_inscripcion = :id AND (:admin = 1 OR o.id_usuario_FK = :user_id)'
        );
        $statement->execute([
            'estado' => $estado,
            'id' => $id,
            'admin' => ($user['rol'] ?? '') === 'administrador' ? 1 : 0,
            'user_id' => (int) $user['id_usuario'],
        ]);
        jsonResponse(['mensaje' => 'Solicitud actualizada.']);
    }

    jsonResponse(['error' => 'Método no permitido.'], 405);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo procesar la inscripción.'], 500);
}
