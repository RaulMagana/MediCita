/**
 * utils/jwt.js
 * Helpers para generación y verificación de tokens JWT.
 *
 * Access token: corta duración (15 min), transportado en el header Authorization.
 * Refresh token: larga duración (7 días), almacenado en BD para poder revocarlo.
 */

'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Genera un access token con el payload mínimo necesario.
 * @param {{ id: string, username: string, role: string }} user
 */
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP, algorithm: 'HS256' }
  );
}

/**
 * Genera un refresh token aleatorio (opaco).
 * El hash SHA-256 del token se guarda en BD; el token en crudo va al cliente.
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(64).toString('hex');
  const hash  = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Genera el JWT de refresh (usado solo si se opta por JWT en lugar de opaco).
 */
function generateRefreshJwt(user) {
  return jwt.sign(
    { sub: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXP, algorithm: 'HS256' }
  );
}

/**
 * Verifica y decodifica un access token.
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
}

/**
 * Verifica y decodifica un refresh JWT.
 */
function verifyRefreshJwt(token) {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] });
}

/**
 * Calcula el hash SHA-256 de un refresh token opaco.
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
};
