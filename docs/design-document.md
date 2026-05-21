# Documento de Diseño — MediCita
## Sistema Distribuido para la Gestión de Citas de un Consultorio Médico
### Sistemas Distribuidos · UADY FMAT · 2026

---

## 1. Arquitectura del Sistema

### 1.1 Modelo de tres capas

```
┌─────────────────────────────────────────────────────────┐
│               CAPA DE PRESENTACIÓN                       │
│           React 18 + Vite (puerto 5173)                  │
│                                                          │
│  LoginPage  RegisterPage  DashboardPage                  │
│  AppointmentsPage  PatientsPage  HistoryPage             │
│  ClinicalRecordPage  ReportsPage                         │
│                                                          │
│  Comunicación: fetch() vía Axios → JSON/REST             │
│  Autenticación: JWT en header Authorization: Bearer      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST + JWT
                      ▼
┌─────────────────────────────────────────────────────────┐
│            CAPA DE LÓGICA DE NEGOCIO                     │
│           Node.js 20 + Express 4 (puerto 3000)           │
│                                                          │
│  Controllers (thin)  →  Services (lógica pura)           │
│  Middleware: auth · errorHandler · rateLimiter           │
│  Validaciones: express-validator                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  CONTROL DE CONCURRENCIA                        │    │
│  │  Capa 1: async-mutex por slot_id               │    │
│  │  Capa 2: PostgreSQL SELECT FOR UPDATE           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SEGURIDAD                                      │    │
│  │  • JWT (access 15m + refresh 7d revocable)      │    │
│  │  • bcrypt cost=12 para contraseñas              │    │
│  │  • AES-256-CBC para datos clínicos en reposo    │    │
│  │  • Helmet (cabeceras HTTP de seguridad)         │    │
│  │  • Rate limiting (100 req/15min global)         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────┘
                      │ SQL parametrizado (pg.Pool)
                      ▼
┌─────────────────────────────────────────────────────────┐
│               CAPA DE DATOS                              │
│           PostgreSQL 16 (puerto 5432)                    │
│                                                          │
│  users · refresh_tokens · patients                       │
│  appointment_slots · clinical_records · notifications    │
│                                                          │
│  • Triggers: updated_at automático                       │
│  • Índices: slot_date, patient_id, user_id+is_read       │
│  • CHECK constraints: roles, estados, rangos             │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Patrón arquitectónico del backend

Se sigue el patrón **Controller → Service → Model (Repository)**:

- **Controller**: recibe request HTTP, valida entradas con express-validator, llama al service, formatea la respuesta. No contiene lógica de negocio.
- **Service**: contiene toda la lógica de negocio. No conoce Express. Testeable de forma aislada.
- **Config/Database**: pool de conexiones pg.Pool. Las queries SQL están distribuidas en los services (en un proyecto más grande se extraerían a Repository classes).

---

## 2. Diseño de la Base de Datos

### 2.1 Modelo Entidad-Relación

```
users (1) ──────── (1) patients
  │
  │ (1)
  │
  ▼ (N)
refresh_tokens

patients (1) ──── (N) appointment_slots
patients (1) ──── (N) clinical_records

appointment_slots (1) ── (1) clinical_records

users (1) ──── (N) notifications
```

### 2.2 Tablas principales

| Tabla | Propósito |
|-------|-----------|
| `users` | Credenciales y rol. Contraseña como hash bcrypt. |
| `refresh_tokens` | Tokens de renovación revocables. Se guarda el SHA-256 del token, nunca el token en crudo. |
| `patients` | Datos demográficos separados de las credenciales. |
| `appointment_slots` | Horarios disponibles/reservados. Clave única (slot_date, slot_time). |
| `clinical_records` | Historia clínica. Campos sensibles cifrados con AES-256-CBC. |
| `notifications` | Bandeja de avisos por usuario. Se marcan leídas al entrar al sistema. |

---

## 3. Especificación de Servicios Web (API REST)

### Base URL: `http://localhost:3000/api/v1`

### Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Registrar paciente |
| POST | `/auth/login` | No | Iniciar sesión → {accessToken, refreshToken} |
| POST | `/auth/refresh` | No | Renovar access token |
| POST | `/auth/logout` | Sí | Revocar refresh token |

### Pacientes

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/patients` | doctor | Lista de pacientes |
| GET | `/patients/me` | patient | Perfil propio |
| GET | `/patients/:id` | ambos | Detalle |
| PUT | `/patients/:id` | ambos | Actualizar datos |
| DELETE | `/patients/:id` | doctor | Soft-delete |

### Citas

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/appointments/slots` | ambos | Slots (filtrado por date, status) |
| GET | `/appointments/mine` | patient | Mis citas |
| POST | `/appointments` | ambos | Reservar slot (con exclusión mutua) |
| DELETE | `/appointments/:id` | ambos | Cancelar cita |

### Historia Clínica

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| POST | `/records` | doctor | Crear/actualizar registro |
| GET | `/records/patient/:id` | ambos | Historial de paciente |
| GET | `/records/slot/:id` | doctor | Registro de un slot |

### Reportes

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/reports/patients` | doctor | Lista con total de citas |
| GET | `/reports/calendar` | doctor | Calendario filtrado por rango |

### Notificaciones

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/notifications` | ambos | Notificaciones no leídas |
| PATCH | `/notifications/read` | ambos | Marcar todas como leídas |

### Formato de respuesta

Éxito:
```json
{ "data": { ... } }
```

Error:
```json
{ "error": "Descripción del error" }
```

