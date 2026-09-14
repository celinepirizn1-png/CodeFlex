<?php
declare(strict_types=1);

final class Partida
{
    public function __construct(
        public readonly ?int $idPartida,
        public readonly ?int $idTorneoFk,
        public readonly ?int $idGanadorFk,
        public readonly ?string $resultado,
        public readonly ?string $fecha,
    ) {}
}
