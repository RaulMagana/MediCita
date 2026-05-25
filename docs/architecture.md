# 🏗️ Arquitectura del Sistema de Citas Médicas

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SISTEMA MEDICITA                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                    ┌──────────────┐
│  FRONTEND    │                                    │   BACKEND    │
│  (React)     │◄──────────── API REST ────────►   │  (Express)   │
│              │        JSON over HTTPS             │              │
└──────────────┘                                    └──────┬───────┘
       │                                                   │
       │                                                   ├─► PostgreSQL DB
       │                                                   │   - users
       │                                                   │   - patients
       │                                                   │   - appointment_slots
       │                                                   │   - notifications
       │                                                   │
       │                                                   ├─► Nodemailer
       │                                                   │   (SMTP Gmail)
       │                                                   │
       │                                                   └─► Logger (Winston)
       │
       └──────────────────────────────────────────────────┘
             JWT Token para autenticación
```

---

## Modelo de Datos

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (UUID)       │◄──────┐
│ username        │       │
│ password_hash   │       │
│ role            │       │ 1:1
│ is_active       │       │
│ created_at      │       │
└─────────────────┘       │
                          │
┌─────────────────┐       │
│   PATIENTS      │       │
├─────────────────┤       │
│ id (UUID)       │       │
│ user_id ────────┼───────┤
│ full_name       │
│ email           │       │ 1:N
│ phone           │◄──────┤
│ birth_date      │       │
│ sex             │       │
└─────────────────┘       │
                          │
                    ┌─────┴──────────┐
                    │                │
        ┌──────────────────────┐    │
        │ APPOINTMENT_SLOTS    │    │
        ├──────────────────────┤    │
        │ id (UUID)            │    │
        │ slot_date            │    │
        │ slot_time            │    │
        │ status               │    │
        │ patient_id ──────────┴────┤
        │ booked_by            │    │
        │ created_at           │    │
        │ updated_at           │    │
        └──────────────────────┘    │
                    │               │
                    └───────┬───────┘
                            │
                    ┌───────▼──────────┐
                    │ NOTIFICATIONS    │
                    ├──────────────────┤
                    │ id (UUID)        │
                    │ user_id          │◄─ Referencia a USERS
                    │ message          │
                    │ is_read          │
                    │ created_at       │
                    └──────────────────┘
```

---

## Flujo de Autenticación

```
┌─────────────┐
│  PACIENTE   │
└──────┬──────┘
       │
       ├─1. POST /auth/login
       │   └─ {username, password}
       │
       │  ┌─────────────────────────┐
       │  │   Verificar usuario     │
       │  │   Verificar contraseña  │
       │  └─────────────────────────┘
       │
       └─2. Recibe JWT Token
          {
            "accessToken": "eyJhbG...",
            "refreshToken": "eyJhbG..."
          }
       
       ├─3. Usa accessToken en headers
       │   Authorization: Bearer eyJhbG...
       │
       └─4. GET /appointments/mine
          ✓ Token verificado
          ✓ ID de usuario extraído (sub)
          ✓ Se obtienen citas del paciente
```

---

## Flujo de Reserva de Cita

