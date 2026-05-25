# Sistema de Gestión de Citas Médicas - MediCita

## Descripción General

El sistema de gestión de citas médicas de MediCita permite:

1. **Pacientes**: Reservar, consultar, modificar y cancelar sus propias citas
2. **Médicos/Administradores**: Crear horarios disponibles, asignar citas a pacientes, reprogramar y cancelar citas
3. **Notificaciones**: Sistema de notificaciones en base de datos y por correo electrónico

---

## Flujo de Citas

### 1. Creación de Horarios Disponibles (Médico)

El médico crea slots (horarios) disponibles que luego los pacientes pueden reservar.

**Endpoint**: `POST /api/v1/appointments/slots`

**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body**:
```json
{
  "date": "2026-05-30",
  "time": "14:30"
}
```

**Respuesta**: 
```json
{
  "message": "Slot creado exitosamente",
  "data": {
    "id": "uuid-slot-id",
    "slot_date": "2026-05-30",
    "slot_time": "14:30",
    "status": "available",
    "patient_id": null,
    "booked_by": null,
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:00:00Z"
  }
}
```

---

### 2. Reserva de Cita

#### Opción A: Paciente Reserva Su Propia Cita

**Endpoint**: `POST /api/v1/appointments`

**Headers**: 
- `Authorization: Bearer <token_paciente>`
- `Content-Type: application/json`

**Body**:
```json
{
  "slotId": "uuid-del-slot"
}
```

**Nota**: El sistema obtiene automáticamente el ID del paciente desde el token.

#### Opción B: Médico Asigna Cita a un Paciente

**Endpoint**: `POST /api/v1/appointments`

**Headers**: 
- `Authorization: Bearer <token_medico>`
- `Content-Type: application/json`

**Body**:
```json
{
  "slotId": "uuid-del-slot",
  "patientId": "uuid-del-paciente"
}
```

**Respuesta**: 
```json
{
  "message": "Cita reservada exitosamente",
  "data": {
    "id": "uuid-slot-id",
    "slot_date": "2026-05-30",
    "slot_time": "14:30",
    "status": "booked",
    "patient_id": "uuid-del-paciente",
    "patient_name": "Juan Pérez",
    "booked_by": "doctor",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:15:00Z"
  }
}
```

**Notificación**: El paciente recibe:
- Notificación en la base de datos
- Correo electrónico con los detalles de la cita

---

### 3. Consulta de Citas

#### Listar Horarios Disponibles

**Endpoint**: `GET /api/v1/appointments/slots`

**Headers**: 
- `Authorization: Bearer <token>`

**Query Parameters**:
- `date`: Fecha específica (ISO 8601, ej: "2026-05-30")
- `from`: Desde esta fecha (ISO 8601)
- `to`: Hasta esta fecha (ISO 8601)
- `status`: Estado (`available`, `booked`, `cancelled`)

**Ejemplo**:
```
GET /api/v1/appointments/slots?status=available&from=2026-05-26&to=2026-06-30
```

**Respuesta**:
```json
{
  "data": [
    {
      "id": "uuid-1",
      "slot_date": "2026-05-30",
      "slot_time": "09:00",
      "status": "available",
      "patient_id": null,
      "booked_by": null,
      "created_at": "2026-05-25T08:00:00Z"
    },
    {
      "id": "uuid-2",
      "slot_date": "2026-05-30",
      "slot_time": "14:30",
      "status": "booked",
      "patient_id": "uuid-paciente",
      "patient_name": "Juan Pérez",
      "booked_by": "doctor",
      "created_at": "2026-05-25T10:00:00Z"
    }
  ]
}
```

#### Mis Citas (Paciente)

**Endpoint**: `GET /api/v1/appointments/mine`

**Headers**: 
- `Authorization: Bearer <token_paciente>`

