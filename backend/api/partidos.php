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
            'SELECT id_partido, ronda, fecha_jugado, marcador_a, marcador_b, estado,
                    id_competidor_a_FK AS equipo_a, id_competidor_b_FK AS equipo_b
             FROM Partido WHERE id_torneo_FK = :torneo ORDER BY id_partido'
        );
        $statement->execute(['torneo' => $tournamentId]);
        jsonResponse(['partidos' => $statement->fetchAll()]);
    }

    if ($method === 'POST') {
        $user = requireSession();
        requireRole($user, ['organizador', 'administrador']);
        $data = requestData();
        $matches = $data['partidos'] ?? [];
        if ($tournamentId <= 0 || !is_array($matches)) {
            jsonResponse(['error' => 'Torneo o partidos inválidos.'], 422);
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

        $pdo->prepare('DELETE FROM Partido WHERE id_torneo_FK = :torneo')->execute(['torneo' => $tournamentId]);
        $organizer = $pdo->prepare('SELECT id_organizador_FK FROM Torneo WHERE id_torneo = :torneo');
        $organizer->execute(['torneo' => $tournamentId]);
        $organizerId = (int) $organizer->fetchColumn();
        $insert = $pdo->prepare(
            "INSERT INTO Partido (ronda, marcador_a, marcador_b, estado, id_competidor_a_FK,
                                  id_competidor_b_FK, id_torneo_FK, id_organizador_FK)
             VALUES (:ronda, :score_a, :score_b, :estado, :team_a, :team_b, :torneo, :organizador)"
        );
        $created = 0;
        foreach ($matches as $match) {
            $teamA = (int) ($match['equipo_a'] ?? 0);
            $teamB = (int) ($match['equipo_b'] ?? 0);
            if ($teamA <= 0 || $teamB <= 0) continue;
            $hasScore = isset($match['score_a'], $match['score_b']) && $match['score_a'] !== null && $match['score_b'] !== null;
            $insert->execute([
                'ronda' => sanitizedText($match['ronda'] ?? 'Ronda 1'),
                'score_a' => $hasScore ? (int) $match['score_a'] : null,
                'score_b' => $hasScore ? (int) $match['score_b'] : null,
                'estado' => $hasScore ? 'finalizado' : 'pendiente',
                'team_a' => $teamA,
                'team_b' => $teamB,
                'torneo' => $tournamentId,
                'organizador' => $organizerId,
            ]);
            $created++;
        }
        jsonResponse(['partidos_creados' => $created], 201);
    }

    jsonResponse(['error' => 'Método no permitido.'], 405);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo procesar los partidos.'], 500);
}