```
┌────────────────────────────────────────────────────────────┐
│  MÉDICO CREA SLOT                                          │
└────────────────────────────────────────────────────────────┘

POST /api/v1/appointments/slots
├─ Validaciones:
│  ├─ Token válido (JWT)
│  ├─ Role = "doctor"
│  ├─ Fecha ISO 8601
│  └─ Hora HH:MM
├─ BD: INSERT INTO appointment_slots (status='available')
└─ Response: 201 + {slot}


┌────────────────────────────────────────────────────────────┐
│  PACIENTE VE SLOTS DISPONIBLES                             │
└────────────────────────────────────────────────────────────┘

GET /api/v1/appointments/slots?status=available
├─ Validaciones:
│  └─ Token válido (JWT)
├─ BD: SELECT * WHERE status='available'
└─ Response: 200 + {slots[]}


┌────────────────────────────────────────────────────────────┐
│  PACIENTE RESERVA CITA                                     │
└────────────────────────────────────────────────────────────┘

POST /api/v1/appointments
├─ Body: {slotId}
├─ Mutex: Bloquear slot (evitar race condition)
├─ Transacción BEGIN
│  ├─ SELECT FOR UPDATE appointment_slots WHERE id=slotId
│  ├─ Verificar status='available'
│  ├─ UPDATE status='booked', patient_id=X
│  ├─ INSERT INTO notifications (en BD solo)
│  └─ COMMIT
├─ Release Mutex
└─ Response: 201 + {slot actualizado}


┌────────────────────────────────────────────────────────────┐
│  MÉDICO ASIGNA CITA A PACIENTE (ENVÍA CORREO)             │
└────────────────────────────────────────────────────────────┘

POST /api/v1/appointments
├─ Body: {slotId, patientId}
├─ Médico asigna cita
├─ Transacción BEGIN
│  ├─ UPDATE status='booked', patient_id=patientId, booked_by='doctor'
│  ├─ INSERT INTO notifications
│  └─ COMMIT
├─ emailService.notifyAppointmentBooked()
│  ├─ Obtener email del paciente
│  ├─ nodemailer.sendMail()
│  │  ├─ SMTP: smtp.gmail.com:587
│  │  ├─ Auth: preyvictoria@gmail.com
│  │  ├─ To: paciente@example.com
│  │  └─ Plantilla HTML con fecha/hora
│  └─ Log: "📧 Correo enviado"
└─ Response: 201 + {slot}
```

---

## Flujo de Notificaciones

```
EVENT: Médico asigna cita
│
├─ BASE DE DATOS (Síncrono)
│  ├─ INSERT INTO notifications
│  │  ├─ user_id: ID del paciente
│  │  ├─ message: "El médico ha agendado una nueva cita..."
│  │  └─ is_read: false
│  └─ ✓ Guardado en BD
│
└─ CORREO (Asíncrono)
   ├─ emailService.notifyAppointmentBooked()
   ├─ Conectar a Gmail SMTP
   ├─ Enviar correo HTML
   └─ Log: éxito o error
      (No bloquea la transacción)


ENDPOINTS DE NOTIFICACIONES:

GET /api/v1/notifications/unread
├─ SELECT * FROM notifications
│  WHERE user_id=:userId AND is_read=false
└─ Response: [{id, message, created_at}, ...]

GET /api/v1/notifications/count
├─ SELECT COUNT(*) FROM notifications
│  WHERE user_id=:userId AND is_read=false
└─ Response: {unreadCount: 5}

PATCH /api/v1/notifications/read
├─ Body: {notificationId} (opcional)
├─ Si sin body: UPDATE ALL WHERE user_id=:userId
├─ Si con body: UPDATE WHERE id=:notificationId
└─ Response: {message: "Marcadas como leídas"}

DELETE /api/v1/notifications/:id
├─ DELETE FROM notifications WHERE id=:id
└─ Response: {message: "Notificación eliminada"}
```

---