**Respuesta**:
```json
{
  "data": [
    {
      "id": "uuid-slot-id",
      "slot_date": "2026-05-30",
      "slot_time": "14:30",
      "status": "booked",
      "patient_id": "uuid-del-paciente",
      "patient_name": "Juan Pérez",
      "booked_by": "patient",
      "created_at": "2026-05-25T10:00:00Z",
      "updated_at": "2026-05-25T10:00:00Z"
    }
  ]
}
```

#### Todas las Citas (Médico)

**Endpoint**: `GET /api/v1/appointments/all`

**Headers**: 
- `Authorization: Bearer <token_medico>`

**Query Parameters** (igual a `/appointments/slots`):
- `status`: Estado de la cita
- `from`: Desde esta fecha
- `to`: Hasta esta fecha

#### Detalles de una Cita

**Endpoint**: `GET /api/v1/appointments/{id}`

**Headers**: 
- `Authorization: Bearer <token>`

**Respuesta**:
```json
{
  "data": {
    "id": "uuid-slot-id",
    "slot_date": "2026-05-30",
    "slot_time": "14:30",
    "status": "booked",
    "patient_id": "uuid-del-paciente",
    "patient_name": "Juan Pérez",
    "patient_email": "juan@example.com",
    "patient_phone": "+34 600 123 456",
    "booked_by": "doctor",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:00:00Z"
  }
}
```

---

### 4. Modificación de Citas

#### Reprogramar Cita (Médico)

**Endpoint**: `PUT /api/v1/appointments/{id}`

**Headers**: 
- `Authorization: Bearer <token_medico>`
- `Content-Type: application/json`

**Body** (al menos uno de estos campos):
```json
{
  "date": "2026-06-15",
  "time": "16:00"
}
```

**Respuesta**:
```json
{
  "message": "Cita reprogramada",
  "data": {
    "id": "uuid-slot-id",
    "slot_date": "2026-06-15",
    "slot_time": "16:00",
    "status": "booked",
    "patient_id": "uuid-del-paciente",
    "patient_name": "Juan Pérez",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:30:00Z"
  }
}
```

**Notificación**: El paciente recibe:
- Notificación en la base de datos con la nueva fecha y hora
- Correo electrónico informando de la reprogramación

---

### 5. Cancelación de Citas

#### Cancelar Cita

**Endpoint**: `DELETE /api/v1/appointments/{id}`

**Headers**: 
- `Authorization: Bearer <token>`

**Respuesta**:
```json
{
  "message": "Cita cancelada"
}
```

**Comportamiento**:

- **Si lo hace el paciente**: Solo puede cancelar sus propias citas
- **Si lo hace el médico**: Puede cancelar cualquier cita

**Notificación** (si cancela el médico):
- El paciente recibe notificación en la base de datos
- El paciente recibe correo electrónico informando de la cancelación
- El slot vuelve a estado `available` para que otros pacientes lo puedan reservar

---

## Sistema de Notificaciones

### Tipos de Notificaciones

1. **Nueva Cita Agendada por Médico**
   - Mensaje: "El médico ha agendado una nueva cita para usted."
   - Correo: Sí, con detalles de fecha y hora
   - Generada por: `bookSlot()` cuando `bookedBy === 'doctor'`

2. **Cita Cancelada por Médico**
   - Mensaje: "Su cita médica ha sido cancelada por el médico."
   - Correo: Sí
   - Generada por: `cancelAppointment()` cuando `requesterRole === 'doctor'`

3. **Cita Reprogramada por Médico**
   - Mensaje: "El médico ha reprogramado su cita para el {fecha} a las {hora} hs."
   - Correo: Sí
   - Generada por: `rescheduleSlot()`

### Endpoints de Notificaciones

#### Obtener Notificaciones No Leídas

**Endpoint**: `GET /api/v1/notifications/unread`

**Respuesta**:
```json
{
  "data": [
    {
      "id": "uuid-notif-id",
      "message": "El médico ha agendado una nueva cita para usted.",
      "created_at": "2026-05-25T10:15:00Z"
    }
  ]
}
```

