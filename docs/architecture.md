# ARQUITECTURA DEL SISTEMA DE CITAS MÉDICAS

## 1. Diagrama de Flujo General

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
       │                                      ┌────────────┼────────────┬─────────────┐
       │                                      │            │            │             │
       │                                      ▼            ▼            ▼             ▼
       │                                  PostgreSQL  Nodemailer  Logger (Winston)  Mutex
       │                                      DB       (SMTP)        (Logs)      (async-m)
       │                                   - users      Gmail      error.log
       │                                   - patients   TLS:587    combined.log
       │                                   - slots
       │                                   - records
       │                                   - notif
       │
       └──────────────────────────────────────────────────┘
             JWT Token para autenticación (Bearer)
```

---

## 2. Modelo de Datos Completo

```
┌────────────────────────────────┐
│          USERS                 │
├────────────────────────────────┤
│ id (UUID) PRIMARY KEY          │
│ username (VARCHAR, UNIQUE)     │
│ password_hash (bcrypt)         │
│ role ENUM(patient|doctor)      │
│ is_active (BOOLEAN)            │
│ created_at                     │
│ updated_at                     │
└────────────┬───────────────────┘
             │
    ┌────────┴─────────┬──────────────────────┐
    │ 1:1              │ 1:N                  │
    │                  │
    ▼                  ▼
┌──────────────────┐  ┌────────────────────────┐
│   PATIENTS       │  │  REFRESH_TOKENS        │
├──────────────────┤  ├────────────────────────┤
│ id (UUID) PK     │  │ id (UUID) PRIMARY KEY  │
│ user_id FK(1:1)  │  │ user_id FK             │
│ full_name        │  │ token_hash (SHA-256)   │
│ email (UNIQUE)   │  │ expires_at             │
│ phone            │  │ revoked (BOOLEAN)      │
│ address          │  │ created_at             │
│ birth_date       │  └────────────────────────┘
│ sex ENUM(M|F|O)  │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │
    1:N  │
         │
    ┌────▼────────────────────────┐
    │  APPOINTMENT_SLOTS          │
    ├─────────────────────────────┤
    │ id (UUID) PRIMARY KEY       │
    │ slot_date (DATE)            │
    │ slot_time (TIME)            │
    │ status ENUM(available|      │
    │         booked|cancelled)   │
    │ patient_id FK (NULLABLE)    │
    │ doctor_id FK (NULLABLE)     │
    │ booked_by ENUM(patient|     │
    │           doctor|NULL)      │
    │ created_at                  │
    │ updated_at                  │
    │ UNIQUE(slot_date, slot_time)│
    └──────┬──────────┬───────────┘
           │ 1:1      │
           │          │
    ┌──────▼─────────▼──────────┐
    │  CLINICAL_RECORDS         │
    ├───────────────────────────┤
    │ id (UUID) PRIMARY KEY     │
    │ slot_id FK (UNIQUE)       │
    │ patient_id FK             │
    │ doctor_id FK (NULL)       │
    │ vital_signs_enc (AES-256) │
    │ diagnosis_enc (AES-256)   │
    │ prescriptions_enc (AES256)│
    │ lab_results_enc (AES-256) │
    │ notes_enc (AES-256)       │
    │ recorded_at               │
    │ updated_at                │
    └───────────────────────────┘

┌────────────────────────────────┐
│    NOTIFICATIONS               │
├────────────────────────────────┤
│ id (UUID) PRIMARY KEY          │
│ user_id FK → USERS             │
│ message (TEXT)                 │
│ is_read (BOOLEAN, def: FALSE)  │
│ created_at                     │
│ INDEX(user_id, is_read)        │
└────────────────────────────────┘

