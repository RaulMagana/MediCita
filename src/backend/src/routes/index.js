/**
 * routes/index.js
 * Compatible con schema 001_schema.sql (ENUMs, uuid-ossp)
 *
 * Cambios clave vs versión anterior:
 *  1. GET /appointments — sin authorize() → paciente Y médico pueden ver slots
 *  2. POST /appointments/slots — solo médico crea slots
 *  3. PUT  /appointments/:id  — solo médico reprograma
 *  4. GET /appointments/mine  — solo paciente (sus citas)
 */

'use strict';

const express      = require('express');
const { body, query } = require('express-validator');
const rateLimit    = require('express-rate-limit');

const { authenticate, authorize } = require('../middleware/auth');
const authCtrl    = require('../controllers/authController');
const patientCtrl = require('../controllers/patientController');
const apptCtrl    = require('../controllers/appointmentController');
const recordCtrl  = require('../controllers/clinicalRecordController');
const notifCtrl   = require('../controllers/notificationController');

const router = express.Router();

// Middleware: Deshabilitar caché para endpoints dinámicos
const noCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de acceso. Espere 15 minutos.' },
});

// =============================================================
// AUTH
// =============================================================
router.post(
  '/auth/register',
  [
    body('username').isLength({ min: 3, max: 60 }).trim(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)/),
    body('fullName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('birthDate').isISO8601(),
    body('sex').isIn(['M', 'F', 'O']),
  ],
  authCtrl.register
);

router.post('/auth/login', loginLimiter, [
  body('username').notEmpty().trim(),
  body('password').notEmpty(),
], authCtrl.login);

router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authenticate, authCtrl.logout);

// =============================================================
// PATIENTS
// =============================================================
router.get('/patients',     authenticate, authorize('doctor'),  patientCtrl.list);
router.get('/patients/me',  authenticate, authorize('patient'), patientCtrl.getMe);
router.get('/patients/:id', authenticate,                       patientCtrl.getById);
router.put('/patients/:id', authenticate,                       patientCtrl.update);
router.delete('/patients/:id', authenticate, authorize('doctor'), patientCtrl.deactivate);

// =============================================================
// APPOINTMENTS
// =============================================================

// ── Ver slots disponibles ────────────────────────────────────
// Sin authorize() → accesible para paciente Y médico autenticados.
// El frontend filtra: paciente pasa status=available, médico pasa rango de fechas.
router.get(
  '/appointments/slots',
  noCache,
  authenticate,
  [
    query('date').optional().isISO8601(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('status').optional().isIn(['available', 'booked', 'cancelled']),
  ],
  apptCtrl.getSlots
);

// ── Mis citas (solo paciente) ────────────────────────────────
// IMPORTANTE: esta ruta debe ir ANTES de /appointments/:id
router.get('/appointments/mine', noCache, authenticate, authorize('patient'), apptCtrl.myAppointments);

// ── Crear slot disponible (solo médico) ──────────────────────
router.post(
  '/appointments/slots',
  authenticate,
  authorize('doctor'),
  [
    body('date').isISO8601().withMessage('Fecha inválida (ISO 8601 requerido)'),
    body('time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora inválida (formato HH:MM)'),
  ],
  apptCtrl.createSlot
);

// ── Reservar cita (médico o paciente) ────────────────────────
router.post(
  '/appointments',
  authenticate,
  [
    body('slotId').isUUID().withMessage('slotId debe ser un UUID válido'),
    body('patientId').optional().isUUID().withMessage('patientId debe ser un UUID válido'),
  ],
  apptCtrl.book
);

// ── Reprogramar slot (solo médico) ───────────────────────────
router.put(
  '/appointments/:id',
  authenticate,
  authorize('doctor'),
  [
    body('date').optional().isISO8601(),
    body('time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
  ],
  apptCtrl.reschedule
);

// ── Cancelar cita (médico o paciente) ────────────────────────
router.delete('/appointments/:id', authenticate, apptCtrl.cancel);

// =============================================================
// CLINICAL RECORDS
// =============================================================
router.post(
  '/records',
  authenticate,
  authorize('doctor'),
  [
    body('slotId').isUUID(),
    body('patientId').isUUID(),
    body('vitalSigns.temperature').isFloat({ min: 30, max: 45 }),
    body('vitalSigns.weight').isFloat({ min: 1 }),
    body('vitalSigns.height').isFloat({ min: 0.3 }),
    body('vitalSigns.systolic').isInt({ min: 50, max: 300 }),
    body('vitalSigns.diastolic').isInt({ min: 30, max: 200 }),
  ],
  recordCtrl.create
);

router.get('/records/patient/:patientId', authenticate, recordCtrl.getHistory);
router.get('/records/slot/:slotId',       authenticate, authorize('doctor'), recordCtrl.getBySlot);

// =============================================================
// NOTIFICATIONS
// =============================================================
router.get('/notifications',        noCache, authenticate, notifCtrl.getMyNotifications);
router.patch('/notifications/read', noCache, authenticate, notifCtrl.markRead);

// =============================================================
// REPORTS (solo médico)
// =============================================================
router.get('/reports/patients', authenticate, authorize('doctor'), async (req, res, next) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT p.id, p.full_name, p.email, p.phone, p.birth_date, p.sex,
              u.username, u.created_at,
              COUNT(s.id) FILTER (WHERE s.status = 'booked') AS total_appointments
       FROM patients p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN appointment_slots s ON s.patient_id = p.id
       WHERE u.is_active = true
       GROUP BY p.id, p.full_name, p.email, p.phone, p.birth_date,
                p.sex, u.username, u.created_at
       ORDER BY p.full_name`
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.get('/reports/calendar', authenticate, authorize('doctor'), async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { from, to } = req.query;
    let sql = `
      SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
             p.full_name AS patient_name, p.email AS patient_email
      FROM appointment_slots s
      LEFT JOIN patients p ON p.id = s.patient_id
      WHERE 1=1`;
    const params = [];
    let i = 1;
    if (from) { sql += ` AND s.slot_date >= $${i++}`; params.push(from); }
    if (to)   { sql += ` AND s.slot_date <= $${i++}`; params.push(to); }
    sql += ' ORDER BY s.slot_date, s.slot_time';
    const result = await db.query(sql, params);
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;