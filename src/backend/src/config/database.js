const { Pool } = require('pg');
const winston = require('winston'); // O el logger que estés usando

// Configuración del Pool de conexiones para PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'medicita',
  // 👇 ESTO SOLUCIONA EL ERROR 59
  // Desactiva SSL en local (false) y lo activa con configuración flexible en producción
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// En Postgres, verificamos la conexión con el evento 'connect' o un query inicial
pool.on('connect', () => {
  // Aquí puedes dejar un log interno si lo deseas
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err);
});

module.exports = pool;