ENUMS DEFINIDOS:
─────────────────
CREATE TYPE user_role AS ENUM ('patient', 'doctor');
CREATE TYPE patient_sex AS ENUM ('M', 'F', 'O');
CREATE TYPE slot_status AS ENUM ('available', 'booked', 'cancelled');
CREATE TYPE booking_by AS ENUM ('patient', 'doctor');
```

---

## 3. Flujo de Autenticación Completo

```
┌──────────────────┐
│    PACIENTE      │
└────────┬─────────┘
         │
         ├─ 1. POST /auth/register (opcional)
         │   └─ {username, password, email, fullName, birthDate, phone, address, sex}
         │   └─ Crea: users + patients
         │   └─ Response 201
         │
         ├─ 2. POST /auth/login
         │   └─ {username, password}
         │   └─ Validaciones:
         │      ├─ Usuario existe
         │      ├─ bcrypt.compare(password, password_hash)
         │      ├─ is_active = true
         │      └─ No es hardcode
         │
         ├─ 3. Genera tokens JWT:
         │   ├─ accessToken (HS256, exp 15min)
         │   │  └─ Payload: {sub: userId, username, role, iat, exp}
         │   │
         │   ├─ refreshToken (HS256, exp 7d)
         │   │  └─ Almacena hash(refreshToken) en BD
         │   │  └─ Tabla: refresh_tokens
         │   │
         │   └─ Response 200:
         │      {
         │        "accessToken": "eyJhbG...",
         │        "refreshToken": "eyJhbG...",
         │        "user": {id, username, role}
         │      }
         │
         ├─ 4. Cliente almacena tokens:
         │   └─ localStorage.setItem('accessToken', token)
         │   └─ localStorage.setItem('refreshToken', token)
         │
         ├─ 5. Usar accessToken en requests:
         │   └─ GET /appointments/mine
         │   └─ Header: Authorization: Bearer eyJhbG...
         │
         ├─ Middleware authenticate():
         │   ├─ Extrae token del header
         │   ├─ jwt.verify(token, JWT_SECRET)
         │   ├─ Valida no expirado
         │   ├─ Extrae: sub (user_id), role
         │   └─ Asigna: req.user = {id, username, role}
         │
         └─ 6. Renovación (después 15 min):
            ├─ POST /auth/refresh {refreshToken}
            │
            ├─ Backend verifica:
            │  ├─ token_hash existe en BD
            │  ├─ expires_at > NOW
            │  ├─ revoked = false
            │  └─ Usuario is_active = true
            │
            └─ Genera nuevo accessToken (15 min más)
               └─ Response 200: {accessToken}

LOGOUT (Cierre de sesión):
            ├─ POST /auth/logout
            │
            └─ UPDATE refresh_tokens SET revoked=true
               └─ Refresh tokens quedan inválidos
               └─ Cliente elimina tokens locales
```

---

## 4. Flujo de Reserva de Cita (Con Exclusión Mutua)

```
┌─────────────────────────────────────────────────────────────┐
│  ESCENARIO 1: Paciente reserva slot (autoservicio)          │
└─────────────────────────────────────────────────────────────┘

POST /api/v1/appointments
├─ Headers: Authorization: Bearer accessToken
├─ Body: {slotId, patientId}
│
├─ Validaciones:
│  ├─ Token válido y no expirado
│  ├─ Role: patient (authorize middleware)
│  ├─ slotId es UUID válido
│  └─ patientId pertenece al usuario
│
├─ appointmentService.bookSlot():
│
│  ┌─ CAPA 1: Mutex en memoria
│  │  └─ withSlotLock(slotId, async () => {
│  │
│  │  ┌─ CAPA 2: Transacción BD
│  │  │
│  │  ├─ BEGIN TRANSACTION
│  │  │
│  │  ├─ SELECT FOR UPDATE appointment_slots
│  │  │  WHERE id=$1
│  │  │  └─ Bloquea la fila: otros queries esperan
│  │  │
│  │  ├─ Verificar: status='available'
│  │  │  └─ Si no: ROLLBACK + return 409 Conflict
│  │  │
│  │  ├─ UPDATE appointment_slots
│  │  │  SET status='booked'::slot_status,
│  │  │      patient_id=$1,
│  │  │      booked_by='patient',
│  │  │      updated_at=NOW()
│  │  │
│  │  ├─ INSERT INTO notifications (user_id, message)
│  │  │  └─ "Tu cita ha sido reservada..."
│  │  │
│  │  ├─ COMMIT
│  │  │  └─ Libera lock a nivel BD
│  │  │
│  │  └─ })  ◄─ Cierra withSlotLock
│  │      └─ Libera Mutex en memoria
│  │
│  └─ (Si error: ROLLBACK automático)
│
├─ emailService.notifyAppointmentBooked() [ASYNC - No bloquea]
│  ├─ Obtener email paciente
│  ├─ Obtener detalles de la cita
│  └─ SMTP: enviar correo HTML
│
└─ Response 201 Created:
   {
     "id": "uuid-slot",
     "slot_date": "2026-06-15",
     "slot_time": "14:30",
     "status": "booked",
     "patient_id": "uuid-patient",
     "booked_by": "patient"
   }


