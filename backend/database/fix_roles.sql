USE torneos_bd;

INSERT IGNORE INTO Rol (nombre, descripcion) VALUES
    ('participante', 'Usuario que participa en torneos.'),
    ('organizador', 'Usuario que crea y administra sus torneos.'),
    ('administrador', 'Usuario con permisos generales de administración.');
