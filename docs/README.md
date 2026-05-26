# 📚 Documentación de MediCita

Índice completo de documentación técnica del sistema de gestión médica MediCita.

---

## 📋 Documentos de Arquitectura y Diseño

| Documento | Descripción | Tamaño |
|-----------|------------|--------|
| [architecture.md](architecture.md) | Arquitectura general del sistema (backend, frontend, BD) | - |
| [design-document.md](design-document.md) | Documento de diseño detallado | - |
| [implementation-summary.md](implementation-summary.md) | Resumen de implementación | - |

---

## 🔒 Seguridad y Concurrencia

| Documento | Descripción | Tamaño | Importancia |
|-----------|------------|--------|------------|
| **[CONCURRENCY-TEST-REPORT.md](CONCURRENCY-TEST-REPORT.md)** | 📊 **Reporte profesional completo de pruebas de concurrencia** — Valida que el sistema MediCita previene doble-booking con mecanismo de exclusión mutua. Incluye análisis detallado, métricas de rendimiento y recomendaciones. | 17 KB | 🔴 CRÍTICA |
| **[CONCURRENCY-TEST-QUICK-SUMMARY.txt](CONCURRENCY-TEST-QUICK-SUMMARY.txt)** | ⚡ **Resumen ejecutivo rápido** — Visualización concisa de resultados, hallazgos clave y recomendaciones de las pruebas de concurrencia. | 12 KB | 🟢 ALTA |
| **[CONCURRENCY-TEST-SUMMARY.json](CONCURRENCY-TEST-SUMMARY.json)** | 📈 **Datos estructurados JSON** — Resultados de pruebas en formato máquina-legible para análisis y dashboards. | 7 KB | 🔵 MEDIA |
| [JWT-TROUBLESHOOTING.md](JWT-TROUBLESHOOTING.md) | Guía de troubleshooting para autenticación JWT | - | MEDIA |
| [SYNC-FIX.md](SYNC-FIX.md) | Documento de sincronización y fixes | - | MEDIA |

---

## 👥 Guías de Usuario y Funcionalidad

| Documento | Descripción |
|-----------|------------|
| [user-manual.md](user-manual.md) | Manual de usuario para pacientes y médicos |
| [setup-guide.md](setup-guide.md) | Guía de instalación y configuración |
| [api-examples.md](api-examples.md) | Ejemplos de uso de API |

---

## 🏥 Funcionalidad Específica

| Documento | Descripción |
|-----------|------------|
| [appointments-management.md](appointments-management.md) | Gestión de citas médicas |
| [clinical-records-implementation.md](clinical-records-implementation.md) | Implementación de registros clínicos |
| [IMPLEMENTACION-RELATORIAS-COMPLETA.md](IMPLEMENTACION-RELATORIAS-COMPLETA.md) | Implementación de reportes médicos (relatórías) |
| [guia-relatorias-medicas.md](guia-relatorias-medicas.md) | Guía de reportes médicos |
| [ubicacion-boton-relatorias.md](ubicacion-boton-relatorias.md) | Ubicación del botón de reportes en UI |

---

## 🎯 Documentos Recomendados por Rol

### 👨‍💼 Administrador del Sistema
1. **[CONCURRENCY-TEST-REPORT.md](CONCURRENCY-TEST-REPORT.md)** ← Validar estabilidad del sistema
2. [architecture.md](architecture.md) ← Entender infraestructura
3. [setup-guide.md](setup-guide.md) ← Configurar ambiente

### 👨‍💻 Desarrollador Backend
1. **[CONCURRENCY-TEST-REPORT.md](CONCURRENCY-TEST-REPORT.md)** ← Entender protección contra race-conditions
2. [appointments-management.md](appointments-management.md) ← Lógica de citas
3. [clinical-records-implementation.md](clinical-records-implementation.md) ← Registros clínicos

### 🏥 Médico / Usuario Final
1. [user-manual.md](user-manual.md) ← Cómo usar el sistema
2. [appointments-management.md](appointments-management.md) ← Gestión de citas
3. [guia-relatorias-medicas.md](guia-relatorias-medicas.md) ← Generar reportes

---

## 📊 Pruebas de Concurrencia — Detalles

### ¿Qué se prueba?

Las pruebas de concurrencia validan que **múltiples usuarios NO pueden reservar el mismo slot simultáneamente**. Esto es crítico para mantener la integridad de datos.

### Resultados en 1 Línea

✅ **De 150 requests concurrentes: 100% de exclusión mutua funcionando, 0 double-booking detectado**

### Cómo reproducir

```bash
# Terminal 1: Iniciar backend
cd src/backend
npm run dev

# Terminal 2: Ejecutar prueba
cd tests/concurrency
node race-condition-test.js 50    # 50 requests simultáneos
node race-condition-test.js 100   # 100 requests simultáneos
```

### Interpretar Resultados

Buscar en output:
- ✅ **EXCLUSIÓN MUTUA FUNCIONA CORRECTAMENTE** = Éxito
- 🔴 **FALLO** = Hay problema (nunca ocurrió en MediCita)

---

## 📈 Métricas Clave del Sistema

| Métrica | Valor | Status |
|---------|-------|--------|
| **Double-booking Risk** | 0% | ✅ |
| **Exclusión Mutua** | Funciona | ✅ |
| **Latencia Promedio** | 40-81 ms | ✅ |
| **Consistencia de Datos** | ACID Garantizada | ✅ |
| **Rate Limiting** | 100 req/15min | ✅ |

---

## 🔗 Enlaces Rápidos

### Código Relacionado
- **Mutex**: `src/utils/slotMutex.js`
- **Reservas**: `src/services/appointmentService.js`
- **Controlador**: `src/controllers/appointmentController.js`

### Pruebas
- **Script**: `tests/concurrency/race-condition-test.js`
- **Reportes**: `tests/concurrency/report.json`

### Base de Datos
- **Esquema**: `database/migrations/001_schema.sql`
- **Seeds**: `database/seeds/001_admin.sql`

---

## 📝 Notas Importantes

### ⚠️ Crítico para Implementadores

1. **Exclusión Mutua**: El sistema usa **async-mutex + PostgreSQL SELECT FOR UPDATE**
   - Evita race-conditions
   - Garantiza 1 solo éxito por slot
   - Los demás reciben HTTP 409 (Conflict)

2. **Consistencia**: Todos los cambios son transaccionales (ACID)
   - BEGIN/COMMIT/ROLLBACK obligatorios
   - SELECT FOR UPDATE evita inconsistencias

3. **Escalabilidad**: Hasta 100 requests concurrentes sin problema
   - Para más, considerar load balancing

### 🔄 Próximas Mejoras

- [ ] Redis distributed locking para multi-instancia
- [ ] WebSocket para notificaciones real-time
- [ ] Event Sourcing para auditoría completa
- [ ] Métricas con Prometheus

---

## 📧 Contacto y Soporte

Para preguntas sobre estas pruebas o documentación:
- 📄 Revisar los documentos de concurrencia (prioritario)
- 🔍 Revisar JWT-TROUBLESHOOTING.md para auth
- 💬 Contactar al equipo de desarrollo

---

**Última actualización**: 2026-05-26  
**Versión de documentación**: 1.0  
**Estado**: Completo ✅
