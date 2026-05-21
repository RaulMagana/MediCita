/**
 * middleware/errorHandler.js
 * Manejador global de errores de Express.
 * Intercepta cualquier error no manejado y retorna una respuesta JSON uniforme.
 */

'use strict';

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Errores de validación de express-validator se manejan en los controllers;
  // aquí solo llegan errores inesperados.
  logger.error('Error no manejado', {
    message: err.message,
    stack:   process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path:    req.path,
    method:  req.method,
  });

  const statusCode = err.statusCode || 500;
  const message    = statusCode < 500
    ? err.message
    : 'Error interno del servidor';

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
