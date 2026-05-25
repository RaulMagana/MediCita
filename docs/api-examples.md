# 📝 Ejemplos de Uso - API de Citas Médicas

## Prerequisitos

```bash
# Variables para los ejemplos
export API_URL="http://localhost:3000/api/v1"
export DOCTOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Reemplaza con tu token
export PATIENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Reemplaza con tu token
export PATIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # UUID del paciente
```

---

## 1️⃣ MÉDICO CREA HORARIOS DISPONIBLES

### Crear un slot para mañana a las 14:30

```bash
curl -X POST "$API_URL/appointments/slots" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-26",
    "time": "14:30"
  }'
```

### Response: ✅ 201 Created

```json
{
  "message": "Slot creado exitosamente",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slot_date": "2026-05-26",
    "slot_time": "14:30:00",
    "status": "available",
    "patient_id": null,
    "booked_by": null,
    "created_at": "2026-05-25T10:00:00.000Z",
    "updated_at": "2026-05-25T10:00:00.000Z"
  }
}
```

**Guardar el ID del slot para usarlo después:**
```bash
export SLOT_ID="550e8400-e29b-41d4-a716-446655440000"
```

---

## 2️⃣ PACIENTE VE HORARIOS DISPONIBLES

### Listar todos los slots disponibles

```bash
curl -X GET "$API_URL/appointments/slots?status=available" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slot_date": "2026-05-26",
      "slot_time": "14:30",
      "status": "available",
      "patient_id": null,
      "booked_by": null,
      "created_at": "2026-05-25T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "slot_date": "2026-05-27",
      "slot_time": "09:00",
      "status": "available",
      "patient_id": null,
      "booked_by": null,
      "created_at": "2026-05-25T10:05:00Z"
    }
  ]
}
```

### Ver slots disponibles en un rango de fechas

```bash
curl -X GET "$API_URL/appointments/slots?status=available&from=2026-05-26&to=2026-06-30" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

---

## 3️⃣ PACIENTE RESERVA UNA CITA

### Reservar el slot que eligió

```bash
curl -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slotId\": \"$SLOT_ID\"
  }"
```

### Response: ✅ 201 Created

```json
{
  "message": "Cita reservada exitosamente",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slot_date": "2026-05-26",
    "slot_time": "14:30",
    "status": "booked",
    "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "patient_name": "Juan Pérez",
    "booked_by": "patient",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:05:00Z"
  }
}
```

---

## 4️⃣ MÉDICO ASIGNA CITA A UN PACIENTE

### El médico crea y asigna una cita directamente

```bash
# 1. Crear el slot
SLOT=$(curl -s -X POST "$API_URL/appointments/slots" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-02",
    "time": "10:00"
  }')

SLOT_ID=$(echo $SLOT | jq -r '.data.id')

# 2. Asignar cita al paciente
curl -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slotId\": \"$SLOT_ID\",
    \"patientId\": \"$PATIENT_ID\"
  }"
```

### Response: ✅ 201 Created

```json
{
  "message": "Cita reservada exitosamente",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slot_date": "2026-06-02",
    "slot_time": "10:00",
    "status": "booked",
    "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "patient_name": "Juan Pérez",
    "booked_by": "doctor",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:05:00Z"
  }
}
```

**El paciente recibe:**
- 📧 Correo electrónico con la cita agendada
- 🔔 Notificación en la base de datos

---

## 5️⃣ PACIENTE VE SUS PROPIAS CITAS

### Listar todas mis citas

```bash
curl -X GET "$API_URL/appointments/mine" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slot_date": "2026-06-02",
      "slot_time": "10:00",
      "status": "booked",
      "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "patient_name": "Juan Pérez",
      "booked_by": "doctor",
      "created_at": "2026-05-25T10:00:00Z",
      "updated_at": "2026-05-25T10:05:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "slot_date": "2026-05-26",
      "slot_time": "14:30",
      "status": "booked",
      "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "patient_name": "Juan Pérez",
      "booked_by": "patient",
      "created_at": "2026-05-25T10:00:00Z",
      "updated_at": "2026-05-25T10:02:00Z"
    }
  ]
}
```

---

## 6️⃣ MÉDICO VE TODAS LAS CITAS

### Listar todas las citas (con filtros)

```bash
curl -X GET "$API_URL/appointments/all?status=booked&from=2026-05-26&to=2026-06-30" \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slot_date": "2026-06-02",
      "slot_time": "10:00",
      "status": "booked",
      "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "patient_name": "Juan Pérez",
      "patient_email": "juan@example.com",
      "patient_phone": "+34 600 123 456",
      "booked_by": "doctor",
      "created_at": "2026-05-25T10:00:00Z",
      "updated_at": "2026-05-25T10:05:00Z"
    }
  ]
}
```

---

## 7️⃣ OBTENER DETALLES DE UNA CITA

### Ver información completa de una cita específica

```bash
curl -X GET "$API_URL/appointments/$SLOT_ID" \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slot_date": "2026-06-02",
    "slot_time": "10:00",
    "status": "booked",
    "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "patient_name": "Juan Pérez",
    "patient_email": "juan@example.com",
    "patient_phone": "+34 600 123 456",
    "booked_by": "doctor",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:05:00Z"
  }
}
```

---

## 8️⃣ MÉDICO REPROGRAMA UNA CITA

### Cambiar la fecha y/o hora de una cita

```bash
curl -X PUT "$API_URL/appointments/$SLOT_ID" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-10",
    "time": "15:30"
  }'
