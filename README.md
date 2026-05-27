# MediCita — Sistema Distribuido de Gestión de Citas Médicas

Proyecto Final — Sistemas Distribuidos · UADY FMAT 2026

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│               CAPA DE PRESENTACIÓN                       │
│           React + Vite (puerto 5173)                     │
│   Patients · Appointments · Records · Reports · Auth     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST (JSON)
                      │ JWT en cada request
                      ▼
┌─────────────────────────────────────────────────────────┐
│            CAPA DE LÓGICA DE NEGOCIO                     │
│           Node.js + Express (puerto 3000)                │
│  Auth · Patients · Appointments · Records · Reports      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CONTROL DE CONCURRENCIA                         │   │
│  │  Mutex distribuido sobre slots de citas          │   │
│  │  (async-mutex + validación atómica en BD)        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │ SQL parametrizado
                      ▼
┌─────────────────────────────────────────────────────────┐
│               CAPA DE DATOS                              │
│           PostgreSQL (puerto 5432)                       │
│  users · patients · appointments · clinical_records      │
│  vital_signs · notifications                             │
│  Campos sensibles cifrados con AES-256-CBC               │
└─────────────────────────────────────────────────────────┘
```

## Tecnologías

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | React 18 + Vite + TailwindCSS | SPA moderna, hot-reload, componentes funcionales |
| Backend | Node.js 20 + Express 4 | Ecosistema maduro, middleware composable |
| BD | PostgreSQL 16 | ACID, UUID, ENUM types, SELECT FOR UPDATE, row-level locking |
| Auth | JWT (access 15min + refresh 7d) | Sin estado en servidor, escalable, tokens revocables |
| Cifrado | AES-256-CBC (Node crypto) | Datos clínicos sensibles en reposo (vital_signs, diagnosis, prescriptions, lab_results, notes) |
| Contraseñas | bcrypt (cost=12) | Resistente a fuerza bruta (~100ms por validación) |
| Concurrencia | async-mutex + SELECT FOR UPDATE | Exclusión mutua dual: in-memory (Node) + DB (PostgreSQL) |
| Email | nodemailer + SMTP Gmail (TLS 587) | Notificaciones síncronas en BD, envío asíncrono |
| Logging | Winston (error, warn, info, debug) | Logging estructurado a archivos + consola |
| Seguridad | Helmet + express-validator + Rate Limit | Headers de seguridad, validación de entrada, throttling |
| Gestor de paquetes | pnpm | Aislamiento estricto de dependencias, evita phantom deps |

## Decisiones de diseño

### Control de concurrencia
Se usa un **Mutex a nivel de slot de cita** combinado con **SELECT FOR UPDATE** en PostgreSQL. 
Cuando dos usuarios intentan reservar el mismo horario simultáneamente:
1. El primer request adquiere el lock en memoria (`async-mutex`)
2. Ejecuta la transacción con `SELECT ... FOR UPDATE` sobre ese slot
3. Inserta la cita y libera el lock
4. El segundo request, al adquirir el lock, encuentra el slot ocupado y retorna error 409

### Cifrado de datos clínicos
Los campos `diagnosis`, `prescriptions`, `lab_results`, `notes` y los signos vitales se cifran con AES-256-CBC antes de persistir. La llave se almacena en variable de entorno, nunca en código fuente.

### Autenticación
- JWT de corta duración (15 min) + refresh token de larga duración (7 días)
- Refresh tokens almacenados en BD (revocables)
- Middleware de autorización por rol: `patient` | `doctor`

## Estructura del proyecto

```
mediCita/
├── docs/                        # Documentación de diseño
│   └── design-document.md
├── src/
│   ├── frontend/                # Capa de Presentación (React)
│   │   ├── public/
│   │   └── src/
│   │       ├── components/      # Componentes reutilizables por dominio
│   │       ├── pages/           # Páginas/rutas principales
│   │       ├── hooks/           # Custom hooks
│   │       ├── services/        # Llamadas a la API REST
│   │       ├── context/         # Estado global (Auth, Notifications)
│   │       └── utils/           # Helpers y formateadores
│   └── backend/                 # Capa de Lógica de Negocio (Express)
│       └── src/
│           ├── config/          # Variables de entorno, DB pool
│           ├── controllers/     # Handlers HTTP (thin controllers)
│           ├── services/        # Lógica de negocio pura
│           ├── middleware/      # Auth, error handler, rate limiter
│           ├── models/          # Queries SQL (Repository pattern)
│           ├── routes/          # Definición de endpoints
│           └── utils/           # Cifrado, JWT helpers
├── database/
│   ├── migrations/              # Scripts SQL versionados
│   └── seeds/                   # Datos iniciales (médico admin)
├── tests/
│   ├── concurrency/             # Pruebas de condición de carrera
│   ├── unit/                    # Tests unitarios de servicios
│   └── integration/             # Tests de endpoints
└── scripts/                     # Setup, deploy helpers
```

## Instalación rápida

```bash
# 0. Instalar pnpm (si no lo tienes)
npm install -g pnpm

# 1. Instalar dependencias con pnpm
cd src/backend && pnpm install
cd ../frontend && pnpm install

# 2. Configurar variables de entorno
cp src/backend/.env.example src/backend/.env
# Editar .env con usuario/contraseña de MySQL y secretos JWT

# 3. Crear la base de datos en PhpMyAdmin (ver Manual de Usuario)

# 4. Iniciar servicios
cd src/backend && pnpm dev
cd src/frontend && pnpm dev
```

## Pruebas de concurrencia

```bash
cd tests/concurrency
node race-condition-test.js
```

El reporte se genera en `tests/concurrency/report.json`.
