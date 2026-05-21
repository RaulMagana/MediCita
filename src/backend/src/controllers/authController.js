/**
 * controllers/authController.js
 * Controlador HTTP para autenticación.
 * Los controllers son "thin" — solo traducen HTTP ↔ servicios.
 */

'use strict';

const { validationResult } = require('express-validator');
const authService           = require('../services/authService');

async function register(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const result = await authService.registerPatient(req.body);
    res.status(201).json({ message: 'Registro exitoso', data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken requerido' });
    }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
