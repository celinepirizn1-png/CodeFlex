<?php
declare(strict_types=1);

final class SeguridadCuentaRepository
{
    public function __construct(private PDO $pdo) {}

    public function findByUserId(int $userId): ?array
    {
        $statement = $this->pdo->prepare('SELECT id_seguridad, intentos_fallidos, tiempo_bloqueado FROM seguridad_cuenta WHERE id_usuario_FK = :id_usuario LIMIT 1');
        $statement->execute(['id_usuario' => $userId]);
        return $statement->fetch() ?: null;
    }

    public function create(int $userId): void
    {
        $statement = $this->pdo->prepare('INSERT INTO seguridad_cuenta (intentos_fallidos, tiempo_bloqueado, id_usuario_FK) VALUES (0, NULL, :id_usuario)');
        $statement->execute(['id_usuario' => $userId]);
    }

    public function registerFailure(int $securityId, int $attempts, ?string $blockedUntil): void
    {
        $statement = $this->pdo->prepare('UPDATE seguridad_cuenta SET intentos_fallidos = :intentos, tiempo_bloqueado = :bloqueado WHERE id_seguridad = :id');
        $statement->execute(['intentos' => $attempts, 'bloqueado' => $blockedUntil, 'id' => $securityId]);
    }

    public function reset(int $securityId): void
    {
        $statement = $this->pdo->prepare('UPDATE seguridad_cuenta SET intentos_fallidos = 0, tiempo_bloqueado = NULL WHERE id_seguridad = :id');
        $statement->execute(['id' => $securityId]);
    }
}