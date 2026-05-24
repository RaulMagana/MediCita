const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

bcrypt.hash('Admin2026!', 12).then(async hash => {
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'doctor.admin']);
  console.log('Listo! Hash actualizado.');
  await pool.end();
}).catch(console.error);