## Capas de la Aplicación

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN                          │
│                   (Frontend React)                       │
│  - Componentes UI                                       │
│  - Gestión de estado (Context)                          │
│  - Llamadas a API                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
        HTTP/HTTPS      │      JSON
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   CONTROLADORES                          │
│          (appointmentController.js, etc)                │
│  - Validar requests                                     │
│  - Extraer datos                                        │
│  - Llamar servicios                                     │
│  - Formatear responses                                  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   SERVICIOS                              │
│       (appointmentService, notificationService)         │
│  - Lógica de negocio                                    │
│  - Transacciones                                        │
│  - Validaciones complejas                               │
│  - Llamar utilidades (emailService)                     │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──┐  ┌────────▼────────┐  ┌──▼──────────┐
│ DATABASE │  │ EMAIL SERVICE   │  │   LOGGER    │
│          │  │ (nodemailer)    │  │  (winston)  │
│PostgreSQL│  │ SMTP Gmail      │  │             │
│          │  │                 │  │             │
│ Tables:  │  │ Functions:      │  │ Logs:       │
│ -users   │  │ -sendEmail()    │  │ -info       │
│ -patients│  │ -notify*()      │  │ -error      │
│ -slots   │  │                 │  │ -debug      │
│ -notif   │  │ Events:         │  │             │
│          │  │ -Nueva cita     │  │             │
│          │  │ -Cancelación    │  │             │
│          │  │ -Reprogramación │  │             │
└──────────┘  └─────────────────┘  └─────────────┘
```

---

## Protección Contra Race Conditions

```
ESCENARIO: Dos pacientes intentan reservar el mismo slot

┌─────────────────────────────────────────────────────────┐
│ PACIENTE A                  │  PACIENTE B               │
└────────────┬────────────────┼─────────────┬─────────────┘
             │                │             │
        1. POST /appointments │             │ 1. POST /appointments
             │                │             │
             ├─ Mutex.lock()  │             │ (espera)
             │                │             │
             ├─ BEGIN         │             │
             │                │             │
             ├─ SELECT FOR    │             │
             │  UPDATE        │             │
             │  slot WHERE    │             │
             │  id=X          │             │
             │  (BLOQUEA)     │             │
             │                │             │
             ├─ UPDATE        │             │
             │  status=booked │             │
             │                │             │
             ├─ COMMIT        │             │
             │                │             │
             └─ Mutex.unlock()│             │
                              │             │
                              ├─ Mutex.lock()
                              │
                              ├─ BEGIN
                              │
                              ├─ SELECT FOR
                              │  UPDATE
                              │  (status ya es 'booked')
                              │
                              ├─ ERROR: Slot no disponible
                              │
                              ├─ ROLLBACK
                              │
                              └─ Mutex.unlock()

RESULTADO: Paciente A logra reservar, Paciente B recibe error
           (Comportamiento correcto)
```

---

## Manejo de Transacciones

```
ESCENARIO: Médico asigna cita a paciente

BEGIN TRANSACTION
│
├─1. SELECT FOR UPDATE (Bloqueo exclusivo de fila)
│   └─ appointment_slots WHERE id=$1
│
├─2. Verificar status='available'
│   └─ Si no es available → ROLLBACK + ERROR
│
├─3. UPDATE status='booked'
│   ├─ UPDATE appointment_slots
│   └─ SET patient_id=$1, booked_by=$2, status='booked'
│
├─4. INSERT notificación
│   ├─ INSERT INTO notifications
│   └─ (user_id, message, created_at)
│
├─5. COMMIT
│   └─ Todas las operaciones se confirman
│
└─ emailService.sendMail() [ASYNC - NO BLOQUEA]
   └─ Si falla email, cita igual está guardada

MANEJO DE ERRORES:
├─ Si error en paso 1-4: ROLLBACK automático
└─ Si error en email: Log en consola, cita OK
```

---

## Estado de Transacciones en DB

```
APPOINTMENT_SLOTS table:

┌──────────────────────┬────────┬────────────┬──────────┐
│ id                   │ status │ patient_id │ booked_by│
├──────────────────────┼────────┼────────────┼──────────┤
│ uuid-1 (new)         │available   NULL    │  NULL    │
├──────────────────────┼────────┼────────────┼──────────┤
│ uuid-2 (booked)      │booked  │ uuid-pat-1 │ patient  │
├──────────────────────┼────────┼────────────┼──────────┤
│ uuid-3 (doctor-assign)│booked │ uuid-pat-2 │ doctor   │
├──────────────────────┼────────┼────────────┼──────────┤
│ uuid-4 (cancelled)   │available   NULL    │  NULL    │
└──────────────────────┴────────┴────────────┴──────────┘