┌─────────────────────────────────────────────────────────────┐
│  ESCENARIO 2: Médico asigna cita a paciente                │
└─────────────────────────────────────────────────────────────┘

POST /api/v1/appointments
├─ Headers: Authorization: Bearer doctorToken
├─ Body: {slotId, patientId}
│
├─ Validaciones:
│  ├─ Role: doctor (authorize middleware)
│  ├─ slotId existe
│  └─ patientId existe
│
├─ appointmentService.bookSlot():
│
│  ├─ withSlotLock(slotId, async () => {
│  │  ├─ BEGIN
│  │  ├─ SELECT FOR UPDATE (mismo slot)
│  │  ├─ Verificar available
│  │  ├─ UPDATE status='booked', doctor_id=doctorId, booked_by='doctor'
│  │  ├─ INSERT INTO notifications
│  │  └─ COMMIT
│  │  })
│  │
│  └─ emailService.notifyAppointmentBooked() [ASYNC]
│     ├─ Obtener correo paciente
│     ├─ SMTP (smtp.gmail.com:587, TLS)
│     └─ Enviar HTML + plain text
│
└─ Response 201 Created
```

---

## 5. Flujo de Notificaciones

```
EVENT: Médico asigna cita
│
├─ BASE DE DATOS (Síncrono - parte de transacción)
│  ├─ INSERT INTO notifications
│  │  ├─ user_id: ID del paciente
│  │  ├─ message: "El médico ha agendado una nueva cita..."
│  │  ├─ is_read: false
│  │  └─ created_at: CURRENT_TIMESTAMP
│  └─ ✓ COMMIT (se guardan en BD)
│
└─ CORREO ELECTRÓNICO (Asíncrono - No bloquea)
   ├─ emailService.notifyAppointmentBooked()
   ├─ Conectar a Gmail SMTP (smtp.gmail.com:587)
   ├─ Enviar correo HTML
   ├─ Log: éxito o error
   └─ Si falla: cita igual se guardó, solo falló el correo

ENDPOINTS DE NOTIFICACIONES:

GET /api/v1/notifications/unread
├─ Auth: Requerida
├─ SELECT * FROM notifications
│  WHERE user_id=:userId AND is_read=false
│  ORDER BY created_at DESC
└─ Response 200: [{id, message, created_at}, ...]

GET /api/v1/notifications/count
├─ Auth: Requerida
├─ SELECT COUNT(*) FROM notifications
│  WHERE user_id=:userId AND is_read=false
└─ Response 200: {unreadCount: 5}

PATCH /api/v1/notifications/read
├─ Auth: Requerida
├─ Body: {notificationId} (opcional)
├─ Si sin body: UPDATE todos WHERE user_id=:userId
├─ Si con body: UPDATE WHERE id=:notificationId AND user_id=:userId
│  SET is_read=true
└─ Response 200: {message: "Marcadas como leídas"}

