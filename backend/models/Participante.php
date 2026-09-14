<?php
declare(strict_types=1);

final class Participante
{
    public function __construct(
        public readonly ?int $idParticipante,
        public readonly ?string $datosPerfil,
        public readonly ?int $idUsuarioFk,
    ) {}
}
