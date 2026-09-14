<?php
declare(strict_types=1);

require_once __DIR__ . '/../repositories/UsuarioRepository.php';
require_once __DIR__ . '/../repositories/SeguridadCuentaRepository.php';
require_once __DIR__ . '/../repositories/HistorialPasswordRepository.php';

final class AuthException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status) { parent::__construct($message); }
}

final class AuthService
{
    public function __construct(
        private PDO $pdo,
        private UsuarioRepository $users,
        private SeguridadCuentaRepository $security,
        private HistorialPasswordRepository $passwordHistory,
    ) {}

    public function register(string $name, string $password, string $email, string $role = 'participante'): array
    {
        $allowedRoles = ['participante', 'organizador', 'administrador'];
        if ($name === '' || $email === '' || !$this->validPassword($password) || !in_array($role, $allowedRoles, true)) {
            throw new AuthException('Los datos de registro no son válidos.', 422);
        }
        if ($this->users->findByEmail($email)) {
            throw new AuthException('El correo ya está registrado.', 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->pdo->beginTransaction();
        try {
            $roleId = $this->users->findRoleId($role);
            if ($roleId === null) {
                throw new AuthException('El rol seleccionado no existe en la base de datos.', 500);
            }
            $userId = $this->users->create($name, $hash, $email, $roleId);
            $this->users->createRoleProfile($userId, $role);
            $this->passwordHistory->create($hash, $userId);
            $this->security->create($userId);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }

        session_regenerate_id(true);
        $_SESSION['usuario'] = [
            'id_usuario' => $userId,
            'nombre' => $name,
            'email' => $email,
            'rol' => $role,
        ];

        return $_SESSION['usuario'];
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);
        if (!$user) {
            throw new AuthException('Credenciales incorrectas.', 401);
        }
        $account = $this->security->findByUserId($user->idUsuario);
        if (!$account) {
            $this->security->create($user->idUsuario);
            $account = $this->security->findByUserId($user->idUsuario);
        }
        if (!empty($account['tiempo_bloqueado']) && strtotime($account['tiempo_bloqueado']) > time()) {
            throw new AuthException('La cuenta está bloqueada temporalmente.', 423);
        }
        if (!password_verify($password, $user->password)) {
            $attempts = (int) $account['intentos_fallidos'] + 1;
            $blockedUntil = $attempts >= 5 ? date('Y-m-d H:i:s', time() + 900) : null;
            $this->security->registerFailure((int) $account['id_seguridad'], $attempts, $blockedUntil);
            if ($blockedUntil !== null) {
                throw new AuthException('La cuenta está bloqueada temporalmente.', 423);
            }
            throw new AuthException('Credenciales incorrectas.', 401);
        }

        $this->security->reset((int) $account['id_seguridad']);
        session_regenerate_id(true);
        $codigo = (string) random_int(100000, 999999);
        $_SESSION['verificacion_2fa'] = [
            'usuario' => [
                'id_usuario' => $user->idUsuario,
                'nombre' => $user->nombre,
                'email' => $user->email,
                'rol' => $user->rol,
            ],
            'codigo' => $codigo,
            'expira' => time() + 300,
            'intentos' => 0,
        ];

        return [
            'requiere_2fa' => true,
            'codigo_demo' => $codigo,
            'expira_en' => 300,
        ];
    }

    private function validPassword(string $password): bool
    {
        return strlen($password) >= 8
            && preg_match('/[A-Z]/', $password)
            && preg_match('/[a-z]/', $password)
            && preg_match('/[0-9]/', $password)
            && preg_match('/[^A-Za-z0-9]/', $password);
    }
}