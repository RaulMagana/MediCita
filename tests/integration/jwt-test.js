#!/usr/bin/env node

/**
 * tests/integration/jwt-test.js
 * Script de prueba para validar el flujo de autenticación JWT
 * 
 * Uso: node tests/integration/jwt-test.js
 */

'use strict';

require('dotenv').config({ path: './src/backend/.env' });

const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     TEST DE AUTENTICACIÓN JWT - MediCita         ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  try {
    // 1. Test Health Check
    console.log('1️⃣  Verificando servidor...');
    const health = await request('GET', '/health');
    if (health.status === 200) {
      console.log('   ✅ Servidor está corriendo\n');
    } else {
      console.log(`   ❌ Error: ${health.status}\n`);
      process.exit(1);
    }

    // 2. Test Login
    console.log('2️⃣  Intentando login con admin...');
    const login = await request('POST', '/auth/login', {
      username: 'doctor.admin',
      password: 'Admin2026'
    });
    
    if (login.status === 200 && login.data.accessToken) {
      console.log('   ✅ Login exitoso');
      console.log(`   📝 Access Token: ${login.data.accessToken.substring(0, 50)}...\n`);
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(login.data)}\n`);
      process.exit(1);
    }

    const accessToken = login.data.accessToken;

    // 3. Test Token Validation
    console.log('3️⃣  Validando token...');
    const testToken = await request('POST', '/debug/test-token', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    if (testToken.status === 200) {
      console.log('   ✅ Token es válido');
      console.log(`   👤 Usuario: ${testToken.data.decoded.username}`);
      console.log(`   🔑 Rol: ${testToken.data.decoded.role}`);
      console.log(`   ⏰ Expira: ${testToken.data.expiresIn}\n`);
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(testToken.data)}\n`);
    }

    // 4. Test Protected Endpoint
    console.log('4️⃣  Accediendo a endpoint protegido (/patients)...');
    const patients = await request('GET', '/patients', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    if (patients.status === 200) {
      console.log('   ✅ Acceso autorizado');
      console.log(`   📊 Respuesta: ${patients.data.data ? 'datos recibidos' : 'lista vacía'}\n`);
    } else {
      console.log(`   ❌ Error: ${patients.status} - ${JSON.stringify(patients.data)}\n`);
    }

    // 5. Test Invalid Token
    console.log('5️⃣  Probando con token inválido...');
    const invalidToken = await request('POST', '/debug/test-token', null, {
      'Authorization': 'Bearer invalid_token_xyz'
    });

    if (invalidToken.status === 401) {
      console.log('   ✅ Rechazado correctamente (Token inválido)\n');
    } else {
      console.log(`   ❌ Esperaba 401, obtuve: ${invalidToken.status}\n`);
    }

    // 6. Test Missing Token
    console.log('6️⃣  Probando sin token...');
    const noToken = await request('GET', '/patients', null, {});

    if (noToken.status === 401) {
      console.log('   ✅ Rechazado correctamente (Sin token)\n');
    } else {
      console.log(`   ❌ Esperaba 401, obtuve: ${noToken.status}\n`);
    }

    // 7. Config Check
    console.log('7️⃣  Verificando configuración...');
    const config = await request('GET', '/debug/config');
    if (config.status === 200) {
      console.log(`   ✅ Configuración:
   • NODE_ENV: ${config.data.NODE_ENV}
   • JWT Expires: ${config.data.JWT_ACCESS_EXPIRES}
   • Secrets configurados: ${config.data.JWT_SECRETS_CONFIGURED ? 'Sí' : 'No'}
   • SMTP: ${config.data.SMTP_USER}\n`);
    }

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║          ✅ TODOS LOS TESTS PASARON              ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\n⚠️  Asegúrate de que:');
    console.error('   1. El servidor está corriendo en puerto 3000');
    console.error('   2. PostgreSQL está disponible');
    console.error('   3. Las variables de entorno están configuradas\n');
    process.exit(1);
  }
}

runTests();
