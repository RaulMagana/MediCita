/**
 * middleware/auth.js
 * Middleware de autenticación y autorización basado en JWT.
 *
 * authenticate: verifica el token en el header Authorization.
 * authorize:    verifica que el rol del usuario sea el esperado.
 */

'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const logger                = require('../utils/logger');

/**
 * Extrae y verifica el JWT del header Authorization: Bearer <token>.
 * Si es válido, adjunta el payload al objeto req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    logger.warn('Token JWT inválido', { error: err.message, ip: req.ip });
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Fábrica de middleware de autorización por rol.
 * @param {...string} roles - Roles permitidos ('doctor', 'patient')
 * @returns {Function} middleware
 *
 * @example
 * router.get('/patients', authenticate, authorize('doctor'), handler);
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn('Acceso denegado por rol insuficiente', {
        user: req.user.sub,
        role: req.user.role,
        required: roles,
        path: req.path,
      });
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
