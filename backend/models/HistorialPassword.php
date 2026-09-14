<?php
declare(strict_types=1);

final class HistorialPassword
{
    public function __construct(
        public readonly ?int $idHistorial,
        public readonly ?int $idUsuarioFk,
        public readonly ?string $password,
        public readonly ?string $fechaCambio,
    ) {}
}
