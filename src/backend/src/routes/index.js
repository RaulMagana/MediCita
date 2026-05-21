/**
 * routes/index.js
 * Definición central de todas las rutas de la API REST.
 *
 * Convenciones:
 *  - Recursos en plural (/patients, /appointments, /records)
 *  - Verbos HTTP semánticos (GET lista, POST crea, PUT actualiza, DELETE elimina)
 *  - Rutas protegidas con authenticate + authorize
 */

'use strict';

const express      = require('express');
const { body, query, param } = require('express-validator');
const rateLimit    = require('express-rate-limit');

const { authenticate, authorize } = require('../middleware/auth');
const authCtrl    = require('../controllers/authController');
const patientCtrl = require('../controllers/patientController');
const apptCtrl    = require('../controllers/appointmentController');
const recordCtrl  = require('../controllers/clinicalRecordController');
const notifCtrl   = require('../controllers/notificationController');

const router = express.Router();

// Rate limiter específico para login (anti-fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
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
// El médico puede ver todos los pacientes
router.get('/patients', authenticate, authorize('doctor'), patientCtrl.list);
// Perfil propio del paciente autenticado
router.get('/patients/me', authenticate, authorize('patient'), patientCtrl.getMe);
// Detalle de paciente (médico o el propio paciente con su id)
router.get('/patients/:id', authenticate, patientCtrl.getById);
// Actualizar datos de paciente
router.put('/patients/:id', authenticate, patientCtrl.update);
// Soft delete (solo médico)
router.delete('/patients/:id', authenticate, authorize('doctor'), patientCtrl.deactivate);

// =============================================================
// APPOINTMENTS
// =============================================================
// Slots disponibles (autenticados)
router.get('/appointments/slots', authenticate, [
  query('date').optional().isISO8601(),
  query('status').optional().isIn(['available', 'booked', 'cancelled']),
], apptCtrl.getSlots);

// Mis citas (paciente)
router.get('/appointments/mine', authenticate, authorize('patient'), apptCtrl.myAppointments);

// Reservar cita
router.post('/appointments', authenticate, [
  body('slotId').isUUID(),
  body('patientId').optional().isUUID(), // solo para el médico
], apptCtrl.book);

// Cancelar cita
router.delete('/appointments/:id', authenticate, apptCtrl.cancel);

// =============================================================
// CLINICAL RECORDS
// =============================================================
// Crear / actualizar registro clínico (solo médico)
router.post('/records', authenticate, authorize('doctor'), [
  body('slotId').isUUID(),
  body('patientId').isUUID(),
  body('vitalSigns.temperature').isFloat({ min: 30, max: 45 }),
  body('vitalSigns.weight').isFloat({ min: 1 }),
  body('vitalSigns.height').isFloat({ min: 0.3 }),
  body('vitalSigns.systolic').isInt({ min: 50, max: 300 }),
  body('vitalSigns.diastolic').isInt({ min: 30, max: 200 }),
], recordCtrl.create);

// Historial clínico de un paciente (médico o el propio paciente)
router.get('/records/patient/:patientId', authenticate, recordCtrl.getHistory);

// Registro de un slot específico (médico)
router.get('/records/slot/:slotId', authenticate, authorize('doctor'), recordCtrl.getBySlot);

// =============================================================
// NOTIFICATIONS
// =============================================================
router.get('/notifications', authenticate, notifCtrl.getMyNotifications);
router.patch('/notifications/read', authenticate, notifCtrl.markRead);

// =============================================================
// REPORTS (solo médico — autenticación requerida)
// =============================================================
// Lista de pacientes
router.get('/reports/patients', authenticate, authorize('doctor'), async (req, res, next) => {
  try {
    const db = require('../config/database');
    // MySQL no tiene FILTER (WHERE ...) — equivalente con SUM(CASE WHEN ...)
    const result = await db.query(
      `SELECT p.id, p.full_name, p.email, p.phone, p.birth_date, p.sex,
              u.username, u.created_at,
              SUM(CASE WHEN s.status = 'booked' THEN 1 ELSE 0 END) AS total_appointments
       FROM patients p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN appointment_slots s ON s.patient_id = p.id
       WHERE u.is_active = 1
       GROUP BY p.id, p.full_name, p.email, p.phone, p.birth_date,
                p.sex, u.username, u.created_at
       ORDER BY p.full_name`
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// Calendario de citas
router.get('/reports/calendar', authenticate, authorize('doctor'), async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { from, to } = req.query;
    // MySQL no tiene cast ::date — construir WHERE dinámico
    let sql = `SELECT s.id, s.slot_date, s.slot_time, s.status, s.booked_by,
                      p.full_name AS patient_name, p.email AS patient_email
               FROM appointment_slots s
               LEFT JOIN patients p ON p.id = s.patient_id
               WHERE 1=1`;
    const params = [];
    if (from) { sql += ' AND s.slot_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND s.slot_date <= ?'; params.push(to); }
    sql += ' ORDER BY s.slot_date, s.slot_time';
    const result = await db.query(sql, params);
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