DELETE /api/v1/notifications/:id
├─ Auth: Requerida
├─ DELETE FROM notifications WHERE id=:id AND user_id=:userId
└─ Response 204 (Sin contenido)
```

---

## 6. Capas de la Aplicación

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       CAPA DE PRESENTACIÓN                                   │
│                       (Frontend - React 18)                                  │
│                                                                              │
│  Pages: LoginPage, AppointmentsPage, DashboardPage, ClinicalRecordPage      │
│  Components: Layout, Navigation, Forms, Icons                               │
│  Context: AuthContext (maneja JWT tokens en localStorage)                   │
│  Services: api.js (fetch con Authorization: Bearer header)                  │
│  Utils: formatters.js (fecha, validación)                                   │
└──────────────────────────────────────────────┬─────────────────────────────┘
                                               │
                    HTTP/HTTPS REST API (puerto 3000)
                         JSON + JWT Header
                                               │
┌──────────────────────────────────────────────▼─────────────────────────────┐
│                    CAPA DE CONTROLADORES                                   │
│                   (Express.js - Middleware)                                │
│                                                                            │
│  Funciones por endpoint:                                                  │
│  ├─ authenticate() → Verifica JWT (extrae user_id, role)                  │
│  ├─ authorize(...roles) → Verifica permisos                               │
│  ├─ validar body con express-validator                                    │
│  ├─ Llamar al Service                                                     │
│  ├─ Formatear respuesta HTTP                                              │
│  └─ Capturar errores y pasar a errorHandler                               │
│                                                                            │
│  Controllers:                                                              │
│  ├─ appointmentController.js                                              │
│  ├─ authController.js                                                     │
│  ├─ clinicalRecordController.js                                           │
│  ├─ patientController.js                                                  │
│  └─ notificationController.js                                             │
└──────────────────────────────────────────────▼─────────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼─────────────────────────────┐
│                    CAPA DE SERVICIOS                                       │
│                  (Lógica de Negocio Pura)                                  │
│                                                                            │
│  appointmentService:                                                      │
│  ├─ getSlots(filters) → SELECT con filtros                               │
│  ├─ createSlot(date, time, doctorId) → INSERT                            │
│  ├─ bookSlot(slotId, patientId) → Exclusión mutua + SELECT FOR UPDATE    │
│  └─ cancelSlot(slotId) → UPDATE status='cancelled'                       │
│                                                                            │
│  authService:                                                             │
│  ├─ register(data) → bcrypt + INSERT users + INSERT patients             │
│  ├─ login(username, password) → JWT generation                            │
│  ├─ refreshAccessToken(refreshToken) → JWT renewal                       │
│  └─ logout(userId) → Revoke refresh token                                │
│                                                                            │
│  patientService:                                                          │
│  ├─ getPatient(id) → SELECT from patients                                │
│  ├─ updatePatient(id, data) → UPDATE patients                            │
│  └─ getAllPatients(limit, offset) → SELECT con paginación                │
│                                                                            │
│  clinicalRecordService:                                                   │
│  ├─ create(data) → Encripta con AES-256-CBC → INSERT                     │
│  ├─ getByPatient(patientId) → Desencripta en memoria                     │
│  ├─ getBySlot(slotId) → Desencripta en memoria                           │
│  └─ update(id, data) → Encripta → UPDATE                                 │
│                                                                            │
│  notificationService:                                                     │
│  ├─ getUnread(userId) → SELECT is_read=false                             │
│  ├─ markRead(notificationId) → UPDATE is_read=true                       │
│  ├─ delete(notificationId) → DELETE                                       │
│  └─ create(userId, message) → INSERT                                      │
│                                                                            │
│  TODOS INCLUYEN:                                                          │
│  ├─ withSlotLock() → async-mutex para concurrencia                        │
│  ├─ Transacciones ACID → SELECT FOR UPDATE                               │
│  ├─ Validaciones complejas                                                │
│  └─ Throw {message, statusCode}                                           │
└──────────────────────────┬──────────────────┬──────────────┬──────────────┘
                           │                  │              │
        ┌──────────────────▼──────────┐      │              │
        │  DATABASE                   │      │              │
        │  PostgreSQL (puerto 5432)   │      │              │
        │                             │      │              │
        │  Tables:                    │      │              │
        │  ├─ users                   │      │              │
        │  ├─ refresh_tokens          │      │              │
        │  ├─ patients                │      │              │
        │  ├─ appointment_slots       │      │              │
        │  ├─ clinical_records        │      │              │
        │  └─ notifications           │      │              │
        │                             │      │              │
        │  Características:           │      │              │
        │  ├─ ACID transactions       │      │              │
        │  ├─ Row-level locking       │      │              │
        │  ├─ Índices optimizados     │      │              │
        │  ├─ Foreign keys            │      │              │
        │  └─ Triggers (updated_at)   │      │              │
        └─────────────────────────────┘      │              │
                                             │              │
        ┌────────────────────────────────┐   │              │
        │ EMAIL SERVICE                  │   │              │
        │ (nodemailer)                   │   │              │
        │                                │   │              │
        │ SMTP Gmail:                    │   │              │
        │ ├─ Host: smtp.gmail.com        │   │              │
        │ ├─ Port: 587 (STARTTLS)        │   │              │
        │ ├─ User: ${SMTP_USER}          │   │              │
        │ ├─ Pass: ${SMTP_PASS}          │   │              │
        │ └─ Secure: false               │   │              │
        │                                │   │              │
        │ Plantillas:                    │   │              │
        │ ├─ appointmentNotif            │   │              │
        │ ├─ cancellation                │   │              │
        │ ├─ reminder                    │   │              │
        │ └─ clinical_note               │   │              │
        │                                │   │              │
        │ Ejecución: Asíncrona           │   │              │
        │ (No bloquea transacción)       │   │              │
        └────────────────────────────────┘   │              │
                                             │              │
        ┌────────────────────────────────┐   │              │
        │ LOGGER (Winston)               │   │              │
        │                                │   │              │
        │ Niveles:                       │   │              │
        │ ├─ error   → error.log         │   │              │
        │ ├─ warn    → combined.log      │   │              │
        │ ├─ info    → combined.log      │   │              │
        │ └─ debug   → console (dev)     │   │              │
        │                                │   │              │
        │ Eventos logueados:             │   │              │
        │ ├─ Login exitoso               │   │              │
        │ ├─ Error de autenticación      │   │              │
        │ ├─ Cita reservada              │   │              │
        │ └─ Correo enviado/fallido      │   │              │
        └────────────────────────────────┘   │              │
                                             │              │
        ┌────────────────────────────────┐   │              │
        │ MUTEX (async-mutex)            │   │              │
        │                                │   │              │
        │ Implementación:                │   │              │
        │ ├─ slotMutexes = Map()         │   │              │
        │ ├─ Un Mutex por slot_id        │   │              │
        │ └─ withSlotLock(slotId, fn)    │   │              │
        │    └─ Ejecuta fn de forma      │   │              │
        │       exclusiva                │   │              │
        │                                │   │              │
        │ Previene race conditions       │   │              │
        │ en una instancia Node.js       │   │              │
        └────────────────────────────────┘   │              │
                                             └──────────────┘
```

