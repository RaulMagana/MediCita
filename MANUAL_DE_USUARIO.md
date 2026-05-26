# MANUAL DE USUARIO

## Sistema Distribuido de Gestión de Citas Médicas — MediCita

**Guía de Instalación y Uso**

**Versión:** 1.0  
**Fecha:** Mayo 2026  

---

## TABLA DE CONTENIDOS

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Instalación](#2-instalación)
3. [Configuración Inicial](#3-configuración-inicial)
4. [Inicio del Sistema](#4-inicio-del-sistema)
5. [Guía de Uso para Pacientes](#5-guía-de-uso-para-pacientes)
6. [Guía de Uso para Médicos](#6-guía-de-uso-para-médicos)
7. [Solución de Problemas](#7-solución-de-problemas)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)

---

## 1. REQUISITOS DEL SISTEMA

### 1.1 Hardware Mínimo

| Componente | Requisito |
|-----------|-----------|
| Procesador | Intel Core i5 o superior |
| Memoria RAM | 8 GB mínimo |
| Disco Duro | 20 GB espacio disponible (SSD recomendado) |
| Red | Conexión a Internet (desarrollo: localhost) |

### 1.2 Software Requerido

| Software | Versión | Propósito |
|----------|---------|----------|
| Node.js | 20.0 o superior | Runtime JavaScript backend |
| PostgreSQL | 16.0 o superior | Base de datos |
| pnpm | 8.0 o superior | Gestor de paquetes |
| Git | 2.40 o superior | Control de versiones |
| Navegador web | Chrome/Firefox/Safari reciente | Frontend React |

### 1.3 Cuentas Externas Opcionales

Para funcionalidad de envío de correos:

- **Gmail:** Cuenta de correo con autenticación de dos factores
- **Contraseña de Aplicación:** Generada en https://myaccount.google.com/apppasswords

---

## 2. INSTALACIÓN

### 2.1 Descargar el Proyecto

**Opción A: Desde Git**

```bash
git clone https://github.com/RaulMagana/MediCita.git
cd MediCita
```

**Opción B: Descargar ZIP**

1. Visita https://github.com/RaulMagana/MediCita
2. Haz clic en "Code" → "Download ZIP"
3. Descomprime el archivo en tu carpeta de proyectos

### 2.2 Instalar PostgreSQL

**En Windows:**

1. Descarga desde https://www.postgresql.org/download/windows/
2. Ejecuta el instalador
3. Durante la instalación:
   - Contraseña de superusuario `postgres`: anota esta contraseña
   - Puerto: mantén 5432 (defecto)
   - Idioma: Español (opcional)
4. Finaliza la instalación

**En macOS (con Homebrew):**

```bash
brew install postgresql
brew services start postgresql
```

**En Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2.3 Instalar Node.js y pnpm

**Node.js:**

1. Descarga desde https://nodejs.org/
2. Elige la versión "LTS" (Long Term Support)
3. Ejecuta el instalador
4. Verifica la instalación:

```bash
node --version
# Debe mostrar: v20.x.x o superior
```

**pnpm:**

```bash
npm install -g pnpm
pnpm --version
# Debe mostrar: 8.x.x o superior
```

### 2.4 Instalar Dependencias del Proyecto

**Backend:**

```bash
cd MediCita/src/backend
pnpm install
```

**Frontend:**

```bash
cd MediCita/src/frontend
pnpm install
```

---

## 3. CONFIGURACIÓN INICIAL

### 3.1 Crear Base de Datos PostgreSQL

Abre una terminal y conéctate a PostgreSQL:

```bash
# En Windows, asegúrate de tener pg_isready disponible
psql -U postgres
```

Se te pedirá la contraseña del usuario `postgres` que estableciste en la instalación.

Dentro de psql, ejecuta:

```sql
CREATE DATABASE medicita_db;
CREATE USER medicita_user WITH PASSWORD 'medicita_pass_123';
ALTER ROLE medicita_user SET client_encoding TO 'utf8';
ALTER ROLE medicita_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE medicita_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE medicita_db TO medicita_user;
\q
```

Salida esperada:
```
CREATE DATABASE
CREATE ROLE
ALTER ROLE
ALTER ROLE
ALTER ROLE
GRANT
```

### 3.2 Ejecutar Migraciones de Base de Datos

Desde la raíz del proyecto:

```bash
cd database/migrations
psql -U medicita_user -d medicita_db -f 001_schema.sql
```

Se te pedirá la contraseña. Ingresa: `medicita_pass_123`

Salida esperada:
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
CREATE TYPE
CREATE TABLE
...
```

### 3.3 Crear Datos Iniciales (Seed)

```bash
cd database/seeds
psql -U medicita_user -d medicita_db -f 001_admin.sql
```

Esto crea un usuario médico administrador para pruebas.

### 3.4 Configurar Variables de Entorno

**Backend:** Crea archivo `.env` en `src/backend/`

```bash
cd src/backend
cp .env.example .env  # Si existe el archivo de ejemplo
# Si no existe, crea manualmente
```

Edita el archivo con tus valores (usa Notepad, VSCode, o nano):

```env
# ═══════════════════════════════════════════════════════════
# AMBIENTE
# ═══════════════════════════════════════════════════════════
NODE_ENV=development
PORT=3000

# ═══════════════════════════════════════════════════════════
# BASE DE DATOS
# ═══════════════════════════════════════════════════════════
DB_HOST=localhost
DB_PORT=5432
DB_USER=medicita_user
DB_PASSWORD=medicita_pass_123
DB_NAME=medicita_db
DB_SSL=false

# ═══════════════════════════════════════════════════════════
# AUTENTICACIÓN - JWT
# ═══════════════════════════════════════════════════════════
JWT_SECRET=tu_secreto_jwt_super_seguro_min_32_caracteres_aqui
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ═══════════════════════════════════════════════════════════
# CIFRADO - AES-256-CBC
# ═══════════════════════════════════════════════════════════
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ═══════════════════════════════════════════════════════════
# CORREO ELECTRÓNICO (Opcional)
# ═══════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_contraseña_aplicación
SMTP_FROM=MediCita <noreply@medicita.com>

# ═══════════════════════════════════════════════════════════
# CORS
# ═══════════════════════════════════════════════════════════
CORS_ORIGINS=http://localhost:5173

# ═══════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════
LOG_LEVEL=info
```

**Frontend:** Crea archivo `.env` en `src/frontend/`

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=MediCita
```

---

## 4. INICIO DEL SISTEMA

### 4.1 Iniciar Base de Datos PostgreSQL

**Windows:**
PostgreSQL se inicia automáticamente con Windows. Si no, usa:
```bash
pg_isready -h localhost -p 5432
```

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

Verifica que está en ejecución:
```bash
psql -U medicita_user -d medicita_db -c "SELECT 1"
# Debe mostrar: 1
```

### 4.2 Iniciar Backend

Terminal 1: Backend

```bash
cd MediCita/src/backend
pnpm dev
```

Salida esperada:
```
🔧 Servidor MediCita corriendo en http://localhost:3000
📋 Ambiente: development
✅ Conexión a PostgreSQL establecida
```

### 4.3 Iniciar Frontend

Terminal 2: Frontend (en otra terminal)

```bash
cd MediCita/src/frontend
pnpm dev
```

Salida esperada:
```
 VITE v5.0.0  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Press h to show help
```

### 4.4 Acceder a la Aplicación

Abre tu navegador en:
```
http://localhost:5173
```

Deberías ver la página de login de MediCita.

---

## 5. GUÍA DE USO PARA PACIENTES

### 5.1 Crear una Cuenta

**Paso 1: Accede a la página de registro**

En la pantalla de login, haz clic en "¿No tienes cuenta? Regístrate"

**Paso 2: Completa el formulario**

```
Usuario:              paciente_001
Contraseña:           MiPass123!  (mín 8 caracteres, mayúscula, minúscula, número)
Nombre completo:      Juan Pérez García
Email:                juan@example.com
Teléfono:             +34 666 777 888
Fecha de nacimiento:  15/05/1990
Sexo:                 Masculino
Dirección:            Calle Principal 123
```

**Paso 3: Haz clic en "Registrarse"**

Se crea tu cuenta y recibirás un correo de confirmación (opcional).

### 5.2 Iniciar Sesión

**Paso 1: Ingresa credenciales**

```
Usuario:      paciente_001
Contraseña:   MiPass123!
```

**Paso 2: Haz clic en "Entrar"**

Se validan tus credenciales y accedes al Dashboard.

### 5.3 Reservar una Cita

**Desde el Dashboard:**

1. Haz clic en "Reservar Nueva Cita"

**En la página de Citas:**

1. Los slots disponibles están en verde
2. Selecciona la fecha y hora que desees
3. Haz clic en "Reservar"
4. Confirma tu selección

**Confirmación:**

Recibirás:
- Notificación en pantalla (toast verde)
- Correo de confirmación (si está configurado)
- La cita aparecerá en "Mis Próximas Citas"

### 5.4 Ver Mis Citas

**Ubicación:** Dashboard → "Mis Próximas Citas"

Verás una lista con:
- Fecha y hora de la cita
- Estado (Pendiente / Completada)
- Acciones disponibles:
  - [Ver Detalles]: Información completa
  - [Cancelar]: Cancela la cita

### 5.5 Cancelar una Cita

1. Haz clic en "Cancelar" en la cita que deseas cancelar
2. Confirma en el diálogo
3. Recibirás confirmación por correo

**Nota:** Las cancelaciones son permitidas hasta 24 horas antes de la cita.

### 5.6 Ver Historia Clínica

**Ubicación:** Menú principal → "Historia Clínica"

Aquí verás todos los registros médicos:
- Diagnósticos
- Prescripciones
- Resultados de análisis
- Signos vitales

**Funciones disponibles:**
- [Ver Completo]: Detalle del registro
- [Descargar PDF]: Exporta el registro (próximamente)

### 5.7 Reportes Personales

**Ubicación:** Menú principal → "Reportes"

Estadísticas de tu uso:
- Total de citas realizadas
- Próximas citas
- Última consulta
- Medicamentos activos

---

## 6. GUÍA DE USO PARA MÉDICOS

### 6.1 Acceso Administrativo

El médico administrador usa credenciales especiales:

```
Usuario:      doctor.admin
Contraseña:   Admin2026
```

**Nota:** Estos usuarios no están en la BD, son hardcoded para acceso inicial.

Para crear más médicos, requiere acceso a BD o panel administrativo (futuro).

### 6.2 Dashboard Médico

Al iniciar sesión como médico, accedes a:

1. **Calendario Semanal:** Vista de toda la semana
2. **Estadísticas:** Pacientes, citas completadas, pendientes
3. **Accesos rápidos:** Crear slot, reservar cita, crear registro

### 6.3 Crear Horarios de Disponibilidad (Slots)

**Paso 1: Abre "Gestionar Horarios"**

En el Dashboard médico, busca "Crear Nuevo Horario" o "Gestionar Slots"

**Paso 2: Completa el formulario**

```
Fecha:     15 de Junio de 2026
Hora:      14:30 (HH:MM)
Duración:  30 minutos (fijo)
```

**Paso 3: Confirma**

El slot se crea y aparece en:
- Tu calendario (verde = disponible)
- Listado de pacientes para que reserVEN

### 6.4 Ver Citas Programadas

**Ubicación:** Dashboard → Calendario Semanal

**Visualización:**

```
Lunes 15 Jun │ Martes 16 Jun │ Miércoles 17 Jun │ ...
─────────────┼───────────────┼──────────────────┼─────
14:00 LIBRE  │ 14:00 LIBRE   │ 14:00 LIBRE      │
14:30 LIBRE  │ 14:30 JUAN    │ 14:30 LIBRE      │
15:00 LIBRE  │ 15:00 LIBRE   │ 15:00 CARLOS     │
```

Leyenda:
- LIBRE (verde): No reservada
- NOMBRE (azul): Reservada por paciente
- TACHADO (gris): Cancelada

### 6.5 Reservar Cita para un Paciente

A veces el médico asigna citas directamente (ej: seguimiento médico).

**Paso 1: Selecciona un slot disponible**

En el calendario, haz clic en un horario verde.

**Paso 2: Busca el paciente**

```
Buscar por:  Nombre / Email / ID Paciente
             (empieza a escribir)
```

Se muestran resultados coincidentes.

**Paso 3: Confirma la reserva**

Haz clic en el paciente, confirma, se crea la cita.

### 6.6 Crear Registro Clínico

Después de una consulta, documenta el registro médico.

**Paso 1: Selecciona la cita**

En el calendario o lista de citas, abre una cita completada.

**Paso 2: Haz clic en "Crear Registro Clínico"**

Se abre un formulario con campos:

```
Signos Vitales:
  Temperatura:       37.2°C
  Presión Arterial:  120/80 mmHg
  Frecuencia Cardíaca: 72 bpm
  Peso:             75.5 kg

Diagnóstico:
  (texto libre)
  "Resfriado común, posible rinitis alérgica"

Prescripción:
  "Paracetamol 500mg cada 8 horas durante 5 días
   Antihistamínico por la noche si es necesario"

Resultados de Análisis:
  (texto libre)
  "Análisis de sangre: normal, leucocitos 7.5"
```

**Paso 3: Guarda el registro**

Haz clic en "Guardar Registro". Los datos se encriptan antes de almacenar.

### 6.7 Ver Historial de un Paciente

**Paso 1: Abre "Listado de Pacientes"**

Menú principal → "Pacientes"

**Paso 2: Selecciona el paciente**

Haz clic en un paciente para ver su perfil y historial.

**Paso 3: Visualiza el historial**

Se muestra:
- Datos demográficos
- Todas sus citas
- Registros clínicos previos
- Diagnósticos y medicamentos

### 6.8 Generar Reportes

**Ubicación:** Menú principal → "Reportes"

**Tipos de reportes disponibles:**

1. **Reporte de Pacientes**
   - Total de pacientes activos
   - Pacientes con citas completadas
   - Pacientes sin historia clínica

2. **Reporte de Citas (por período)**
   - Total de citas realizadas
   - Tasa de utilización
   - Citas canceladas

3. **Reporte de Diagnósticos Más Comunes**
   - Frecuencia de diagnósticos
   - Tendencias estacionales

**Exportar reportes:**
- Botón [Descargar PDF] en cada reporte
- Botón [Compartir]: Envía por correo

---

## 7. SOLUCIÓN DE PROBLEMAS

### 7.1 No Puedo Conectarme a la Base de Datos

**Error en terminal:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluciones:**

1. Verifica que PostgreSQL está corriendo:
```bash
pg_isready -h localhost -p 5432
# Debe mostrar: accepting connections
```

2. Si no está corriendo, inicia el servicio:
   - Windows: Services → PostgreSQL → Iniciar
   - macOS: `brew services start postgresql`
   - Linux: `sudo systemctl start postgresql`

3. Verifica credenciales en `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=medicita_user
DB_PASSWORD=medicita_pass_123  # Verifica esta contraseña
```

### 7.2 Token JWT Expirado

**Error en navegador:**
```
Error: Token inválido o expirado
```

**Solución automática:** El sistema intenta renovar el token automáticamente con el refresh token.

**Si persiste el error:**
1. Cierra sesión: clic en tu nombre → "Cerrar sesión"
2. Limpia el navegador: Ctrl+Shift+Delete → LocalStorage → Elimina tokens
3. Inicia sesión nuevamente

### 7.3 No Llega el Correo de Confirmación

**Posibles causas:**

1. **SMTP no está configurado**
```bash
# Verifica en .env
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Debe ser contraseña de app, no contraseña normal
```

2. **Contraseña de aplicación Gmail inválida**
   - Ve a https://myaccount.google.com/apppasswords
   - Genera una nueva contraseña
   - Cópiala exactamente (16 caracteres con espacios)
   - Actualiza `.env`

3. **Firewall bloquea puerto 587**
   - Contacta a tu administrador de TI
   - Alternativamente, usa puerto 465 (SSL)

### 7.4 No Puedo Reservar una Cita

**Error: "El horario ya no está disponible"**

Esto ocurre cuando:
- Otro usuario reservó el mismo slot en el mismo instante
- El slot fue cancelado
- El slot expiró (antigua funcionalidad)

**Solución:**
- Intenta con otro horario
- Recarga la página para ver slots actualizados

### 7.5 Contraseña Débil No Aceptada

**Error: "La contraseña no cumple con los requisitos"**

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula (A-Z)
- Al menos una minúscula (a-z)
- Al menos un número (0-9)
- Caracteres especiales recomendados (!@#$%^&*)

**Ejemplos válidos:**
- `MiPassword123!`
- `SecurePass456@`
- `MyMedicita2026#`

### 7.6 Frontend No Carga

**Página blanca o error 404**

**Soluciones:**

1. Verifica que el frontend está corriendo:
```bash
cd src/frontend
pnpm dev
# Debe mostrar: http://localhost:5173/
```

2. Accede a http://localhost:5173 (no http://localhost:3000)

3. Limpia caché del navegador: Ctrl+F5

4. Verifica que el backend está corriendo:
```bash
# Abre http://localhost:3000/health en el navegador
# Debe mostrar: {"status":"ok"}
```

### 7.7 Error 500 en el Servidor

**Mensaje:** "Error interno del servidor"

**Causas comunes:**
- Consulta SQL mal formada
- Acceso a BD fallido
- Error en la lógica de negocio

**Solución:**
1. Revisa los logs en terminal del backend:
```
ERROR: ...mensaje específico...
```

2. Copia el error y búscalo en la documentación

3. Si el error persiste, contacta al equipo de desarrollo

---

## 8. PREGUNTAS FRECUENTES

### P: ¿Cada cuánto expira mi sesión?

R: El token de acceso expira cada 15 minutos. El sistema renueva automáticamente si tienes un refresh token válido (7 días). Si ambos expiran, debes iniciar sesión nuevamente.

---

### P: ¿Pueden dos pacientes reservar el mismo horario?

R: No. MediCita implementa un sistema de exclusión mutua que garantiza que solo uno puede reservar un horario. Si dos lo intentan simultáneamente, uno obtendrá un error "Horario no disponible".

---

### P: ¿Dónde se almacenan mis datos médicos?

R: En PostgreSQL, en la tabla `clinical_records`. Los campos sensibles (diagnóstico, prescripciones, resultados) se encriptan con AES-256-CBC antes de almacenar. La llave de encriptación se guarda en variables de entorno, no en la BD.

---

### P: ¿Puedo cambiar mi contraseña?

R: Aún no hay una página de cambio de contraseña. Para hacerlo, contacta al administrador o ejecuta:

```bash
# En psql como administrador:
UPDATE users SET password_hash = '...' WHERE username = 'tu_usuario';
```

(Esto es temporal; en versiones futuras habrá una interfaz de usuario)

---

### P: ¿Se envían recordatorios de citas?

R: Sí, si SMTP está configurado. Se envían:
- Confirmación al reservar
- Recordatorio 24 horas antes
- Comprobante después de la cita

---

### P: ¿Qué sucede si cancelo una cita?

R: El slot vuelve a disponible para otros pacientes. Se envía correo de cancelación confirmando la acción.

---

### P: ¿Puedo recuperar una cita cancelada?

R: No, las cancelaciones son irreversibles. Debes reservar un nuevo horario.

---

### P: ¿Mi información está protegida?

R: Sí:
- Conexión HTTPS (en producción)
- Contraseñas hasheadas con bcrypt
- Datos clínicos encriptados
- Tokens JWT seguros
- Rate limiting contra fuerza bruta
- Auditoría de cambios

---

### P: ¿Funciona en dispositivos móviles?

R: Sí, la interfaz es responsive y funciona en teléfonos y tablets. Se recomienda usar navegadores modernos (Chrome, Firefox, Safari).

---

### P: ¿Puedo usar esto en una red corporativa privada?

R: Sí. En lugar de localhost:5173, configura el servidor en tu red corporativa:

```env
# En .env backend:
CORS_ORIGINS=http://192.168.1.100:5173

# Inicia frontend en:
pnpm dev --host 0.0.0.0
```

Luego accede desde otros equipos: `http://192.168.1.100:5173`

---

### P: ¿Se pueden hacer copias de seguridad?

R: Sí. Realiza dump de la BD:

```bash
pg_dump -U medicita_user medicita_db > backup.sql

# Para restaurar:
psql -U medicita_user medicita_db < backup.sql
```

Se recomienda hacer backups diarios en producción.

---

## SOPORTE

Para reportar problemas o sugerencias:

1. Abre un issue en GitHub: https://github.com/RaulMagana/MediCita/issues
2. Incluye:
   - Versión de Node.js: `node --version`
   - Versión de PostgreSQL: `psql --version`
   - Mensajes de error (copia-pega de terminal/consola)
   - Pasos para reproducir el problema

---

## LICENCIA

MediCita es un proyecto educativo desarrollado para la asignatura de Sistemas Distribuidos en la UADY.

---

**Fecha de última actualización:** Mayo 2026  
**Versión del manual:** 1.0
