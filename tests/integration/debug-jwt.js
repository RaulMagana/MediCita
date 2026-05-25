#!/usr/bin/env node

/**
 * tests/integration/debug-jwt.js
 * Herramienta interactiva para debuggear problemas de JWT
 */

'use strict';

require('dotenv').config({ path: './src/backend/.env' });
const jwt = require('jsonwebtoken');
const readline = require('readline');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║      JWT DEBUGGER - MediCita Backend           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const menu = `
🔧 Opciones:
  1) Decodificar token (sin verificar)
  2) Verificar token
  3) Generar token de prueba
  4) Ver secretos configurados
  5) Salir

Selecciona una opción: `;

  let running = true;

  while (running) {
    const choice = await prompt(menu);

    switch (choice.trim()) {
      case '1': {
        const token = await prompt('\nPega el token JWT: ');
        try {
          const decoded = jwt.decode(token);
          console.log('\n✅ Token decodificado:');
          console.log(JSON.stringify(decoded, null, 2));
          console.log(`\n📋 Información:
  • Subject: ${decoded.sub}
  • Username: ${decoded.username}
  • Rol: ${decoded.role}
  • Emitido: ${new Date(decoded.iat * 1000).toLocaleString()}
  • Expira: ${new Date(decoded.exp * 1000).toLocaleString()}
  • Expirado: ${Date.now() > decoded.exp * 1000 ? '🔴 SÍ' : '✅ NO'}`);
        } catch (err) {
          console.log(`\n❌ Error: ${err.message}`);
        }
        break;
      }

      case '2': {
        const token = await prompt('\nPega el token JWT: ');
        const secretChoice = await prompt('¿Verificar con? (1=ACCESS, 2=REFRESH): ');
        const secret = secretChoice === '2' ? REFRESH_SECRET : ACCESS_SECRET;

        try {
          const verified = jwt.verify(token, secret, { algorithms: ['HS256'] });
          console.log('\n✅ Token válido');
          console.log(JSON.stringify(verified, null, 2));
        } catch (err) {
          console.log(`\n❌ Token inválido: ${err.message}`);
          if (err.name === 'TokenExpiredError') {
            console.log(`   Expiró el: ${new Date(err.expiredAt).toLocaleString()}`);
          }
        }
        break;
      }

      case '3': {
        const user = {
          id: 'test-uuid-1234',
          username: 'test.user',
          role: 'patient'
        };
        const token = jwt.sign(
          { sub: user.id, username: user.username, role: user.role },
          ACCESS_SECRET,
          { expiresIn: '15m', algorithm: 'HS256' }
        );
        console.log('\n✅ Token generado:');
        console.log(`\n${token}`);
        console.log(`\n📋 Para usar en requests:
Authorization: Bearer ${token}`);
        break;
      }

      case '4': {
        console.log('\n🔑 Configuración de secretos:');
        console.log(`  • JWT_ACCESS_SECRET: ${ACCESS_SECRET ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`  • JWT_REFRESH_SECRET: ${REFRESH_SECRET ? '✅ Configurado' : '❌ No configurado'}`);
        console.log(`  • Longitud ACCESS: ${ACCESS_SECRET ? ACCESS_SECRET.length : 0} caracteres`);
        console.log(`  • Longitud REFRESH: ${REFRESH_SECRET ? REFRESH_SECRET.length : 0} caracteres`);

        if (!ACCESS_SECRET || !REFRESH_SECRET) {
          console.log('\n⚠️  PROBLEMA: Los secretos JWT no están configurados en .env');
          console.log('   Verifica que existan JWT_ACCESS_SECRET y JWT_REFRESH_SECRET');
        }
        break;
      }

      case '5': {
        running = false;
        console.log('\n👋 Hasta luego!\n');
        break;
      }

      default:
        console.log('\n❌ Opción no válida');
    }

    console.log('');
  }

  rl.close();
}

main().catch(console.error);
