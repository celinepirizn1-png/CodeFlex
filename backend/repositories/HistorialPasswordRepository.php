<?php
declare(strict_types=1);

final class HistorialPasswordRepository
{
    public function __construct(private PDO $pdo) {}

    public function create(string $hash, int $userId): void
    {
        $statement = $this->pdo->prepare('INSERT INTO historial_password (hash, fecha_creacion, id_usuario_FK) VALUES (:hash, CURRENT_TIMESTAMP, :id_usuario)');
        $statement->execute(['hash' => $hash, 'id_usuario' => $userId]);
    }
}