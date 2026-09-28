# CodeFlex — SGDM (Sistema de Gestión Deportiva Modular)

Plataforma web modular para la organización, administración y seguimiento de torneos deportivos, mentales y electrónicos (ligas, eliminación directa y sistema suizo).

Proyecto de Tecnologías de la Información - Bachillerato Tecnológico
Instituto Tecnológico Superior "Arias - Balparda" (UTU) - 2026

## Equipo — CodeFlex

| Integrante | Rol |
|---|---|
| Bryan Gómez| Backend Developer |
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
CodeFlex/
├── backend/
│   ├── api/                 # Endpoints de la API
│   │   └── auth/            # Autenticación y sesiones
│   ├── config/              # Conexión a BD y configuración
│   ├── database/            # Estructura y configuración de la BD
│   ├── models/              # Clases y modelos del sistema
│   ├── repositories/        # Acceso y consultas a datos
│   └── services/            # Lógica de negocio
│
├── frontend/
│   ├── css/                 # Estilos de la aplicación
│   │   └── pages/           # Estilos específicos por página
│   ├── html/                # Páginas HTML
│   │   ├── login/           # Páginas para usuarios autenticados
│   │   │   └── panel/       # Paneles según rol de usuario
│   │   └── nologin/         # Páginas públicas y autenticación
│   ├── img/                 # Imágenes y recursos gráficos
│   └── js/                  # Lógica del frontend
│       └── pages/           # Scripts específicos por página
│
├── docs/                    # Documentación del proyecto
│   ├── funcional/           # Documentación funcional
│   ├── manual_usuario/      # Manual de usuario
│   ├── seguridad/           # Documentación de seguridad
│   └── tecnica/             # Documentación técnica
│
├── server/
│   └── scripts/             # Scripts de administración del servidor
│
└── uploads/                 # Archivos subidos por los usuarios
    ├── equipos/             # Recursos de equipos
    ├── perfiles/            # Recursos de perfiles
    └── torneos/             # Recursos de torneos
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