#### Obtener Todas las Notificaciones

**Endpoint**: `GET /api/v1/notifications/all`

#### Contar Notificaciones No Leídas

**Endpoint**: `GET /api/v1/notifications/count`

**Respuesta**:
```json
{
  "unreadCount": 3
}
```

#### Marcar Notificaciones Como Leídas

**Endpoint**: `PATCH /api/v1/notifications/read`

**Body** (opcional):
```json
{
  "notificationId": "uuid-notif-id"
}
```

Si no se proporciona `notificationId`, se marcan TODAS como leídas.

#### Eliminar Notificación

**Endpoint**: `DELETE /api/v1/notifications/{id}`

---

## Configuración de Correos Electrónicos

### Variables de Entorno Requeridas

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=preyvictoria@gmail.com
SMTP_PASS=your_smtp_password_here

# Admin Configuration
ADMIN_EMAIL=preyvictoria@gmail.com
ADMIN_NAME=Médico Administrador
```

### Configuración para Gmail

1. **Habilitar acceso a aplicaciones menos seguras**:
   - Ir a: https://myaccount.google.com/security
   - Buscar "Aplicaciones y sitios menos seguros"
   - Activar

2. **O usar contraseña de aplicación** (recomendado):
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Correo" y "Windows"
   - Copiar la contraseña generada
   - Usar esa contraseña en `SMTP_PASS`

### Plantillas de Correos

Los correos se envían con plantillas HTML profesionales que incluyen:
- Logo/Branding
- Información de la cita (fecha, hora)
- Instrucciones claras
- Footer con información de no responder

---

## Seguridad y Validaciones

### Validaciones de Fecha/Hora

- **Formato de fecha**: ISO 8601 (`YYYY-MM-DD`)
- **Formato de hora**: `HH:MM` o `HH:MM:SS`
- Ejemplo: `"2026-05-30T14:30:00Z"`

### Control de Acceso

- **Pacientes**:
  - ✅ Pueden ver slots `available`
  - ✅ Pueden reservar sus propias citas
  - ✅ Pueden ver sus propias citas (`/appointments/mine`)
  - ✅ Pueden cancelar sus propias citas
  - ❌ No pueden crear slots
  - ❌ No pueden ver todas las citas

- **Médicos**:
  - ✅ Pueden ver todos los slots (cualquier estado)
  - ✅ Pueden crear nuevos slots
  - ✅ Pueden reservar citas para pacientes
  - ✅ Pueden ver todas las citas (`/appointments/all`)
  - ✅ Pueden reprogramar cualquier cita
  - ✅ Pueden cancelar cualquier cita

### Protección Contra Race Conditions

- **Mutex en Node.js**: `slotMutex` previene reservas simultáneas del mismo slot
- **SELECT FOR UPDATE**: Bloqueo de fila en PostgreSQL para transacciones

---

## Casos de Uso Comunes

### Caso 1: Paciente Reserva Su Cita

```bash
# 1. Paciente obtiene slots disponibles
curl -X GET "http://localhost:3000/api/v1/appointments/slots?status=available&from=2026-05-26" \
  -H "Authorization: Bearer <token_paciente>"

# 2. Paciente reserva el slot que eligió
curl -X POST "http://localhost:3000/api/v1/appointments" \
  -H "Authorization: Bearer <token_paciente>" \
  -H "Content-Type: application/json" \
  -d '{"slotId": "uuid-del-slot"}'

# 3. Paciente ve sus citas
curl -X GET "http://localhost:3000/api/v1/appointments/mine" \
  -H "Authorization: Bearer <token_paciente>"
```

### Caso 2: Médico Asigna Cita a Paciente

```bash
# 1. Médico crea slots disponibles
curl -X POST "http://localhost:3000/api/v1/appointments/slots" \
  -H "Authorization: Bearer <token_medico>" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-05-30", "time": "14:30"}'

