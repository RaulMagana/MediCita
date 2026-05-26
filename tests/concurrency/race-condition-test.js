/**
 * tests/concurrency/race-condition-test.js
 * 
 * PRUEBA DE CONDICIÓN DE CARRERA EN RESERVA DE CITAS
 * =====================================================
 * Demuestra que el mecanismo de exclusión mutua (async-mutex + SELECT FOR UPDATE)
 * evita efectivamente la double-booking de un mismo slot.
 *
 * Escenario de prueba:
 *   - Se toman N peticiones simultáneas para reservar EL MISMO slot.
 *   - Sin protección: varias peticiones podrían tener éxito → inconsistencia.
 *   - Con protección: exactamente 1 petición tiene éxito; el resto obtiene 409.
 *
 * Ejecución:
 *   node tests/concurrency/race-condition-test.js
 *   (requiere servidor backend corriendo en localhost:3000)
 */

'use strict';

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

const BASE_URL       = process.env.API_URL || 'http://localhost:3000/api/v1';
const CONCURRENT     = Number(process.argv[2]) || 10; // Número de requests simultáneos
const REPORT_PATH    = path.join(__dirname, 'report.json');

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades HTTP simples (sin dependencias externas para portabilidad)
// ─────────────────────────────────────────────────────────────────────────────

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url);
    const protocol = parsed.protocol === 'https:' ? https : http;
    const payload  = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pasos de la prueba
// ─────────────────────────────────────────────────────────────────────────────

async function step_healthCheck() {
  console.log('  → Verificando disponibilidad del servidor...');
  const res = await request('GET', `${BASE_URL.replace('/api/v1', '')}/health`);
  if (res.status !== 200) throw new Error(`Servidor no disponible (${res.status})`);
  console.log('  ✓ Servidor en línea');
}

async function step_login(username, password) {
  const res = await request('POST', `${BASE_URL}/auth/login`, { username, password });
  if (res.status !== 200) throw new Error(`Login fallido para ${username}: ${JSON.stringify(res.body)}`);
  return res.body.accessToken;
}

async function step_getAvailableSlot(token) {
  console.log('  → Buscando slot disponible...');
  const today = new Date().toISOString().slice(0, 10);
  const res   = await request('GET', `${BASE_URL}/appointments/slots?status=available`, null, {
    Authorization: `Bearer ${token}`,
  });
  if (!res.body.data || res.body.data.length === 0) {
    throw new Error('No hay slots disponibles. Ejecuta el seed de la BD primero.');
  }
  const slot = res.body.data[0];
  console.log(`  ✓ Slot encontrado: ${slot.slot_date} ${slot.slot_time} (id: ${slot.id})`);
  return slot;
}

async function step_getPatientId(token) {
  const res = await request('GET', `${BASE_URL}/patients`, null, {
    Authorization: `Bearer ${token}`,
  });
  if (!res.body.data || res.body.data.length === 0) {
    throw new Error('No hay pacientes registrados. Registe al menos uno.');
  }
  return res.body.data[0].id;
}

/**
 * Intenta reservar un slot. Registra latencia y resultado.
 */
async function attemptBook(index, token, slotId, patientId) {
  const start = Date.now();
  try {
    const res = await request(
      'POST',
      `${BASE_URL}/appointments`,
      { slotId, patientId },
      { Authorization: `Bearer ${token}` }
    );
    const latency = Date.now() - start;
    return { index, status: res.status, success: res.status === 201, latency, body: res.body };
  } catch (err) {
    return { index, status: 0, success: false, latency: Date.now() - start, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Runner principal
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   PRUEBA DE CONDICIÓN DE CARRERA — MediCita              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`Configuración:`);
  console.log(`  • Requests simultáneos : ${CONCURRENT}`);
  console.log(`  • URL base             : ${BASE_URL}`);
  console.log('');

  const results = {
    timestamp:   new Date().toISOString(),
    concurrent:  CONCURRENT,
    baseUrl:     BASE_URL,
    steps:       [],
    bookAttempts: [],
    summary:     {},
  };

  try {
    // 1. Health check
    console.log('[ PASO 1 ] Verificación del servidor');
    await step_healthCheck();
    results.steps.push({ step: 'health_check', ok: true });

    // 2. Autenticar como médico
    console.log('\n[ PASO 2 ] Autenticación del médico');
    const doctorToken = await step_login('doctor.admin', 'Admin2026');
    console.log('  ✓ Token de médico obtenido');
    results.steps.push({ step: 'doctor_login', ok: true });

    // 3. Obtener slot disponible y paciente
    console.log('\n[ PASO 3 ] Obtención de datos de prueba');
    const slot      = await step_getAvailableSlot(doctorToken);
    const patientId = await step_getPatientId(doctorToken);
    console.log(`  ✓ Patient id: ${patientId}`);
    results.steps.push({ step: 'get_test_data', ok: true, slotId: slot.id, patientId });

    // 4. Disparar N requests SIMULTÁNEOS para el mismo slot
    console.log(`\n[ PASO 4 ] Disparando ${CONCURRENT} requests simultáneos al mismo slot`);
    console.log('  ⚡ ¡Sin la exclusión mutua esto causaría double-booking!');

    const promises = Array.from({ length: CONCURRENT }, (_, i) =>
      attemptBook(i + 1, doctorToken, slot.id, patientId)
    );

    const attempts = await Promise.all(promises);
    results.bookAttempts = attempts;

    // 5. Análisis de resultados
    const successes = attempts.filter((a) => a.success);
    const conflicts = attempts.filter((a) => a.status === 409);
    const errors    = attempts.filter((a) => !a.success && a.status !== 409);
    const latencies = attempts.map((a) => a.latency);
    const avgLatency = Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length);
    const maxLatency = Math.max(...latencies);

    results.summary = {
      totalAttempts: CONCURRENT,
      successes:     successes.length,
      conflicts:     conflicts.length,
      errors:        errors.length,
      avgLatencyMs:  avgLatency,
      maxLatencyMs:  maxLatency,
      mutexWorking:  successes.length === 1,
    };

    console.log('\n[ PASO 5 ] Resultados\n');
    console.log(`  Total de intentos    : ${CONCURRENT}`);
    console.log(`  ✅ Éxitos (201)      : ${successes.length}`);
    console.log(`  ⚔️  Conflictos (409)  : ${conflicts.length}`);
    console.log(`  ❌ Errores           : ${errors.length}`);
    console.log(`  ⏱  Latencia promedio : ${avgLatency} ms`);
    console.log(`  ⏱  Latencia máxima   : ${maxLatency} ms`);

    console.log('\n[ VEREDICTO ]');
    if (successes.length === 1 && conflicts.length === CONCURRENT - 1) {
      console.log('  🟢 EXCLUSIÓN MUTUA FUNCIONA CORRECTAMENTE');
      console.log('     → Solo 1 request tuvo éxito; los demás recibieron 409 Conflict');
      console.log('     → No hubo double-booking');
    } else if (successes.length > 1) {
      console.log(`  🔴 FALLO: ${successes.length} requests tuvieron éxito sobre el mismo slot`);
      console.log('     → Condición de carrera DETECTADA (doble reserva)');
    } else if (successes.length === 0) {
      console.log('  🟡 ADVERTENCIA: Ningún request tuvo éxito');
      console.log('     → Posible problema de configuración, no de concurrencia');
    }

    // 6. Guardar reporte JSON
    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
    console.log(`\n  📄 Reporte guardado en: ${REPORT_PATH}`);

  } catch (err) {
    console.error('\n  💥 Error durante la prueba:', err.message);
    results.error = err.message;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════════════\n');
}

run();
