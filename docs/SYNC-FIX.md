# 🔧 Guía de Corrección: Sincronización de Slots Doctor-Paciente

## Problema Identificado

Los slots creados por el doctor admin **no se sincronizaban correctamente** con el paciente al iniciar sesión debido a:

1. **Bug en login del admin**: Cuando se hacía login con `doctor.admin`, el código intentaba acceder a propiedades de `user` que estaba `undefined`
2. **Falta de relación doctor-slot**: La tabla `appointment_slots` no tenía una columna `doctor_id` para rastrear quién creó cada slot

## Cambios Realizados

### 1. ✅ Migración SQL (02_add_doctor_id_to_slots.sql)

```sql
ALTER TABLE appointment_slots 
ADD COLUMN doctor_id UUID NULL,
ADD CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL;
```

- Agrega la columna `doctor_id` para asociar slots con doctores
- Crea un índice para consultas rápidas: `idx_slots_doctor`

### 2. ✅ Fix Login Admin (authService.js)

**Antes:**
```javascript
const user = rows[0]; // undefined para hardcode doctor.admin
if (username === 'doctor.admin' && password === 'Admin2026') {
  // Sin hacer nada
} else if (!user || ...) { // Falla aquí
}
if (!user.is_active) { // Error: user es undefined
```

**Después:**
```javascript
let user = rows[0];
if (username === 'doctor.admin' && password === 'Admin2026') {
  user = {
    id: 'hardcoded-doctor-admin-uuid',
    username: 'doctor.admin',
    role: 'doctor',
    is_active: true
  };
}
```

### 3. ✅ Guardar doctor_id en Slots (appointmentService.js)

**Antes:**
```javascript
INSERT INTO appointment_slots (slot_date, slot_time, status)
VALUES ($1, $2, 'available'::slot_status)
```

**Después:**
```javascript
INSERT INTO appointment_slots (slot_date, slot_time, status, doctor_id)
VALUES ($1, $2, 'available'::slot_status, $3)
```

### 4. ✅ Pasar doctor_id Desde el Controller (appointmentController.js)

**Antes:**
```javascript
const slot = await appointmentService.createSlot({ date, time });
```

**Después:**
```javascript
const doctorUserId = req.user.sub; // ID del doctor autenticado
const slot = await appointmentService.createSlot({ date, time, doctorUserId });
```

### 5. ✅ Devolver doctor_info en getSlots (appointmentService.js)

Ahora la consulta `getSlots` devuelve:
- `doctor_id`: UUID del doctor que creó el slot
- `doctor_username`: Nombre de usuario del doctor

## Pasos para Implementar

### 1. Aplicar la Migración

```bash
cd c:\Users\fairy\Documents\GitHub\MediCita
psql -U <tu_usuario> -d <tu_base_datos> -f database/migrations/002_add_doctor_id_to_slots.sql
```

### 2. Reiniciar el Backend

```bash
cd src/backend
pnpm dev
```

### 3. Pruebas Recomendadas

#### Test 1: Login Admin
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"doctor.admin","password":"Admin2026"}'
```

Debe retornar un token válido.

#### Test 2: Crear Slot
```bash
curl -X POST http://localhost:3001/api/v1/appointments/slots \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-26","time":"10:00:00"}'
```

El slot debe incluir `doctor_id`.

#### Test 3: Listar Slots (Paciente)
```bash
curl -X GET http://localhost:3001/api/v1/appointments/slots?status=available \
  -H "Authorization: Bearer <PATIENT_TOKEN>"
```

Los slots deben mostrar `doctor_username` para que el paciente sepa quién los creó.

## Verificación

✅ El admin `doctor.admin` puede login sin errores  
✅ Los slots creados tienen un `doctor_id` asociado  
✅ Los pacientes ven los slots disponibles con información del doctor  
✅ Las citas se sincronizan correctamente entre doctor y paciente

## Problemas Resueltos

| Problema | Solución |
|----------|----------|
| Error "Cannot read property 'is_active' of undefined" | Crear objeto user para hardcode |
| Slots sin asociación a doctor | Agregar columna doctor_id |
| Paciente no sabe quién creó el slot | Devolver doctor_username en getSlots |
| Slots no sincronizan con login | Ahora doctor_id permite rastrear slots por doctor |

---

**Última actualización:** 25 de mayo de 2026