```

### Response: ✅ 200 OK

```json
{
  "message": "Cita reprogramada",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slot_date": "2026-06-10",
    "slot_time": "15:30",
    "status": "booked",
    "patient_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "patient_name": "Juan Pérez",
    "created_at": "2026-05-25T10:00:00Z",
    "updated_at": "2026-05-25T10:10:00Z"
  }
}
```

**El paciente recibe:**
- 📧 Correo con la nueva fecha y hora
- 🔔 Notificación: "El médico ha reprogramado su cita para el 2026-06-10 a las 15:30 hs."

---

## 9️⃣ PACIENTE CANCELA SU PROPIA CITA

### Paciente cancela su cita

```bash
curl -X DELETE "$API_URL/appointments/$SLOT_ID" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "message": "Cita cancelada"
}
```

**Resultado:**
- Cita vuelve a estado `available`
- Otro paciente puede reservarla
- El paciente NO recibe notificación (lo hizo él mismo)

---

## 🔟 MÉDICO CANCELA UNA CITA

### Médico cancela la cita de un paciente

```bash
curl -X DELETE "$API_URL/appointments/$SLOT_ID" \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "message": "Cita cancelada"
}
```

**El paciente recibe:**
- 📧 Correo: "Su cita médica ha sido cancelada por el médico"
- 🔔 Notificación: "Su cita médica ha sido cancelada por el médico."
- Slot vuelve a `available`

---

## 1️⃣1️⃣ NOTIFICACIONES - VER NO LEÍDAS

### Obtener todas las notificaciones sin leer

```bash
curl -X GET "$API_URL/notifications/unread" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "message": "El médico ha agendado una nueva cita para usted.",
      "created_at": "2026-05-25T10:05:00Z"
    },
    {
      "id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
      "message": "El médico ha reprogramado su cita para el 2026-06-10 a las 15:30 hs.",
      "created_at": "2026-05-25T10:10:00Z"
    }
  ]
}
```

---

## 1️⃣2️⃣ NOTIFICACIONES - VER TODAS

### Obtener todas las notificaciones (leídas y no leídas)

```bash
curl -X GET "$API_URL/notifications/all" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "data": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "message": "El médico ha agendado una nueva cita para usted.",
      "is_read": false,
      "created_at": "2026-05-25T10:05:00Z"
    },
    {
      "id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
      "message": "El médico ha reprogramado su cita para el 2026-06-10 a las 15:30 hs.",
      "is_read": false,
      "created_at": "2026-05-25T10:10:00Z"
    },
    {
      "id": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
      "message": "Su cita médica ha sido cancelada por el médico.",
      "is_read": true,
      "created_at": "2026-05-24T14:00:00Z"
    }
  ]
}
```

---

## 1️⃣3️⃣ NOTIFICACIONES - CONTAR NO LEÍDAS

### Obtener el número de notificaciones sin leer

```bash
curl -X GET "$API_URL/notifications/count" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "unreadCount": 2
}
```

**Útil para:**
- Mostrar badge en la UI (ej: "2" en el icono de notificaciones)
- Saber si hay notificaciones nuevas

---

## 1️⃣4️⃣ NOTIFICACIONES - MARCAR COMO LEÍDAS

### Marcar todas las notificaciones como leídas

```bash
curl -X PATCH "$API_URL/notifications/read" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response: ✅ 200 OK

```json
{
  "message": "Notificaciones marcadas como leídas"
}
```

### Marcar una notificación específica como leída

