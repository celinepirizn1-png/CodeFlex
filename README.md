# CodeFlex — SGDM (Sistema de Gestión Deportiva Modular)

Plataforma web modular para la organización, administración y seguimiento de torneos deportivos, mentales y electrónicos (ligas, eliminación directa y sistema suizo).

Proyecto de Tecnologías de la Información - Bachillerato Tecnológico
Instituto Tecnológico Superior "Arias - Balparda" (UTU) - 2026

## Equipo — CodeFlex

| Integrante | Rol |
|---|---|
| Bryan | Backend Developer |
| Aaron Sierra | (Diseñador y Documentador) |
| Celine Píriz | (Lider y Frontend Developer) |
| Santiago Espárrago | (Backend Developer) |

## Stack tecnológico

- Frontend: HTML5, CSS3 (Mobile First / Flexbox), JavaScript, JSON
- Backend: PHP (POO), arquitectura MVC
- Base de datos: MySQL
- Servidor: Apache
- Control de versiones: Git / GitHub
- Despliegue: Docker (entrega final)

## Estructura del proyecto
## Estructura del proyecto

```
codeflex-sgdm/
├── backend/
│   ├── config/          # Conexión a BD y configuración
│   ├── controllers/     # Lógica de negocio
│   ├── models/          # Clases POO (Usuario, Torneo, etc)
│   ├── routes/          # Rutas y endpoints
│   └── utils/           # Validaciones y helpers
├── frontend/
│   ├── css/
│   ├── js/
│   ├── img/
│   └── pages/
├── database/
│   ├── scripts/         # DCL, usuarios de BD
│   └── migrations/      # Modelo relacional (.sql)
├── server/
│   └── scripts/         # Scripts bash de AlmaLinux
├── docs/                # Documentación funcional/técnica
└── README.md
```

## Módulos funcionales

- Usuarios y autenticación (roles: administrador, organizador, participante, público)
- Gestión de participantes y equipos
- Torneos: liga, eliminación directa, sistema suizo
- Registro y consulta de resultados
- Panel de administración
- Consulta pública de calendarios y posiciones

## Instalación (en desarrollo)

git clone https://github.com/TheCirax091/CODEFLEX.git
cd CODEFLEX

Instrucciones de configuración de base de datos y servidor se agregarán conforme avance el desarrollo.

## Entregas

- Primera entrega: 27 de julio
- Segunda entrega: 14 de septiembre
- Entrega final: 23 de octubre
- Defensa: 3-6 de noviembre

## Documentación

La documentación funcional, técnica, de seguridad y manuales de usuario se encuentra en la carpeta docs/.
