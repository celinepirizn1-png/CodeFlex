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
