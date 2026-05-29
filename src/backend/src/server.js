/**
 * server.js
 * Punto de entrada del servidor Express.
 * Configura middleware globales, monta rutas y arranaca el servidor.
 */

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const routes       = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger       = require('./utils/logger');
const emailService = require('./utils/emailService');
const pool = require('./config/database'); // PostgreSQL pool  // pg: verifica conectividad nativa

const app  = express();
const PORT = process.env.PORT || 3000;

// =============================================================
// Inicializar servicio de correos
// =============================================================
emailService.initializeMailer();

// =============================================================
// Seguridad HTTP — Helmet agrega cabeceras de seguridad estándar
// =============================================================
app.use(helmet());

// =============================================================
// CORS — solo origenes configurados en .env
// =============================================================
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// =============================================================
// Rate limiting global (protección básica ante DDoS)
// =============================================================
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
}));

// =============================================================
// Parseo y logging
// =============================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// =============================================================
// Rutas de la API
// =============================================================
app.use('/api/v1', routes);

// Health check sin autenticación
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================================
// Manejador global de errores (debe ir al final)
// =============================================================
app.use(errorHandler);

// =============================================================
// Arranque del servidor
// =============================================================
async function start() {
  try {
    // Verificar conectividad con la base de datos
    await pool.query('SELECT 1');  // pg: verifica conectividad nativa  // mysql2: misma sintaxis
    logger.info('Conexión a PostgreSQL establecida');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Servidor MediCita corriendo en http://0.0.0.0:${PORT}`);
      logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
  console.error("====== ¡CRASH DE ARRANQUE DETECTADO! ======");
  console.error(err); // Esto imprimirá el error completo con su stack trace
  console.error("==========================================");
  process.exit(1);
}
}

start();

module.exports = app; // para tests
