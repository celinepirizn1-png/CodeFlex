<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/api.php';
require_once __DIR__ . '/../config/auth.php';

try {
    $user = requireSession();
    $pdo = Database::connection();

    $created = $pdo->prepare(
        'SELECT COUNT(*) FROM Torneo t
         INNER JOIN Organizador_de_Torneo o ON o.id_organizador = t.id_organizador_FK
         WHERE o.id_usuario_FK = :user_id'
    );
    $created->execute(['user_id' => (int) $user['id_usuario']]);

    $participating = $pdo->prepare(
        "SELECT COUNT(*) FROM Inscripcion i
         INNER JOIN Competidor c ON c.id_competidor = i.id_competidor_FK
         INNER JOIN Participante p ON p.id_participante = c.id_participante_FK
         WHERE p.id_usuario_FK = :user_id AND i.estado = 'aceptada'"
    );
    $participating->execute(['user_id' => (int) $user['id_usuario']]);

    jsonResponse([
        'usuario' => $user,
        'torneos_creados' => (int) $created->fetchColumn(),
        'torneos_participados' => (int) $participating->fetchColumn(),
    ]);
} catch (Throwable $exception) {
    jsonResponse(['error' => 'No se pudo cargar el perfil.'], 500);
}
