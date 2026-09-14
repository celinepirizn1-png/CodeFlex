<?php
declare(strict_types=1);

final class Equipo
{
    public function __construct(
        public readonly ?int $idEquipo,
        public readonly ?string $nombre,
        public readonly ?string $logo,
        public readonly ?int $idParticipanteFk,
    ) {}
}
