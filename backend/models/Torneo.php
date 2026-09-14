<?php
declare(strict_types=1);

final class Torneo
{
    public function __construct(
        public readonly ?int $idTorneo,
        public readonly ?string $nombre,
        public readonly ?string $descripcion,
        public readonly ?string $estado,
        public readonly ?string $tipo,
        public readonly ?int $idOrganizadorFk,
    ) {}
}
