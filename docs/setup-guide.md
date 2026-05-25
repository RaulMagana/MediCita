# 🔧 Guía de Configuración - Sistema de Citas + Correos

## Paso 1: Obtener Credenciales de Gmail

### Opción A: Contraseña de Aplicación (RECOMENDADO)

Si tienes **2FA activado** en tu cuenta de Google:

1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona "Correo" y "Windows" (o tu SO)
3. Google te generará una contraseña de 16 caracteres
4. Cópiala (será la única vez que la veas)

### Opción B: Acceso a Aplicaciones Menos Seguras

Si **NO tienes 2FA**:

1. Ve a: https://myaccount.google.com/security
2. Busca "Acceso a aplicaciones menos seguras"
3. Activa la opción
4. Usa tu contraseña de Gmail normal

**⚠️ Recomendación**: Usa siempre contraseña de aplicación, es más seguro.

---

## Paso 2: Configurar Variables de Entorno

### Editar `.env` en el backend

```bash
cd /home/magana/Documents/Repositories/MediCita/src/backend
nano .env
```

Busca esta sección y reemplaza `your_smtp_password_here`:

```env
# ═════════════════════════════════════════════════════════════
# SMTP — Configuración de correos electrónicos
# ═════════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=preyvictoria@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # ← Reemplaza con la contraseña generada
```

Guarda el archivo (Ctrl+O, Enter, Ctrl+X)

---

## Paso 3: Verificar Instalación de Dependencias

```bash
cd /home/magana/Documents/Repositories/MediCita/src/backend

# Verificar que nodemailer esté instalado
pnpm list | grep nodemailer
# Debe mostrar: nodemailer@8.0.8
```

---

## Paso 4: Iniciar el Servidor

```bash
cd /home/magana/Documents/Repositories/MediCita/src/backend

# Modo desarrollo con hot-reload
pnpm run dev
```

Deberías ver en los logs:

```
✅ Transporte SMTP inicializado correctamente
Conexión a PostgreSQL establecida
Servidor MediCita corriendo en http://localhost:3000
```

Si no ves ✅ SMTP, revisa el archivo `.env`.

---

## Paso 5: Probar el Sistema

### Test 1: Enviar Correo de Prueba

```bash
# En otra terminal:
cd /home/magana/Documents/Repositories/MediCita

node src/backend/src/utils/emailService.js
```

O usa curl:

```bash
curl -X POST http://localhost:3000/api/v1/test/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token_jwt>"
```

Revisa la bandeja de entrada de `preyvictoria@gmail.com`.

### Test 2: Crear Cita con Correo

1. **Médico crea un slot**:
```bash
curl -X POST http://localhost:3000/api/v1/appointments/slots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <doctor_token>" \
  -d '{
    "date": "2026-06-15",
    "time": "14:30"
  }'
```

Guarda el `id` del slot devuelto.

2. **Médico asigna cita a paciente**:
```bash
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <doctor_token>" \
  -d '{
    "slotId": "uuid-del-slot-aqui",
    "patientId": "uuid-del-paciente-aqui"
  }'
```

3. **Verificar correo**:
   - Revisa `preyvictoria@gmail.com` (o el correo del paciente)
   - Debe llegar un correo con asunto: "✅ Nueva cita médica agendada - MediCita"

---

## Paso 6: Configurar Frontend (Opcional)

Si quieres que el frontend también use los nuevos endpoints:

### Actualizar `src/frontend/src/services/api.js`

Agregar estos servicios:

```javascript
// Citas
export async function getAvailableSlots(filters = {}) {
  const params = new URLSearchParams(filters);
  return api.get(`/appointments/slots?${params}`);
}

export async function bookAppointment(slotId, patientId = null) {
  return api.post('/appointments', { slotId, patientId });
}

export async function getMyAppointments() {
  return api.get('/appointments/mine');
}

export async function getAllAppointments(filters = {}) {
  const params = new URLSearchParams(filters);
  return api.get(`/appointments/all?${params}`);
}

export async function cancelAppointment(appointmentId) {
  return api.delete(`/appointments/${appointmentId}`);
}

export async function rescheduleAppointment(appointmentId, date, time) {
  return api.put(`/appointments/${appointmentId}`, { date, time });
}

// Notificaciones
export async function getUnreadNotifications() {
  return api.get('/notifications/unread');
}

export async function getAllNotifications() {
  return api.get('/notifications/all');
}

export async function countUnreadNotifications() {
  return api.get('/notifications/count');
}

export async function markNotificationsAsRead(notificationId = null) {
  return api.patch('/notifications/read', { notificationId });
}
```

---

## Solución de Problemas

### ❌ "SMTP_PASS no configurada"

**Problema**: Vés este warning en los logs
```
⚠️  SMTP_PASS no configurada. El envío de correos estará deshabilitado.
```

