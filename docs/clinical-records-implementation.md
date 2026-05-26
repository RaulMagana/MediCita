# Implementación: Registro de Relatoría Médica con Datos Vitales Encriptados

## Descripción General
La aplicación MediCita ha sido implementada con un sistema completo de registro de relatoría médica durante las consultas con pacientes. Todos los datos sensibles se almacenan encriptados usando AES-256-CBC.

## Características Implementadas

### 1. **Registro de Datos Vitales (Obligatorios)**
Todas las consultas comienzan con el registro de:
- **Temperatura corporal** (°C): Rango 30-45°C
- **Peso** (kg): Mínimo 1 kg
- **Altura/Estatura** (m): Rango 0.3-2.5 m
- **Presión arterial** (mmHg):
  - Sistólica: 50-300 mmHg
  - Diastólica: 30-200 mmHg

Estos datos se **encriptan usando AES-256-CBC** y se almacenan como un objeto JSON encriptado.

### 2. **Relatoría Clínica del Médico**
El médico (Admin/Doctor) puede registrar:
- **Diagnóstico**: Descripción del diagnóstico de la consulta
- **Prescripciones/Medicamentos**: Lista de medicamentos prescritos
- **Resultados de análisis clínicos**: Resultados de laboratorio o pruebas
- **Notas adicionales**: Observaciones importantes

Todos estos campos se **encriptan individualmente** antes de almacenarse.

### 3. **Encriptación de Datos**
- **Algoritmo**: AES-256-CBC (Advanced Encryption Standard)
- **Modo de operación**: CBC (Cipher Block Chaining)
- **IV**: Generado aleatoriamente para cada encriptación (16 bytes)
- **Formato almacenado**: `ivHex:ciphertextBase64`
- **Configuración**: La clave de encriptación está en `ENCRYPTION_KEY` (variable de entorno)

### 4. **Base de Datos**
Tabla `clinical_records` con los siguientes campos:
```sql
CREATE TABLE clinical_records (
    id                UUID NOT NULL PRIMARY KEY,
    slot_id           UUID NOT NULL (UNIQUE),
    patient_id        UUID NOT NULL,
    doctor_id         UUID NULL,  -- Médico que registró
    vital_signs_enc   TEXT NOT NULL,  -- Signos vitales (JSON encriptado)
    diagnosis_enc     TEXT,  -- Diagnóstico encriptado
    prescriptions_enc TEXT,  -- Prescripciones encriptadas
    lab_results_enc   TEXT,  -- Análisis clínicos encriptados
    notes_enc         TEXT,  -- Notas adicionales encriptadas
    recorded_at       TIMESTAMP,  -- Fecha de registro
    updated_at        TIMESTAMP   -- Última actualización
);
```

### 5. **API Endpoints**

#### Crear Registro Clínico
```
POST /records
Authorization: Bearer <token>
Content-Type: application/json

{
  "slotId": "uuid-del-slot",
  "patientId": "uuid-del-paciente",
  "vitalSigns": {
    "temperature": 37.5,
    "weight": 75.5,
    "height": 1.75,
    "systolic": 120,
    "diastolic": 80
  },
  "diagnosis": "Diagnóstico aquí...",
  "prescriptions": "Medicamentos prescritos...",
  "labResults": "Resultados de análisis...",
  "notes": "Observaciones adicionales..."
}
```

#### Obtener Historial de Paciente
```
GET /records/patient/:patientId
Authorization: Bearer <token>
```

#### Obtener Registro por Slot
```
GET /records/slot/:slotId
Authorization: Bearer <token>
```

### 6. **Frontend - Páginas Implementadas**

#### ClinicalRecordPage (`/records/:slotId`)
- Formulario para que el médico registre la relatoría
- Campos para signos vitales (temperatura, peso, altura, presión)
- Campos de texto para diagnóstico, prescripciones, análisis, notas
- Validación en tiempo real
- Indicador visual de cifrado AES-256-CBC
- Opción para editar registros existentes

#### HistoryPage (`/history/:patientId`)
- Historial completo de consultas del paciente
- Visualización expandible de cada consulta
- Muestra signos vitales en formato legible
- Muestra diagnosis, prescripciones y análisis
- Información del médico que registró la consulta
- Acceso controlado: paciente solo ve su historial, médico puede ver cualquiera

#### ReportsPage (`/reports`)
- Listado de pacientes con total de citas
- Calendario de citas (filtrable por fecha)
- Búsqueda de historial clínico por paciente
- Generación de reportes para análisis

### 7. **Seguridad**