```bash
curl -X PATCH "$API_URL/notifications/read" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }'
```

### Response: ✅ 200 OK

```json
{
  "message": "Notificación marcada como leída"
}
```

---

## 1️⃣5️⃣ NOTIFICACIONES - ELIMINAR

### Eliminar una notificación específica

```bash
curl -X DELETE "$API_URL/notifications/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### Response: ✅ 200 OK

```json
{
  "message": "Notificación eliminada"
}
```

---

## ⚠️ ERRORES COMUNES

### Error 401: Token inválido

```bash
curl -X GET "$API_URL/appointments/mine" \
  -H "Authorization: Bearer invalid_token"
```

### Response: ❌ 401 Unauthorized

```json
{
  "error": "Token inválido o expirado"
}
```

**Solución**: Obtén un nuevo token llamando a `/auth/login`

### Error 403: No autorizado (Paciente intenta crear slots)

```bash
curl -X POST "$API_URL/appointments/slots" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-15",
    "time": "10:00"
  }'
```

### Response: ❌ 403 Forbidden

```json
{
  "error": "No autorizado para realizar esta acción"
}
```

**Solución**: Solo el médico puede crear slots

### Error 409: Slot no disponible

```bash
# El slot ya fue reservado por otro paciente
curl -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slotId\": \"$SLOT_ID\"
  }"
```

### Response: ❌ 409 Conflict

```json
{
  "error": "El horario ya no está disponible"
}
```

**Solución**: Elige otro slot disponible

### Error 422: Validación falló

```bash
curl -X POST "$API_URL/appointments/slots" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "invalid-date",
    "time": "25:99"
  }'
```

### Response: ❌ 422 Unprocessable Entity

```json
{
  "errors": [
    {
      "msg": "Fecha inválida (ISO 8601 requerido)",
      "param": "date"
    },
    {
      "msg": "Hora inválida (formato HH:MM)",
      "param": "time"
    }
  ]
}
```

**Solución**: 
- Fecha: Use formato ISO 8601 (YYYY-MM-DD)
- Hora: Use formato HH:MM (ej: 14:30)

---

## 🔄 FLUJO COMPLETO EN BASH

```bash
#!/bin/bash
# Script completo de ejemplo

API_URL="http://localhost:3000/api/v1"

# 1. Obtener tokens (requiere credenciales)
echo "1. Registrar doctor..."
DOCTOR=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doctor1",
    "password": "SecurePass123",
    "fullName": "Dr. García",
    "email": "doctor@example.com",
    "birthDate": "1980-01-15",
    "sex": "M",
    "role": "doctor"
  }')
DOCTOR_TOKEN=$(echo $DOCTOR | jq -r '.data.accessToken')

echo "2. Registrar paciente..."
PATIENT=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "patient1",
    "password": "SecurePass123",
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "birthDate": "1990-05-20",
    "sex": "M",
    "role": "patient"
  }')
PATIENT_TOKEN=$(echo $PATIENT | jq -r '.data.accessToken')
PATIENT_ID=$(echo $PATIENT | jq -r '.data.patient.id')

# 2. Médico crea slot
echo "3. Médico crea slot..."
SLOT=$(curl -s -X POST "$API_URL/appointments/slots" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-15",
    "time": "14:30"
  }')
SLOT_ID=$(echo $SLOT | jq -r '.data.id')
echo "Slot creado: $SLOT_ID"

# 3. Paciente ve slots disponibles
echo "4. Paciente ve slots disponibles..."
curl -s -X GET "$API_URL/appointments/slots?status=available" \
  -H "Authorization: Bearer $PATIENT_TOKEN" | jq '.data[] | {id, slot_date, slot_time}'

# 4. Paciente reserva cita
echo "5. Paciente reserva cita..."
curl -s -X POST "$API_URL/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slotId\": \"$SLOT_ID\"
  }" | jq '.data'

# 5. Paciente ve sus citas
echo "6. Paciente ve sus citas..."
curl -s -X GET "$API_URL/appointments/mine" \
  -H "Authorization: Bearer $PATIENT_TOKEN" | jq '.data'

# 6. Paciente ve sus notificaciones
echo "7. Paciente ve notificaciones..."
curl -s -X GET "$API_URL/notifications/unread" \
  -H "Authorization: Bearer $PATIENT_TOKEN" | jq '.data'

echo "✅ Flujo completado"
```

---

**Última actualización**: Mayo 25, 2026  
**Versión**: 1.0  
**Estado**: ✅ Ejemplos listos para copiar y pegar