Ciclo de vida:
   INSERT      UPDATE       UPDATE          UPDATE
     │          │             │               │
┌─ available ┌─ booked ┌─ booked ────────┬─ available
│            │ (booked │ (reschedule)    │ (cancelled)
│            │  by     └─ booked          │
│            │  patient)  (rescheduled)  │
└────────────└────────────────────────────┴────────────

Datos guardados en NOTIFICATIONS:

┌──────────────────┬────────────┬──────────────────────────┐
│ id               │ user_id    │ message                  │
├──────────────────┼────────────┼──────────────────────────┤
│ uuid-notif-1     │ uuid-user  │ "Médico agendó cita..."  │
├──────────────────┼────────────┼──────────────────────────┤
│ uuid-notif-2     │ uuid-user  │ "Cita reprogramada..."   │
├──────────────────┼────────────┼──────────────────────────┤
│ uuid-notif-3     │ uuid-user  │ "Cita cancelada..."      │
└──────────────────┴────────────┴──────────────────────────┘
```

---

## Flujo de Correos Electrónicos

```
ENVÍO DE CORREO:

1. APP GENERA EVENTO
   └─ bookSlot(bookedBy='doctor')
      └─ emailService.notifyAppointmentBooked()

2. PREPARAR CORREO
   ├─ Obtener datos paciente (email, nombre)
   ├─ Obtener datos cita (fecha, hora)
   └─ Renderizar plantilla HTML

3. CONECTAR SMTP
   ├─ host: smtp.gmail.com
   ├─ port: 587
   ├─ user: preyvictoria@gmail.com
   ├─ pass: [contraseña de aplicación]
   └─ secure: false (587 es TLS, no SSL)

4. ENVIAR
   ├─ From: preyvictoria@gmail.com
   ├─ To: paciente@example.com
   ├─ Subject: ✅ Nueva cita médica agendada - MediCita
   ├─ HTML: Plantilla HTML con estilos
   └─ Text: Versión de texto plano

5. RESPUESTA
   ├─ OK: Log "📧 Correo enviado"
   └─ ERROR: Log "❌ Error al enviar"
      (No afecta la reserva de cita)

REINTENTOS: No implementado (future enhancement)
```

---

## Seguridad - Control de Acceso

```
CONTROL DE ACCESO POR ROLE:

┌──────────────────────────────────────────────────┐
│ Endpoint: POST /appointments/slots               │
├──────────────────────────────────────────────────┤
│ Permitido: Doctor                                │
│ Denegado: Paciente                               │
├──────────────────────────────────────────────────┤
│ Middleware:                                      │
│ 1. authenticate() → valida JWT                   │
│ 2. authorize('doctor') → valida role             │
│ 3. validar body → fecha, hora                    │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Endpoint: GET /appointments/mine                 │
├──────────────────────────────────────────────────┤
│ Permitido: Paciente (solo SUS citas)             │
│ Denegado: Doctor, otro paciente                  │
├──────────────────────────────────────────────────┤
│ Implementación:                                  │
│ 1. authenticate() → valida JWT                   │
│ 2. authorize('patient') → valida role            │
│ 3. patientService.getPatientByUserId(userId)     │
│ 4. SELECT * WHERE patient_id=$1                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Endpoint: DELETE /appointments/:id               │
├──────────────────────────────────────────────────┤
│ Paciente puede: Cancelar SOLO sus citas          │
│ Doctor puede: Cancelar CUALQUIER cita            │
├──────────────────────────────────────────────────┤
│ Validación:                                      │
│ if (role === 'patient') {                        │
│   if (patientId !== requestedSlot.patient_id)   │
│     return 403 Forbidden                         │
│ }                                                │
└──────────────────────────────────────────────────┘
```

---

**Última actualización**: Mayo 25, 2026  
**Versión**: 1.0  
**Estado**: ✅ Completo
