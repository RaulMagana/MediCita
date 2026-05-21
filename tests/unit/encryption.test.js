/**
 * tests/unit/encryption.test.js
 * Pruebas unitarias del módulo de cifrado AES-256-CBC.
 */

'use strict';

// Configurar clave de prueba antes de cargar el módulo
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes en hex

const { encrypt, decrypt, encryptObject, decryptObject } = require('../../src/backend/src/utils/encryption');

describe('Módulo de cifrado (AES-256-CBC)', () => {

  test('encrypt() produce un string con formato iv:ciphertext', () => {
    const result = encrypt('dato sensible');
    expect(result).toMatch(/^[0-9a-f]{32}:.+$/);
  });

  test('decrypt() recupera el texto original', () => {
    const original    = 'temperatura 36.5 °C';
    const ciphertext  = encrypt(original);
    const decrypted   = decrypt(ciphertext);
    expect(decrypted).toBe(original);
  });

  test('encrypt() produce cifrados distintos para el mismo texto (IV aleatorio)', () => {
    const text = 'mismo texto plano';
    const c1   = encrypt(text);
    const c2   = encrypt(text);
    expect(c1).not.toBe(c2);
    // Pero ambos descifran igual
    expect(decrypt(c1)).toBe(text);
    expect(decrypt(c2)).toBe(text);
  });

  test('encrypt(null) retorna null', () => {
    expect(encrypt(null)).toBeNull();
    expect(decrypt(null)).toBeNull();
  });

  test('encryptObject/decryptObject trabaja con objetos JSON', () => {
    const obj = { temperature: 37.2, weight: 70, height: 1.75, systolic: 120, diastolic: 80 };
    const enc = encryptObject(obj);
    const dec = decryptObject(enc);
    expect(dec).toEqual(obj);
  });

  test('decrypt() lanza error con formato inválido', () => {
    expect(() => decrypt('formato-invalido-sin-dos-puntos')).toThrow();
  });
});
