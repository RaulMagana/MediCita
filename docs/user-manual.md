# Manual de Usuario — MediCita
## Guía de Instalación y Uso

---

## Prerrequisitos

| Herramienta | Versión mínima | Verificar con |
|-------------|---------------|---------------|
| Node.js     | 20.x          | `node --version` |
| pnpm        | 8.x           | `pnpm --version` |
| MySQL       | 8.0+          | Incluido con XAMPP / WAMP / phpMyAdmin |

> **¿Por qué pnpm y no npm?**
> npm usa un modelo de `node_modules` plano (*hoisting*) donde dependencias
> transitivas quedan accesibles para cualquier módulo del proyecto, aunque
> no estén declaradas. Esto es conocido como *phantom dependencies* y puede
> exponer vulnerabilidades. pnpm usa aislamiento estricto: cada paquete solo
> accede a lo que declaró explícitamente.

---

## Instalación

### 1. Configurar la base de datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE medicita;"

# Crear el esquema (tablas, índices, triggers)
psql -U postgres -d medicita -f database/migrations/001_schema.sql

# Insertar datos iniciales (usuario médico + slots de ejemplo)
psql -U postgres -d medicita -f database/seeds/001_admin.sql
```

### 2. Crear la base de datos en PhpMyAdmin

1. Abrir PhpMyAdmin en tu navegador (normalmente `http://localhost/phpmyadmin`)
2. En el panel izquierdo clic en **Nueva** (o "New")
3. Escribir `medicita` como nombre de base de datos
4. En cotejamiento seleccionar **`utf8mb4_unicode_ci`** → clic en **Crear**
5. Con `medicita` seleccionada en el panel izquierdo, ir a la pestaña **SQL**
6. Pegar el contenido completo de `database/migrations/001_schema.sql` → **Ejecutar**
7. Volver a la pestaña **SQL**, pegar `database/seeds/001_admin.sql` → **Ejecutar**

> Con esto quedan creadas las 6 tablas y el usuario médico administrador con contraseña `Admin2026!`

### 3. Configurar el backend

```bash
# Instalar pnpm globalmente (solo la primera vez)
npm install -g pnpm

cd src/backend

# Copiar y editar las variables de entorno
cp .env.example .env
```

Editar `.env` con tus datos reales:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medicita
DB_USER=postgres
DB_PASSWORD=tu_contraseña

# Generar secretos seguros:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<genera_uno>
JWT_REFRESH_SECRET=<genera_otro>

# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<genera_uno_de_64_chars_hex>
```

```bash
# Instalar dependencias
pnpm install

# Iniciar en modo desarrollo
pnpm dev
```

El backend queda disponible en `http://localhost:3000`.

### 3. Configurar el frontend

```bash
cd src/frontend

pnpm install
pnpm dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## Credenciales iniciales

| Rol | Usuario | Contraseña |
|-----|---------|-----------|
| Médico (admin) | `doctor.admin` | `Admin2026!` |

> **Importante**: Cambia esta contraseña después del primer inicio de sesión.

---

## Guía de uso

### Para el Médico

#### Gestión de pacientes
1. Ir a **Pacientes** en el menú lateral.
2. La tabla muestra todos los pacientes activos con su información principal.
3. Usar el campo de búsqueda para filtrar por nombre o correo.
4. Hacer clic en **Historial** para ver el expediente completo.
5. **Desactivar** elimina el acceso del paciente al sistema (soft delete).

#### Gestión de citas
1. Ir a **Citas** en el menú lateral.
2. El calendario muestra la semana actual con slots codificados por color:
   - 🟢 Verde: disponible — clic para reservar
   - 🔴 Rojo: ocupado — botón "Cancelar" disponible
   - ⬜ Gris: cancelado
3. Al reservar, seleccionar el paciente del desplegable.
4. Navegar entre semanas con los botones Anterior/Siguiente.

#### Historia clínica
1. Desde el historial de un paciente, clic en **✏️ Editar registro**.
2. Rellenar los signos vitales (temperatura, peso, talla, presión).
3. Completar la relatoría: diagnóstico, prescripciones, análisis, notas.
4. Clic en **Guardar registro** — los datos se cifran automáticamente.

#### Reportes
1. Ir a **Reportes**.
2. **Lista de Pacientes**: clic en "Generar reporte" para ver tabla completa con total de citas.
3. **Calendario de Citas**: seleccionar rango de fechas y generar.
4. Desde la lista, clic en **Ver →** para acceder al historial de cualquier paciente.

### Para el Paciente

#### Registro
1. En la pantalla de login, clic en **Regístrate**.
2. Completar todos los campos del formulario.
3. La contraseña debe tener mínimo 8 caracteres con al menos una letra y un número.

#### Reservar una cita
1. Ir a **Mis citas**.
2. Navegar al mes/semana deseada.
3. Clic en un slot verde (disponible).
4. Confirmar en el diálogo — la cita queda registrada a tu nombre.

#### Ver historial clínico
1. Desde el **Panel principal**, clic en **Mi historial clínico**.
2. Las consultas se muestran en acordeón, ordenadas de más reciente a más antigua.
3. Al expandir cada consulta se ven: signos vitales, diagnóstico, prescripciones y notas.

#### Notificaciones
- El ícono 🔔 en la barra superior muestra el contador de notificaciones no leídas.
- Al entrar al **Panel principal** se listan las notificaciones (citas canceladas o agendadas por el médico).
- Clic en **Marcar todas como leídas** para limpiar la bandeja.

---

## Pruebas de concurrencia

```bash
# Desde la raíz del proyecto, con el servidor backend corriendo:
node tests/concurrency/race-condition-test.js

# Probar con más requests simultáneos:
node tests/concurrency/race-condition-test.js 20
```

El script genera `tests/concurrency/report.json` con el resultado detallado.

---

## Pruebas unitarias

```bash
cd src/backend
pnpm test
```

Corre las pruebas de cifrado y del mutex sin necesidad de base de datos.

---

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Error al conectar a BD | Credenciales incorrectas en `.env` | Verificar `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| `ENCRYPTION_KEY inválida` | Clave incorrecta en `.env` | Generar una de 64 chars hex |
| `Token inválido` en frontend | Access token expirado sin refresh | Hacer logout y login de nuevo |
| Slots vacíos en el calendario | Seed no ejecutado | Correr `001_admin.sql` |
| Puerto 3000 en uso | Otro proceso | Cambiar `PORT` en `.env` |
