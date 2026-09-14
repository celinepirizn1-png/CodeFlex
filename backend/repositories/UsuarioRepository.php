<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Usuario.php';

final class UsuarioRepository
{
    public function __construct(private PDO $pdo) {}

    public function all(): array
    {
        $statement = $this->pdo->query('SELECT u.id_usuario, u.nombre, u.password, u.email, r.nombre AS rol FROM Usuario u INNER JOIN Rol r ON r.id_rol = u.id_rol_FK ORDER BY u.id_usuario DESC');
        $rows = $statement->fetchAll();

        return array_map(
            static fn (array $row): Usuario => new Usuario(
                (int) $row['id_usuario'],
                $row['nombre'],
                $row['password'],
                $row['email'],
                $row['rol']
            ),
            $rows
        );
    }

    public function findById(int $id): ?Usuario
    {
        $statement = $this->pdo->prepare('SELECT u.id_usuario, u.nombre, u.password, u.email, r.nombre AS rol FROM Usuario u INNER JOIN Rol r ON r.id_rol = u.id_rol_FK WHERE u.id_usuario = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row ? new Usuario((int) $row['id_usuario'], $row['nombre'], $row['password'], $row['email'], $row['rol']) : null;
    }

    public function findByEmail(string $email): ?Usuario
    {
        $statement = $this->pdo->prepare('SELECT u.id_usuario, u.nombre, u.password, u.email, r.nombre AS rol FROM Usuario u INNER JOIN Rol r ON r.id_rol = u.id_rol_FK WHERE u.email = :email LIMIT 1');
        $statement->execute(['email' => $email]);
        $row = $statement->fetch();
        return $row ? new Usuario((int) $row['id_usuario'], $row['nombre'], $row['password'], $row['email'], $row['rol']) : null;
    }

    public function findRoleId(string $role): ?int
    {
        $statement = $this->pdo->prepare('SELECT id_rol FROM Rol WHERE nombre = :nombre LIMIT 1');
        $statement->execute(['nombre' => $role]);
        $id = $statement->fetchColumn();

        return $id === false ? null : (int) $id;
    }

    public function create(string $name, string $passwordHash, string $email, int $roleId): int
    {
        $statement = $this->pdo->prepare('INSERT INTO Usuario (nombre, password, email, id_rol_FK) VALUES (:nombre, :password, :email, :id_rol)');
        $statement->execute(['nombre' => $name, 'password' => $passwordHash, 'email' => $email, 'id_rol' => $roleId]);
        return (int) $this->pdo->lastInsertId();
    }

    public function createRoleProfile(int $userId, string $role): void
    {
        $table = match ($role) {
            'participante' => 'Participante',
            'organizador' => 'Organizador_de_Torneo',
            'administrador' => 'Administrador_General',
            default => throw new InvalidArgumentException('Rol no válido.'),
        };

        if ($role === 'administrador') {
            $statement = $this->pdo->prepare("INSERT INTO {$table} (id_usuario_FK) VALUES (:id_usuario)");
        } else {
            $column = $role === 'participante' ? 'datos_perfil' : 'datos_organizador';
            $statement = $this->pdo->prepare("INSERT INTO {$table} ({$column}, id_usuario_FK) VALUES (NULL, :id_usuario)");
        }
        $statement->execute(['id_usuario' => $userId]);
    }

    public function update(int $id, string $name, string $email, ?string $passwordHash = null): bool
    {
        if ($passwordHash === null) {
            $statement = $this->pdo->prepare('UPDATE usuario SET nombre = :nombre, email = :email WHERE id_usuario = :id');
            return $statement->execute(['nombre' => $name, 'email' => $email, 'id' => $id]);
        }

        $statement = $this->pdo->prepare('UPDATE usuario SET nombre = :nombre, email = :email, password = :password WHERE id_usuario = :id');
        return $statement->execute(['nombre' => $name, 'email' => $email, 'password' => $passwordHash, 'id' => $id]);
    }

    public function delete(int $id): bool
    {
        $statement = $this->pdo->prepare('DELETE FROM usuario WHERE id_usuario = :id');
        return $statement->execute(['id' => $id]);
    }
}