Validación:
```json
{ "errors": [{ "field": "email", "msg": "Debe ser un correo válido" }] }
```

---

## 4. Mecanismo de Control de Concurrencia

### 4.1 El problema

Dos pacientes solicitan simultáneamente el mismo slot `S` a las 9:00 AM del lunes.

Sin protección (condición de carrera):
```
Req-1 lee slot S  → status = 'available'   ← punto de carrera
Req-2 lee slot S  → status = 'available'
Req-1 actualiza S → status = 'booked'      ✓
Req-2 actualiza S → status = 'booked'      ✓  ← DOUBLE BOOKING
```

### 4.2 La solución (dos capas)

**Capa 1 — Mutex en memoria (`async-mutex`):**

```javascript
// slotMutex.js
const mutexMap = new Map(); // Un Mutex por slot_id

async function withSlotLock(slotId, fn) {
  const mutex   = getMutexForSlot(slotId);
  const release = await mutex.acquire(); // Bloquea si alguien más está en fn
  try {
    return await fn();
  } finally {
    release(); // Siempre libera (try/finally)
  }
}
```

**Capa 2 — SELECT FOR UPDATE (PostgreSQL):**

```sql
BEGIN;
  -- Bloqueo pesimista: ninguna otra transacción puede leer o modificar
  -- esta fila hasta que la transacción actual haga COMMIT o ROLLBACK
  SELECT id, status
  FROM appointment_slots
  WHERE id = $1
  FOR UPDATE;

  -- Solo si status = 'available':
  UPDATE appointment_slots SET status = 'booked' WHERE id = $1;
COMMIT;
```

**Flujo protegido:**
```
Req-1 adquiere mutex(S)
  Req-1 inicia transacción PostgreSQL
    Req-1 SELECT FOR UPDATE → fila bloqueada en BD
    Req-2 intenta adquirir mutex(S) → ESPERA (bloqueado por Capa 1)
    Req-1 actualiza slot → booked
  Req-1 COMMIT
Req-1 libera mutex(S)
  Req-2 adquiere mutex(S)
    Req-2 SELECT FOR UPDATE → slot ya está 'booked'
    Req-2 lanza error 409 Conflict
  Req-2 libera mutex(S)
```

Resultado: exactamente 1 reserva exitosa.

---

## 5. Mecanismos de Seguridad

### 5.1 Autenticación con JWT + Refresh Token

- **Access token**: JWT firmado con HS256, duración 15 minutos. Transportado en `Authorization: Bearer`.
- **Refresh token**: token opaco de 64 bytes aleatorios. Se guarda en BD el hash SHA-256 (nunca el token en crudo). Duración 7 días. Revocable individualmente.
- **Renovación automática**: el frontend detecta `401 TOKEN_EXPIRED` y hace refresh silenciosamente.

### 5.2 Contraseñas

- Hash con **bcryptjs** cost=12 (≈250 ms/hash → resistente a fuerza bruta).
- Se usa `bcryptjs` (implementación pura en JavaScript) en lugar de `bcrypt` (addon nativo en C++) porque pnpm con aislamiento estricto no ejecuta scripts de instalación de terceros por defecto. `bcryptjs` ofrece la misma seguridad criptográfica sin requerir compilación nativa.
- La contraseña en texto plano nunca se almacena ni se loguea.
- Comparación de tiempo constante garantizada por `bcryptjs.compare()`.

### 5.3 Cifrado de datos clínicos en reposo

- Algoritmo: **AES-256-CBC**
- Clave: 32 bytes almacenados en variable de entorno `ENCRYPTION_KEY`.
- Cada cifrado genera un **IV aleatorio de 16 bytes**, por lo que el mismo texto plano produce cifrados distintos.
- Formato almacenado: `ivHex:ciphertextBase64`
- Campos cifrados: `vital_signs_enc`, `diagnosis_enc`, `prescriptions_enc`, `lab_results_enc`, `notes_enc`
- Descifrado ocurre solo en la capa de servicio, nunca en la BD.

### 5.4 Seguridad de transporte y HTTP

- **Helmet**: agrega `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, etc.
- **CORS**: solo origenes explícitamente configurados.
- **Rate limiting**: 100 requests por ventana de 15 minutos global; 10 intentos por 15 minutos en login.
- **SQL parametrizado**: todas las queries usan `$1, $2, ...` — inmune a SQL injection.
- **express-validator**: validación y sanitización de inputs antes de llegar a los services.

### 5.5 Autorización basada en roles

- Rol `doctor`: acceso total al sistema, reportes, gestión de pacientes.
- Rol `patient`: solo su propio perfil, sus citas, su historial.
- Middleware `authorize('doctor')` rechaza con 403 si el rol no coincide.

---

## 6. Interfaz de Usuario

### 6.1 Rutas principales

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/login` | Público | Inicio de sesión |
| `/register` | Público | Registro de paciente |
| `/dashboard` | Ambos | Panel con notificaciones |
| `/appointments` | Ambos | Calendario semanal de slots |
| `/patients` | Doctor | Lista y gestión de pacientes |
| `/records/:slotId` | Doctor | Formulario de historia clínica |
| `/history/:patientId` | Ambos | Historial clínico (acordeón) |
| `/reports` | Doctor | Reportes con filtros |

### 6.2 Gestión de estado

- **Autenticación**: `AuthContext` (React Context) + localStorage para tokens.
- **Datos remotos**: llamadas directas a la API en `useEffect`, sin librería de caché (suficiente para el alcance del proyecto).
- **Refresh automático**: interceptor de Axios renueva el access token transparentemente.
