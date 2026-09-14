<?php
declare(strict_types=1);

final class SeguridadCuenta
{
    public function __construct(
        public readonly ?int $idSeguridad,
        public readonly ?int $idUsuarioFk,
        public readonly ?int $intentosFallidos,
        public readonly ?string $bloqueadaHasta,
        public readonly ?string $ultimaSesion,
    ) {}
}
