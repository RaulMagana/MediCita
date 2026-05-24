/**
 * services/authService.js
 * Lógica de autenticación adaptada a MySQL (placeholders ?, transacciones con conn.beginTransaction).
 */

'use strict';

const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const db      = require('../config/database');
const jwtUtil = require('../utils/jwt');
const logger  = require('../utils/logger');

const BCRYPT_ROUNDS = 12;

async function registerPatient(data) {
  const { username, password, fullName, address, email, phone, birthDate, sex } = data;

  const { rows: existU } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
  const { rows: existE } = await db.query('SELECT id FROM patients WHERE email = $1', [email]);
  if (existU.length > 0 || existE.length > 0) {
    const err = new Error('El nombre de usuario o correo ya está registrado');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const conn = await db.connect();

  try {
    await conn.query('BEGIN');

    await conn.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'patient')`,
      [username, passwordHash]
    );
    const { rows: [userRow] } = await conn.query(
      'SELECT id, username, role, created_at FROM users WHERE username = $1',
      [username]
    );

    await conn.query(
      `INSERT INTO patients (user_id, full_name, address, email, phone, birth_date, sex)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userRow.id, fullName, address, email, phone, birthDate, sex]
    );
    const { rows: [patientRow] } = await conn.query(
      'SELECT id, full_name, email FROM patients WHERE user_id = $1',
      [userRow.id]
    );

    await conn.query('COMMIT');
    logger.info('Paciente registrado', { userId: userRow.id });
    return { user: userRow, patient: patientRow };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

async function login({ username, password }) {
  // 1. Cambiado el "?" por "$1" (Sintaxis de parámetros de PostgreSQL)
  const { rows } = await db.query(
    'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1',
    [username]
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const err = new Error('Credenciales incorrectas'); err.statusCode = 401; throw err;
  }
  if (!user.is_active) {
    const err = new Error('Cuenta deshabilitada'); err.statusCode = 403; throw err;
  }

  const accessToken = jwtUtil.generateAccessToken(user);
  const { token: refreshToken, hash: tokenHash } = jwtUtil.generateRefreshToken();

  // 2. Cambiado los "?" por "$1, $2, $3"
  // 3. Cambiado "DATE_ADD(NOW(), INTERVAL 7 DAY)" por la sintaxis nativa de Postgres: NOW() + INTERVAL '7 days'
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, tokenHash]
  );

  logger.info('Login exitoso', { userId: user.id, role: user.role });
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

async function refreshAccessToken(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const { rows } = await db.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.username, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );
  const record = rows[0];
  if (!record || record.revoked || new Date(record.expires_at) < new Date()) {
    const err = new Error('Refresh token inválido o expirado'); err.statusCode = 401; throw err;
  }

  const accessToken = jwtUtil.generateAccessToken({
    id: record.user_id, username: record.username, role: record.role,
  });
  return { accessToken };
}

async function logout(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
}

module.exports = { registerPatient, login, refreshAccessToken, logout };
