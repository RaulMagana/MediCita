# 📍 Ubicación del Botón: Registrar Relatoría

## Flujo Visual de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                      PANEL PRINCIPAL (Dashboard)                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Acceso Rápido (Quick Access)                            │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌────────────┐  │   │
│  │  │ Gestionar   │  │  Lista de        │  │ Reportes   │  │   │
│  │  │ Relatorías  │  │  pacientes       │  │            │  │   │
│  │  │  (🔴 ROJO)  │  │  (🟣 PÚRPURA)   │  │ (🟡 ÁMBAR) │  │   │
│  │  └──────┬──────┘  └──────────────────┘  └────────────┘  │   │
│  └─────────┼────────────────────────────────────────────────┘   │
│            │                                                    │
│            └────────> Click aquí                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    CALENDARIO DE CITAS                            │
│                   (AppointmentsPage)                              │
│                                                                  │
│   SEMANA: 25 May — 29 May 2026                                 │
│                                                                  │
│   ┌─────┬─────┬─────┬─────┬─────┐                              │
│   │ LUN │ MAR │ MIE │ JUE │ VIE │                              │
│   │  25 │  26 │  27 │  28 │  29 │                              │
│   │     │     │     │     │     │                              │
│   │┌─────────────────────────────┐│                            │
│   ││ 14:00 ✅ Reservada │                            │
│   ││ Paciente: Juan Pérez        ││                            │
│   ││                             ││                            │
│   ││ ┌──────────────────────────┐││                            │
│   ││ │ 🔴 Relatoría (BOTÓN) │││  ← CLICK AQUÍ               │
│   ││ └──────────────────────────┘││                            │
│   ││ ┌──────────────────────────┐││                            │
│   ││ │ ⚫ Cancelar             │││                             │
│   ││ └──────────────────────────┘││                            │
│   │└─────────────────────────────┘│                            │
│   │     ... más citas ...          │                            │
│   └─────┴─────┴─────┴─────┴─────┘                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│              REGISTRO DE RELATORÍA (ClinicalRecordPage)          │
│                      /records/:slotId                            │
│                                                                  │
│   📋 REGISTRO DE HISTORIA CLÍNICA                               │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 🟢 Signos Vitales                                       │   │
│   │    (Todos ENCRIPTADOS: AES-256-CBC)                     │   │
│   │                                                         │   │
│   │  ┌─────────────┐  ┌─────────────┐                       │   │
│   │  │ Temperatura │  │   Peso      │                       │   │
│   │  │  37.5 °C    │  │  75.5 kg    │                       │   │
│   │  └─────────────┘  └─────────────┘                       │   │
│   │  ┌─────────────┐  ┌─────────────┐                       │   │
│   │  │   Altura    │  │  Presión    │                       │   │
│   │  │   1.75 m    │  │ 120/80 mmHg │                       │   │
│   │  └─────────────┘  └─────────────┘                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 📝 Relatoría de Consulta                                │   │
│   │    (Todos ENCRIPTADOS: AES-256-CBC)                     │   │
│   │                                                         │   │
│   │  Diagnóstico                                            │   │
│   │  [Describe el diagnóstico...]                           │   │
│   │                                                         │   │
│   │  Prescripciones / Medicamentos                          │   │
│   │  [Lista de medicamentos...]                             │   │
│   │                                                         │   │
│   │  Resultados de análisis clínicos                        │   │
│   │  [Resultados de laboratorio...]                         │   │
│   │                                                         │   │
│   │  Notas adicionales                                      │   │
│   │  [Observaciones importantes...]                         │   │
│   │                                                         │   │
│   │  ┌────────────────────┐  ┌──────────────┐              │   │
│   │  │ ✅ Guardar registro│  │   Cancelar   │              │   │
│   │  └────────────────────┘  └──────────────┘              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ✅ Todos los datos se cifran automáticamente                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                 ✅ REGISTRO GUARDADO                              │
│                                                                  │
│   "✓ Registro guardado correctamente"                            │
│                                                                  │
│   Los datos están encriptados en la BD y el paciente             │
│   podrá verlos en su Historial Clínico                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumen de Botones

### En el Calendario (AppointmentsPage):

Para cada cita **RESERVADA** (azul), verás:

```
┌───────────────────────────┐
│  14:00 ✅ Reservada       │
│  Paciente: Juan Pérez     │
│                           │
│ ┌─────────────────────┐   │
│ │ 🔴 Relatoría        │ ← Botón ROJO
│ └─────────────────────┘   │  
│ ┌─────────────────────┐   │
│ │ ⚫ Cancelar          │ ← Botón para cancelar
│ └─────────────────────┘   │
│                           │
└───────────────────────────┘
```

---

## 🎨 Colores de Referencia

| Elemento | Color | Significado |
|----------|-------|-------------|
| Botón "Relatoría" | 🔴 Rojo (#f87171) | Primario - Registrar consulta |
| Botón "Cancelar" | ⚫ Rojo oscuro | Acción destructiva |
| Acceso en Dashboard | 🔴 Rojo | Destacado - Acción principal |
| Cita disponible | 🟢 Verde | Disponible para reservar |
| Cita reservada | 🔵 Azul | Ya tiene paciente asignado |
| Cita cancelada | ⚪ Gris | Cancelada, no disponible |

---

## ⌨️ Atajos

| Acción | URL Directa |
|--------|-----------|
| Ir al calendario | `/appointments` |
| Registrar relatoría (ej.) | `/records/uuid-del-slot` |
| Ver historial paciente | `/history/:patientId` |
| Ver reportes | `/reports` |

---

## 📱 Responsive

La interfaz es **100% responsiva**:
- ✅ Desktop: Botones lado a lado
- ✅ Tablet: Botones apilados (flex-col)
- ✅ Mobile: Botones apilados verticalmente

---

**¿No encuentras el botón?**
1. Verifica que estés logueado como **MÉDICO** (rol: doctor)
2. Asegúrate que la cita esté en estado **"RESERVADA"** (azul)
3. Si aún no lo ves, intenta actualizar la página (F5)

