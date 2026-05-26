# Guía de Uso: Registro de Relatoría Médica

## 🎯 Acceso a la Funcionalidad

### Para Médicos (Doctor/Admin):

#### Opción 1: Desde el Panel Principal (Dashboard)
1. Inicia sesión como médico
2. En el panel principal, encontrarás el botón **"Gestionar Relatorías"** (en rojo)
3. Haz clic en él para ir al calendario de citas

#### Opción 2: Desde el Calendario de Citas
1. Ve a **"Gestionar citas"** desde el panel principal O directamente a `/appointments`
2. Visualiza las citas reservadas (status = "Reservada", en azul)
3. Para cada cita reservada, encontrarás **dos botones**:
   - 🔴 **Botón "Relatoría"** (en rojo): Para registrar la consulta
   - ⚫ **Botón "Cancelar"** (en rojo oscuro): Para cancelar la cita

---

## 📝 Paso a Paso: Registrar una Relatoría

### 1. Accede a la Cita
```
Dashboard → "Gestionar Relatorías" → Calendario → Haz clic en "Relatoría" en una cita reservada
```

### 2. Interfaz de Registro (ClinicalRecordPage)

Verás un formulario con dos secciones principales:

#### **Sección 1: Signos Vitales** 
Campos OBLIGATORIOS (se registran cifrados):
- 🌡️ **Temperatura** (°C): 30-45°C
- ⚖️ **Peso** (kg): 1-300 kg
- 📏 **Altura** (m): 0.3-2.5 m  
- 💪 **Presión Sistólica** (mmHg): 50-300 mmHg
- 💪 **Presión Diastólica** (mmHg): 30-200 mmHg

⚠️ **Importante**: Todos estos campos son obligatorios y se encriptan con AES-256-CBC

#### **Sección 2: Relatoría Clínica**
Campos OPCIONALES (pero recomendados, se encriptan):

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Diagnóstico** | El diagnóstico principal | "Gripe estacional, sin complicaciones" |
| **Prescripciones** | Medicamentos prescritos | "Ibuprofeno 400mg c/8hs, Paracetamol 500mg c/6hs" |
| **Análisis clínicos** | Resultados de laboratorio | "CBC: Leucocitos 7.5K, Plaquetas 250K (normales)" |
| **Notas adicionales** | Observaciones importantes | "Paciente presenta mejoría, control en 1 semana" |

### 3. Guardar el Registro

- Haz clic en el botón **"Guardar registro"** (verde)
- El sistema encriptará automáticamente todos los datos
- Recibirás una confirmación: "✓ Registro guardado correctamente"
- Serás redirigido automáticamente al calendario

---

## 🔒 Seguridad: Encriptación

Todos los datos ingresados se **cifran automáticamente** con:
- **Algoritmo**: AES-256-CBC
- **IV**: Aleatorio por cada encriptación
- **Almacenamiento**: Encriptado en la base de datos
- **Desencriptación**: Solo cuando se visualiza el historial

### ¿Cómo se ve en la BD?
```sql
-- Los datos se almacenan así (ilegibles sin desencriptar):
SELECT vital_signs_enc FROM clinical_records;

-- Resultado (ejemplo):
a1b2c3d4e5f6g7h8:SGVsbG8gV29ybGQhIFRoaXMgaXMgZW5jcnlwdGVkIGRhdGE=
```

---

## 👁️ Ver Historial de un Paciente

### Desde el Médico:
1. Ve a **"Reportes"** → **"C. Historial clínico"**
2. Selecciona un paciente
3. Verás todas sus consultas con:
   - Signos vitales desencriptados
   - Diagnósticos
   - Prescripciones
   - Análisis clínicos
   - Nombre del médico que registró
   - Fecha y hora exacta

### Desde el Paciente:
1. En el panel principal, haz clic en **"Mi historial clínico"**
2. Verás todas tus consultas con los datos completos
3. Cada consulta es expandible para ver todos los detalles

---

## ⚠️ Casos de Uso

### Caso 1: Paciente llega con síntomas

```
1. Doctor registra en ClinicalRecordPage:
   - Temperatura: 37.5°C (Normal)
   - Peso: 75 kg
   - Altura: 1.75 m
   - Presión: 120/80 mmHg (Normal)
   
2. Diagnóstico: "Congestión nasal, probable resfriado"
3. Prescripción: "Descongestionante nasal 3 días"
4. Nota: "Reposo, beber agua, control en 3 días si persiste"

✅ Todo se guarda encriptado
```

### Caso 2: Consulta de seguimiento

```
1. Paciente regresa para control
2. Se registra nueva relatoría con nuevos vitales
3. Sistema mantiene ambos registros cronológicamente
4. Médico puede comparar evolución
```

---

## 🔧 Datos Encriptados

### Qué se encripta:
✅ Temperatura
✅ Peso  
✅ Altura
✅ Presión arterial
✅ Diagnóstico
✅ Prescripciones
✅ Análisis clínicos
✅ Notas adicionales

### Qué NO se encripta (para auditoría):
❌ Nombre del médico (para saber quién registró)
❌ Fecha y hora (para auditoría)
❌ ID del paciente (para relacionar)

---

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| "Error al guardar registro" | Verifica que todos los campos obligatorios estén completos |
| No veo el botón "Relatoría" | La cita debe estar en estado "Reservada" (azul) |
| No puedo acceder a /records | Solo médicos autenticados pueden crear relatorías |
| Los datos aparecen ilegibles | Eso significa que están encriptados correctamente en BD |

---

## 📊 Ejemplo de Registro Completo

**Paciente**: Juan Pérez  
**Fecha**: 25 de Mayo 2026, 14:30  
**Médico**: Dr. Carlos Admin

### Signos Vitales (ENCRIPTADOS):
```json
{
  "temperature": 38.2,
  "weight": 75.5,
  "height": 1.75,
  "systolic": 130,
  "diastolic": 85
}
```

### Relatoría (ENCRIPTADA):
- **Diagnóstico**: "Infección urinaria aguda, confirmada por análisis"
- **Prescripción**: "Amoxicilina 500mg c/8hs x 7 días, Analgesico c/12hs si dolor"
- **Análisis**: "Urocultivo: E. coli (+), Sensible a beta-lactámicos"
- **Notas**: "Paciente refiere disuria y urgencia miccional. Beber más líquidos. Control en 3 días o si empeora urgentemente"

---

## 🎓 Mejores Prácticas

### ✅ HACER:
- Registrar signos vitales en **cada consulta**
- Ser específico en diagnóstico
- Incluir dosis exactas en prescripciones
- Anotar efectos secundarios observados
- Registrar seguimiento en próximas citas

### ❌ NO HACER:
- Dejar campos obligatorios en blanco
- Abreviar diagnósticos sin aclaración
- Olvidar dosis o duración en prescripciones
- Escribir notas ambiguas
- Modificar registros sin nueva consulta

---

## 📞 Soporte

Para más información o reportar problemas:
- **Email**: support@medicita.com
- **Chat**: En la app (próximamente)
- **Tel**: +34 XXX XXX XXX

---

**Última actualización**: 25 de Mayo 2026  
**Versión**: 1.0
