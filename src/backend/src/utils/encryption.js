/**
 * utils/encryption.js
 * Cifrado simétrico AES-256-CBC para datos clínicos sensibles.
 *
 * Cada cifrado genera un IV aleatorio de 16 bytes para garantizar
 * que el mismo texto plano produzca cifrados distintos.
 * El resultado se almacena como: iv_hex:ciphertext_base64
 */

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // bytes

/**
 * Devuelve la clave de cifrado como Buffer de 32 bytes.
 * La clave en .env es un hex de 64 caracteres → 32 bytes.
 */
function getKey() {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length < 64) {
    throw new Error('ENCRYPTION_KEY inválida: debe ser un hex de 64 caracteres (32 bytes)');
  }
  return Buffer.from(hexKey.slice(0, 64), 'hex');
}

/**
 * Cifra un valor de texto plano.
 * @param   {string} plaintext
 * @returns {string} "ivHex:ciphertextBase64"
 */
function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv     = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('base64')}`;
}

/**
 * Descifra un valor previamente cifrado con encrypt().
 * @param   {string} ciphertext "ivHex:ciphertextBase64"
 * @returns {string} texto plano
 */
function decrypt(ciphertext) {
  if (ciphertext == null) return null;
  const [ivHex, dataBase64] = ciphertext.split(':');
  if (!ivHex || !dataBase64) throw new Error('Formato de cifrado inválido');
  const iv         = Buffer.from(ivHex, 'hex');
  const encrypted  = Buffer.from(dataBase64, 'base64');
  const decipher   = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted  = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Cifra un objeto JSON completo.
 * Útil para los signos vitales (temperatura, peso, talla, presión).
 */
function encryptObject(obj) {
  return encrypt(JSON.stringify(obj));
}

/**
 * Descifra y parsea un objeto JSON previamente cifrado con encryptObject().
 */
function decryptObject(ciphertext) {
  const json = decrypt(ciphertext);
  return json ? JSON.parse(json) : null;
}

module.exports = { encrypt, decrypt, encryptObject, decryptObject };