# 2. Médico asigna la cita a un paciente
curl -X POST "http://localhost:3000/api/v1/appointments" \
  -H "Authorization: Bearer <token_medico>" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "uuid-del-slot",
    "patientId": "uuid-del-paciente"
  }'

# El paciente recibe notificación y correo automáticamente
```

### Caso 3: Médico Reprograma Cita

```bash
# Médico reprograma la cita para una nueva fecha
curl -X PUT "http://localhost:3000/api/v1/appointments/uuid-del-slot" \
  -H "Authorization: Bearer <token_medico>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-15",
    "time": "16:00"
  }'

# El paciente recibe notificación y correo automáticamente
```

### Caso 4: Médico Cancela Cita

```bash
# Médico cancela la cita
curl -X DELETE "http://localhost:3000/api/v1/appointments/uuid-del-slot" \
  -H "Authorization: Bearer <token_medico>"

# El paciente recibe notificación y correo
# El slot vuelve a disponible
```

---

## Estados de las Citas

| Estado | Descripción |
|--------|-------------|
| `available` | Slot sin reservar, disponible para pacientes |
| `booked` | Cita reservada por un paciente o asignada por el médico |
| `cancelled` | Cita cancelada, el slot vuelve a `available` |

---

## Manejo de Errores

### Errores Comunes

| Código HTTP | Error | Causa |
|-------------|-------|-------|
| 400 | "Nada que actualizar" | PUT sin campos `date` o `time` |
| 401 | "No autenticado" | Token inválido o expirado |
| 403 | "No autorizado" | Paciente intenta crear slots o ver todas las citas |
| 404 | "Cita no encontrada" | ID de slot inválido |
| 409 | "El horario ya no está disponible" | Slot fue reservado por otro paciente |
| 409 | "Ya existe un slot para esa fecha y hora" | Intento de crear slot duplicado |
| 422 | Errores de validación | Datos inválidos en el request |

---

## Testing

### Email de Prueba

```bash
curl -X POST "http://localhost:3000/api/v1/test/send-email" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Este endpoint está disponible solo en desarrollo y envía un email de prueba a `preyvictoria@gmail.com`.

---

## Notas Importantes

1. **Sincronización de Correos**: Los correos se envían de forma asincrónica. Si SMTP falla, la cita igual se registra en la base de datos.

2. **Zona Horaria**: Asegúrate que el servidor y la base de datos usan la misma zona horaria (UTC recomendado).

3. **Base de Datos**: Utiliza `CURRENT_TIMESTAMP` en PostgreSQL, que devuelve la hora en UTC.

4. **Contraseña SMTP**: Para Gmail, usa una contraseña de aplicación, NO tu contraseña personal si tienes 2FA activado.

5. **Rate Limiting**: El sistema incluye protección contra DDoS con límites de tasa globales y específicos para login.

---

## Flujo Completo Ejemplo

```
1. Médico crea slots: POST /appointments/slots
   → status: 200, slot con estado "available"

2. Paciente ve slots: GET /appointments/slots?status=available
   → Recibe lista de slots disponibles

3. Paciente reserva: POST /appointments
   → status: 201, slot cambia a "booked"
   → Paciente recibe notificación + correo

4. Médico ve todas las citas: GET /appointments/all
   → Recibe lista de todas las citas

5. Médico reprograma: PUT /appointments/{id}
   → status: 200, slot con nueva fecha/hora
   → Paciente recibe notificación + correo

6. Paciente cancela: DELETE /appointments/{id}
   → status: 200, slot vuelve a "available"
   → No hay notificación (lo cancela el paciente)

O:

6. Médico cancela: DELETE /appointments/{id}
   → status: 200, slot vuelve a "available"
   → Paciente recibe notificación + correo
```

---

**Última actualización**: Mayo 25, 2026
**Versión**: 1.0.0
