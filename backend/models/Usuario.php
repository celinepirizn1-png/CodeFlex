<?php
declare(strict_types=1);

final class Usuario
{
    public function __construct(
        public readonly ?int $idUsuario,
        public readonly string $nombre,
        public readonly string $password,
        public readonly string $email,
        public readonly string $rol,
    ) {}
}