/**
 * config/database.js
 * Pool de conexiones a MySQL usando mysql2/promise.
 *
 * Diferencias clave respecto a PostgreSQL (pg):
 *  - Placeholders: ? en lugar de $1, $2, ...
 *  - Los resultados vienen en result[0] (array de filas)
 *  - Las transacciones usan connection.beginTransaction()
 *  - UUIDs: MySQL 8+ genera con UUID(), se maneja en el schema
 */

'use strict';

const mysql  = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME     || 'medicita',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    Number(process.env.DB_POOL_MAX) || 10,
  queueLimit:         0,
  timezone:           '+00:00',   // Almacenar datetimes en UTC
  charset:            'utf8mb4',
});

pool.on('connection', () => {
  logger.debug('Nueva conexión MySQL establecida');
});

/**
 * Ejecuta una query parametrizada.
 * @param {string} sql    - Sentencia SQL con placeholders (?)
 * @param {Array}  params - Valores para los placeholders
 * @returns {{ rows: Array }} - rows contiene las filas resultado
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return { rows: Array.isArray(rows) ? rows : [rows] };
}

/**
 * Devuelve una conexión del pool para transacciones manuales.
 * El llamador debe hacer connection.release() en el bloque finally.
 *
 * Uso:
 *   const conn = await getClient();
 *   try {
 *     await conn.beginTransaction();
 *     ...
 *     await conn.commit();
 *   } catch {
 *     await conn.rollback();
 *   } finally {
 *     conn.release();
 *   }
 */
async function getClient() {
  return pool.getConnection();
}

module.exports = { query, getClient, pool };
