#!/usr/bin/env node

/**
 * test-appointments-api.js
 * Script para probar los endpoints de citas médicas
 * 
 * Uso:
 *   node test-appointments-api.js
 * 
 * Asegúrate que:
 *   1. El servidor esté corriendo en http://localhost:3000
 *   2. Tengas acceso a los tokens JWT de paciente y médico
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000/api/v1';

// Reemplaza estos con tokens reales
const PATIENT_TOKEN = 'your_patient_jwt_token_here';
const DOCTOR_TOKEN = 'your_doctor_jwt_token_here';

/**
 * Realiza un request HTTP/HTTPS
 */
function request(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Tests
 */
async function runTests() {
  console.log('🧪 Iniciando pruebas de API de Citas Médicas\n');
  console.log('⚠️  NOTA: Los tokens están hardcodeados. Actualiza PATIENT_TOKEN y DOCTOR_TOKEN\n');

  try {
    // Test 1: Médico crea un slot
    console.log('1️⃣  Médico crea un slot disponible...');
    const slotResponse = await request('POST', '/appointments/slots', DOCTOR_TOKEN, {
      date: '2026-06-15',
      time: '14:30',
    });
    console.log(`   Status: ${slotResponse.status}`);
    console.log(`   Response: ${JSON.stringify(slotResponse.data, null, 2)}\n`);

    if (slotResponse.status !== 201) {
      throw new Error('Fallo al crear slot');
    }

    const slotId = slotResponse.data.data.id;

    // Test 2: Médico ve los slots
    console.log('2️⃣  Médico lista todos los slots...');
    const slotsResponse = await request('GET', '/appointments/slots?status=available&from=2026-06-01&to=2026-06-30', DOCTOR_TOKEN);
    console.log(`   Status: ${slotsResponse.status}`);
    console.log(`   Slots encontrados: ${slotsResponse.data.data.length}\n`);

    // Test 3: Paciente reserva la cita
    console.log('3️⃣  Paciente reserva la cita...');
    const bookResponse = await request('POST', '/appointments', PATIENT_TOKEN, {
      slotId,
    });
    console.log(`   Status: ${bookResponse.status}`);
    console.log(`   Response: ${JSON.stringify(bookResponse.data, null, 2)}\n`);

    if (bookResponse.status !== 201) {
      throw new Error('Fallo al reservar cita');
    }

    // Test 4: Paciente ve sus citas
    console.log('4️⃣  Paciente ve sus propias citas...');
    const myApptsResponse = await request('GET', '/appointments/mine', PATIENT_TOKEN);
    console.log(`   Status: ${myApptsResponse.status}`);
    console.log(`   Citas encontradas: ${myApptsResponse.data.data.length}\n`);

    // Test 5: Médico ve todas las citas
    console.log('5️⃣  Médico ve todas las citas...');
    const allApptsResponse = await request('GET', '/appointments/all?status=booked', DOCTOR_TOKEN);
    console.log(`   Status: ${allApptsResponse.status}`);
    console.log(`   Citas encontradas: ${allApptsResponse.data.data.length}\n`);

    // Test 6: Obtener detalles de una cita
    console.log('6️⃣  Obtener detalles de la cita...');
    const detailResponse = await request('GET', `/appointments/${slotId}`, DOCTOR_TOKEN);
    console.log(`   Status: ${detailResponse.status}`);
    console.log(`   Response: ${JSON.stringify(detailResponse.data, null, 2)}\n`);

    // Test 7: Médico reprograma la cita
    console.log('7️⃣  Médico reprograma la cita...');
    const rescheduleResponse = await request('PUT', `/appointments/${slotId}`, DOCTOR_TOKEN, {
      date: '2026-06-20',
      time: '15:00',
    });
    console.log(`   Status: ${rescheduleResponse.status}`);
    console.log(`   Response: ${JSON.stringify(rescheduleResponse.data, null, 2)}\n`);

    // Test 8: Ver notificaciones del paciente
    console.log('8️⃣  Paciente ve sus notificaciones...');
    const notifResponse = await request('GET', '/notifications/unread', PATIENT_TOKEN);
    console.log(`   Status: ${notifResponse.status}`);
    console.log(`   Notificaciones: ${JSON.stringify(notifResponse.data, null, 2)}\n`);

    // Test 9: Contar notificaciones sin leer
    console.log('9️⃣  Contar notificaciones sin leer...');
    const countResponse = await request('GET', '/notifications/count', PATIENT_TOKEN);
    console.log(`   Status: ${countResponse.status}`);
    console.log(`   Response: ${JSON.stringify(countResponse.data, null, 2)}\n`);

    // Test 10: Cancelar cita
    console.log('🔟 Médico cancela la cita...');
    const cancelResponse = await request('DELETE', `/appointments/${slotId}`, DOCTOR_TOKEN);
    console.log(`   Status: ${cancelResponse.status}`);
    console.log(`   Response: ${JSON.stringify(cancelResponse.data, null, 2)}\n`);

    console.log('✅ Todos los tests completados exitosamente!\n');

  } catch (error) {
    console.error('❌ Error en los tests:', error.message);
    process.exit(1);
  }
}

// Ejecutar tests
runTests();