**Solución**:
1. Edita `.env`
2. Verifica que `SMTP_PASS` no esté vacío
3. Reinicia el servidor
4. Usa una contraseña de aplicación (no la contraseña de Gmail)

### ❌ "Error al enviar correo: Invalid credentials"

**Problema**: La contraseña SMTP es incorrecta

**Solución**:
1. Verifica que copiaste correctamente la contraseña de Gmail
2. Las contraseñas de aplicación tienen espacios: `xxxx xxxx xxxx xxxx`
3. Algunos clientes quitan los espacios automáticamente, intenta quitar: `xxxxxxxxxxxxxxxx`
4. Regenera la contraseña en Google

### ❌ "Error de conexión a SMTP"

**Problema**: No puede conectar con smtp.gmail.com

**Soluciones**:
1. Verifica tu conexión a internet
2. Algunos firewalls corporativos bloquean el puerto 587
3. Intenta con puerto 465 (cambiar `SMTP_PORT=465` y `secure: true`)
4. Usa VPN si estás en una red corporativa

### ❌ "Correo no llega"

**Problema**: El correo se "envía" pero no llega

**Soluciones**:
1. Revisa la carpeta de SPAM
2. Verifica que el correo del paciente sea correcto en la BD
3. Busca el correo en los logs con: `grep "📧" logs/`
4. Prueba enviando directamente desde Gmail

### ❌ "Cita no se reserva"

**Problema**: El endpoint `/appointments` falla

**Checklist**:
1. ¿El token es válido? Prueba con `/appointments/mine`
2. ¿El slotId existe? Usa `/appointments/slots` para obtenerlo
3. ¿El slot está available? Si ya está booked, no se puede reservar
4. ¿El patientId es correcto? Solo para médicos

---

## Monitoreo

### Ver Logs de Correos

```bash
# Terminal 1: Iniciar servidor
cd /home/magana/Documents/Repositories/MediCita/src/backend
pnpm run dev

# Terminal 2: Seguir logs de correos
tail -f logs/combined.log | grep "📧"
```

### Ver Notificaciones en BD

```sql
-- Conectarse a la BD:
psql -U postgres -d medicita -h localhost

-- Ver todas las notificaciones:
SELECT id, user_id, message, is_read, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver no leídas:
SELECT * FROM notifications 
WHERE is_read = false 
ORDER BY created_at DESC;
```

---

## Seguridad

### ⚠️ Nunca hagas esto en Producción:

```env
# ❌ NO: Contraseña de Gmail normal
SMTP_PASS=micontraseñareal123

# ✅ SÍ: Contraseña de aplicación
SMTP_PASS=xxxx xxxx xxxx xxxx

# ❌ NO: Commit del .env con credenciales reales
git add .env

# ✅ SÍ: Solo commitear .env.example
git add .env.example
```

### Mejores Prácticas:

1. **Usa contraseña de aplicación**, no tu contraseña de Gmail
2. **Guarda `.env` en `.gitignore`**
3. **Usa variables de entorno en el servidor de producción**
4. **Rotación de credenciales**: Cambia la contraseña cada 3 meses
5. **Monitoring**: Alertas si falla el envío de correos

---

## Flujo Completo de Prueba

```bash
# 1. Backend corriendo
cd /home/magana/Documents/Repositories/MediCita/src/backend
pnpm run dev

# 2. En otra terminal, obtener tokens de prueba
# (Necesitas un usuario doctor y otro patient ya registrado)

# 3. Médico crea slot
curl -X POST http://localhost:3000/api/v1/appointments/slots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d '{
    "date": "2026-06-15",
    "time": "10:00"
  }' | jq '.data.id' -r

# 4. Médico asigna a paciente
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -d "{
    \"slotId\": \"$SLOT_ID\",
    \"patientId\": \"$PATIENT_ID\"
  }"

# 5. Verificar en BD
psql -U postgres -d medicita -c \
  "SELECT * FROM notifications WHERE is_read = false LIMIT 5;"

# 6. Verificar en Gmail: preyvictoria@gmail.com
# Debe haber un correo nuevo con asunto "✅ Nueva cita médica agendada"
```

---

## Documentación Adicional

- 📘 Guía completa: `docs/appointments-management.md`
- 📊 Resumen de cambios: `docs/implementation-summary.md`
- 🧪 Tests: `tests/appointments-api-test.js`
- 📧 Servicio de correos: `src/backend/src/utils/emailService.js`

---

**¡Listo! El sistema de citas con correos está configurado y listo para usar.**

Si tienes problemas, revisa:
1. Los logs del servidor
2. Las notificaciones en la BD
3. La carpeta SPAM de Gmail
4. Las credenciales en `.env`

Éxito! 🚀