---

## 7. Protección Contra Race Conditions

```
ESCENARIO: Dos pacientes intentan reservar el mismo slot SIMULTÁNEAMENTE

┌──────────────────────────────────────────────────────────────────────┐
│ PACIENTE A                │  PACIENTE B                              │
└────────┬─────────────────┬─────────────────┬──────────────────────┘
         │                 │                 │
    1. POST /appointments  │                 │
         │                 │                 │
         ├─ Mutex.lock()   │                 │  (espera en queue)
         │  (ACQUIRED)     │                 │
         │                 │                 │
         ├─ BEGIN          │                 │
         │                 │                 │
         ├─ SELECT FOR     │                 │
         │  UPDATE         │                 │
         │  (status='avail')                 │
         │  (FILA BLOQUEADA)                │
         │                 │ 1. POST /appointments
         │                 │    ├─ Mutex.lock()
         │                 │    │  (ESPERA...)
         │                 │    │
         ├─ UPDATE         │    │
         │  status='booked'│    │
         │                 │    │
         ├─ INSERT notif   │    │
         │                 │    │
         ├─ COMMIT         │    │
         │  (libera lock BD) │   │
         │                 │    │
         └─ Mutex.unlock() │    ├─ Mutex.lock()
            (libera mutex)  │    │  (ACQUIRED)
                            │    │
                            │    ├─ BEGIN
                            │    │
                            │    ├─ SELECT FOR UPDATE
                            │    │  (status='booked' YA)
                            │    │
                            │    ├─ ERROR: Slot no disponible
                            │    │
                            │    ├─ ROLLBACK
                            │    │
                            │    └─ Mutex.unlock()

RESULTADOS:
┌──────────────────────────────────────────┐
│ Paciente A: HTTP 201 (Éxito)             │
│ Paciente B: HTTP 409 (Slot no disponible)│
│ Double-booking: NO (Prevenido)           │
└──────────────────────────────────────────┘

GARANTÍA: Exactamente 1 de N requests simultáneos obtiene HTTP 201
```

---

## 8. Estado de Transacciones en DB

