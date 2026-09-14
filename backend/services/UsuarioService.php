<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../repositories/UsuarioRepository.php';

final class UsuarioService
{
    public function __construct(private UsuarioRepository $repository) {}

    public function listarUsuarios(): array
    {
        return $this->repository->all();
    }

    public function obtenerUsuarioPorId(int $id): ?Usuario
    {
        return $this->repository->findById($id);
    }

    public function crearUsuario(string $nombre, string $email, string $password, string $rol = 'participante'): array
    {
        $nombreLimpio = trim($nombre);
        $emailLimpio = strtolower(trim($email));

        if ($nombreLimpio === '' || $emailLimpio === '' || $password === '') {
            return ['ok' => false, 'mensaje' => 'Todos los campos son obligatorios.'];
        }

        if (!filter_var($emailLimpio, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'mensaje' => 'El email no es válido.'];
        }

        if ($this->repository->findByEmail($emailLimpio) !== null) {
            return ['ok' => false, 'mensaje' => 'Ya existe un usuario con ese email.'];
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $roleId = $this->repository->findRoleId($rol);
        if ($roleId === null) {
            return ['ok' => false, 'mensaje' => 'El rol seleccionado no existe.'];
        }

        $id = $this->repository->create($nombreLimpio, $passwordHash, $emailLimpio, $roleId);
        $this->repository->createRoleProfile($id, $rol);

        return ['ok' => true, 'id' => $id, 'mensaje' => 'Usuario creado correctamente.'];
    }

    public function actualizarUsuario(int $id, string $nombre, string $email, ?string $password = null): array
    {
        $usuario = $this->repository->findById($id);

        if ($usuario === null) {
            return ['ok' => false, 'mensaje' => 'Usuario no encontrado.'];
        }

        $nombreLimpio = trim($nombre);
        $emailLimpio = strtolower(trim($email));

        if ($nombreLimpio === '' || $emailLimpio === '') {
            return ['ok' => false, 'mensaje' => 'Nombre y email son obligatorios.'];
        }

        if (!filter_var($emailLimpio, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'mensaje' => 'El email no es válido.'];
        }

        $usuarioExiste = $this->repository->findByEmail($emailLimpio);
        if ($usuarioExiste !== null && $usuarioExiste->idUsuario !== $id) {
            return ['ok' => false, 'mensaje' => 'Ya existe otro usuario con ese email.'];
        }

        $passwordHash = $password !== null && $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : null;
        $ok = $this->repository->update($id, $nombreLimpio, $emailLimpio, $passwordHash);

        return $ok
            ? ['ok' => true, 'mensaje' => 'Usuario actualizado correctamente.']
            : ['ok' => false, 'mensaje' => 'No se pudo actualizar el usuario.'];
    }

    public function eliminarUsuario(int $id): array
    {
        if ($this->repository->findById($id) === null) {
            return ['ok' => false, 'mensaje' => 'Usuario no encontrado.'];
        }

        $ok = $this->repository->delete($id);

        return $ok
            ? ['ok' => true, 'mensaje' => 'Usuario eliminado correctamente.']
            : ['ok' => false, 'mensaje' => 'No se pudo eliminar el usuario.'];
    }
}
