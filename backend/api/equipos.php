<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../config/auth.php';

try {
    $pdo = Database::connection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $tournamentId = (int) ($_GET['torneo_id'] ?? 0);

    if ($method === 'GET') {
        $statement = $pdo->prepare(
            'SELECT c.id_competidor AS id, e.id_equipo, COALESCE(e.nombre_equipo, u.nombre) AS nombre,
                    i.estado, u.email AS participante_email
             FROM Inscripcion i
             INNER JOIN Competidor c ON c.id_competidor = i.id_competidor_FK
             LEFT JOIN Equipo e ON e.id_equipo = c.id_equipo_FK
             LEFT JOIN Participante p ON p.id_participante = c.id_participante_FK
             LEFT JOIN Usuario u ON u.id_usuario = p.id_usuario_FK
             WHERE i.id_torneo_FK = :torneo AND i.estado = \'aceptada\'
             ORDER BY c.id_competidor'
        );
        $statement->execute(['torneo' => $tournamentId]);
        jsonResponse(['equipos' => $statement->fetchAll()]);
    }

    if ($method === 'POST') {
        $user = requireSession();
        requireRole($user, ['organizador', 'administrador']);
        $data = requestData();
        $names = $data['equipos'] ?? [];
        if ($tournamentId <= 0 || !is_array($names)) {
            jsonResponse(['error' => 'Torneo o equipos inválidos.'], 422);
        }

        $owner = $pdo->prepare(
            'SELECT t.id_torneo FROM Torneo t
             INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
             WHERE t.id_torneo = :torneo AND (:admin = 1 OR o.id_usuario_FK = :user_id)'
        );
        $owner->execute([
            'torneo' => $tournamentId,
            'admin' => ($user['rol'] ?? '') === 'administrador' ? 1 : 0,
            'user_id' => (int) $user['id_usuario'],
        ]);
        if ($owner->fetchColumn() === false) {
            jsonResponse(['error' => 'No puedes modificar este torneo.'], 403);
        }

        $insertTeam = $pdo->prepare('INSERT INTO Equipo (nombre_equipo, descripcion) VALUES (:nombre, NULL)');
        $insertCompetitor = $pdo->prepare('INSERT INTO Competidor (id_equipo_FK) VALUES (:equipo)');
        $insertRegistration = $pdo->prepare("INSERT INTO Inscripcion (estado, horario, id_competidor_FK, id_torneo_FK) VALUES ('aceptada', 'Mañana', :competidor, :torneo)");
        $created = [];
        foreach ($names as $name) {
            $cleanName = sanitizedText($name);
            if ($cleanName === '') continue;
            $insertTeam->execute(['nombre' => $cleanName]);
            $teamId = (int) $pdo->lastInsertId();
            $insertCompetitor->execute(['equipo' => $teamId]);
            $competitorId = (int) $pdo->lastInsertId();
            $insertRegistration->execute(['competidor' => $competitorId, 'torneo' => $tournamentId]);
            $created[] = ['id' => $competitorId, 'nombre' => $cleanName];
        }
        jsonResponse(['equipos' => $created], 201);
    }

    jsonResponse(['error' => 'Método no permitido.'], 405);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo procesar los equipos.'], 500);
}