#### Encriptación en Reposo
- Todos los datos sensibles se cifran antes de almacenarse
- La clave está en variable de entorno
- Cada cifrado usa un IV único y aleatorio

#### Control de Acceso
- Solo médicos autenticados pueden crear registros
- Los pacientes solo pueden ver su propio historial
- Los médicos pueden ver historial de cualquier paciente

#### Validación
- Validación de rangos para signos vitales
- Validación de UUID para referencias
- Validación de datos en backend antes de encriptación

### 8. **Archivos Modificados/Creados**

#### Base de Datos
- ✅ [database/migrations/001_schema.sql](database/migrations/001_schema.sql) - Esquema inicial con tabla clinical_records
- ✅ [database/migrations/003_add_doctor_to_clinical_records.sql](database/migrations/003_add_doctor_to_clinical_records.sql) - **NUEVO**: Migración para agregar doctor_id

#### Backend
- ✅ [src/backend/src/services/clinicalRecordService.js](src/backend/src/services/clinicalRecordService.js) - **MEJORADO**: Ahora incluye doctor_id
- ✅ [src/backend/src/controllers/clinicalRecordController.js](src/backend/src/controllers/clinicalRecordController.js) - **MEJORADO**: Captura doctor_id del token JWT
- ✅ [src/backend/src/utils/encryption.js](src/backend/src/utils/encryption.js) - Utilidades de encriptación AES-256-CBC
- ✅ [src/backend/src/routes/index.js](src/backend/src/routes/index.js) - Rutas de API para registros clínicos

#### Frontend
- ✅ [src/frontend/src/pages/ClinicalRecordPage.jsx](src/frontend/src/pages/ClinicalRecordPage.jsx) - Formulario para registrar relatoría
- ✅ [src/frontend/src/pages/HistoryPage.jsx](src/frontend/src/pages/HistoryPage.jsx) - **MEJORADO**: Muestra información del médico
- ✅ [src/frontend/src/pages/ReportsPage.jsx](src/frontend/src/pages/ReportsPage.jsx) - Reportes y análisis
- ✅ [src/frontend/src/services/api.js](src/frontend/src/services/api.js) - Cliente API

## Flujo de Uso

### Como Médico:
1. Ver citas reservadas del día
2. Seleccionar una cita para registrar relatoría
3. Ingresar datos vitales del paciente
4. Completar diagnóstico, prescripciones y análisis
5. Guardar el registro (se encripta automáticamente)
6. El sistema notifica al paciente

### Como Paciente:
1. Ver su historial clínico
2. Expandir cada consulta para ver detalles
3. Ver signos vitales, diagnóstico y medicamentos prescritos
4. Toda la información está protegida con encriptación

## Configuración Requerida

### Variables de Entorno Backend
```bash
# Clave de encriptación (64 caracteres hex = 32 bytes)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/medcita
```

### Ejecutar Migraciones
```bash
cd database
# Ejecutar migración 003 para agregar doctor_id
psql -U user -d medcita -f migrations/003_add_doctor_to_clinical_records.sql
```

## Testing

Para verificar que la encriptación funciona:
```bash
npm test  # Ejecuta pruebas unitarias
```

Ver archivos de prueba:
- [tests/unit/encryption.test.js](tests/unit/encryption.test.js) - Pruebas de encriptación
- [tests/integration/jwt-test.js](tests/integration/jwt-test.js) - Pruebas de autenticación

## Notas de Seguridad

1. **IMPORTANTE**: La clave de encriptación debe:
   - Estar en variable de entorno (nunca en código)
   - Ser de 64 caracteres hexadecimales (32 bytes)
   - Ser única y segura

2. **Backups**: Los datos encriptados en la BD son seguros, pero asegúrate de:
   - Hacer backups regularmente
   - Mantener segura la clave de encriptación
   - Nunca exponer la clave en logs o errores

3. **Auditoría**: Se registra:
   - Quién (doctor_id) registró cada consulta
   - Cuándo (recorded_at, updated_at)
   - Todos los cambios quedan en la BD

## Próximas Mejoras Sugeridas

1. **Firma Digital**: Agregar firma digital del médico a registros
2. **Auditoría Avanzada**: Registrar todos los accesos a datos sensibles
3. **Exportación**: Permitir exportar historial a PDF (encriptado)
4. **Notificaciones**: Alertar al paciente cuando se registra nueva consulta
5. **Versionado**: Mantener historial de cambios en registros

---

**Implementación completada**: Mayo 25, 2026
**Estado**: ✅ Funcional y listo para usar