```
APPOINTMENT_SLOTS table:

┌──────────────────┬──────────────┬────────────┬────────────┬──────────────┐
│ id               │ status       │ patient_id │ doctor_id  │ booked_by    │
├──────────────────┼──────────────┼────────────┼────────────┼──────────────┤
│ uuid-1           │ available    │ NULL       │ uuid-doc1  │ NULL         │
├──────────────────┼──────────────┼────────────┼────────────┼──────────────┤
│ uuid-2           │ booked       │ uuid-pat1  │ uuid-doc1  │ patient      │
├──────────────────┼──────────────┼────────────┼────────────┼──────────────┤
│ uuid-3           │ booked       │ uuid-pat2  │ uuid-doc1  │ doctor       │
├──────────────────┼──────────────┼────────────┼────────────┼──────────────┤
│ uuid-4           │ cancelled    │ NULL       │ uuid-doc1  │ patient      │
└──────────────────┴──────────────┴────────────┴────────────┴──────────────┘

CLINICAL_RECORDS table (Historia clínica encriptada):

┌──────────────┬────────────┬────────────┬────────────┬──────────────────────┐
│ id           │ slot_id    │ patient_id │ doctor_id  │ vital_signs_enc      │
├──────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ uuid-rec-1   │ uuid-2     │ uuid-pat1  │ uuid-doc1  │ AES-256-CBC encrypted│
├──────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ uuid-rec-2   │ uuid-3     │ uuid-pat2  │ uuid-doc1  │ AES-256-CBC encrypted│
└──────────────┴────────────┴────────────┴────────────┴──────────────────────┘

Ciclo de vida del SLOT:

   INSERT              BOOKED           RESCHEDULE/CANCEL
     │                   │                    │
  available ────────► booked ────────────► cancelled
  (por doctor)    (por patient/doctor)    (cancelado)
```

---

## 9. Flujo de Correos Electrónicos

```
ENVÍO DE CORREO:

1. APP GENERA EVENTO
   └─ bookSlot(bookedBy='doctor')
      └─ emailService.notifyAppointmentBooked()
      └─ ASYNC (no bloquea transacción)

2. PREPARAR CORREO
   ├─ Obtener datos paciente (email, nombre)
   ├─ Obtener datos cita (fecha, hora, médico)
   └─ Renderizar plantilla HTML profesional

3. CONECTAR SMTP
   ├─ host: smtp.gmail.com
   ├─ port: 587
   ├─ secure: false (STARTTLS)
   ├─ user: ${SMTP_USER} (desde .env)
   ├─ pass: ${SMTP_PASS} (contraseña de aplicación)
   └─ connectionTimeout: 10000ms

4. ESTRUCTURA DEL CORREO
   ├─ From: MediCita <${SMTP_USER}>
   ├─ To: paciente@example.com
   ├─ Subject: Confirmación de Cita - MediCita
   ├─ HTML:
   │  ├─ Logo y header
   │  ├─ Bienvenida personalizada
   │  ├─ Datos de la cita (fecha, hora, médico, ubicación)
   │  ├─ Instrucciones
   │  └─ Footer con contacto
   └─ Text: Versión texto plano (alternativa)

5. ENVÍO
   ├─ transporter.sendMail(mailOptions)
   ├─ OK: logger.info('Correo enviado', {userId, email})
   └─ ERROR: logger.error('Fallo envío correo', {error})
      (No afecta la reserva - cita ya guardada en BD)

CONFIGURACIÓN REQUERIDA EN .env:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_correo@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  (contraseña de aplicación Gmail)
   SMTP_FROM=MediCita
```

---

## 10. Endpoints Principales del API

```
BASE URL: http://localhost:3000/api/v1

AUTENTICACIÓN:
  POST   /auth/register      - Registrar paciente
  POST   /auth/login         - Iniciar sesión → {accessToken, refreshToken}
  POST   /auth/refresh       - Renovar access token
  POST   /auth/logout        - Cerrar sesión

PACIENTES:
  GET    /patients           - Listar pacientes (doctor)
  GET    /patients/me        - Mi perfil
  GET    /patients/:id       - Detalle paciente
  PUT    /patients/:id       - Actualizar datos
  DELETE /patients/:id       - Soft-delete

CITAS:
  GET    /appointments/slots - Listar slots (filtrable)
  POST   /appointments/slots - Crear slot (doctor)
  GET    /appointments/mine  - Mis citas
  POST   /appointments       - Reservar cita (con exclusión mutua)
  DELETE /appointments/:id   - Cancelar cita

HISTORIA CLÍNICA:
  POST   /records            - Crear registro (doctor)
  GET    /records/patient/:id - Historial paciente
  GET    /records/slot/:id   - Registro de cita

NOTIFICACIONES:
  GET    /notifications/unread - Notificaciones sin leer
  GET    /notifications/count  - Contar sin leer
  PATCH  /notifications/read   - Marcar como leído
  DELETE /notifications/:id    - Eliminar notificación

REPORTES:
  GET    /reports/patients   - Estadísticas pacientes
  GET    /reports/appointments - Estadísticas citas
```

---

## Información del Documento

**Última actualización**: 26 de Mayo de 2026  
**Versión**: 2.1 (Corregida)  
**Estado**: Validado contra código fuente y migraciones  

