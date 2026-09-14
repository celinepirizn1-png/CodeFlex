CREATE DATABASE IF NOT EXISTS sgdm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgdm;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS historial_password (
    id_historial INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_FK INT UNSIGNED NOT NULL,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario_FK) REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS seguridad_cuenta (
    id_seguridad INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intentos_fallidos INT UNSIGNED NOT NULL DEFAULT 0,
    tiempo_bloqueado DATETIME NULL,
    fecha_ultimo_cambio_password DATETIME NULL,
    id_usuario_FK INT UNSIGNED NOT NULL UNIQUE,
    CONSTRAINT fk_seguridad_usuario FOREIGN KEY (id_usuario_FK) REFERENCES usuario(id_usuario)
);