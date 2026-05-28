/**
 * services/appointmentService.js
 * Compatible con schema 001_schema.sql:
 *   - ENUMs: slot_status ('available','booked','cancelled'), booking_by ('patient','doctor')
 *   - uuid-ossp: gen_random_uuid() ya se maneja automáticamente por DEFAULT
 *   - FK: patient_id → patients(id) ON DELETE SET NULL
 */

'use strict';

const db = require('../config/database');
const { withSlotLock } = require('../utils/slotMutex');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');

// ─────────────────────────────────────────────────────────────
// getSlots — accesible por doctor (todos) y paciente (solo available)
// ─────────────────────────────────────────────────────────────
async function getSlots(filters = {}) {
  let sql = `
    SELECT s.id, 
           TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, 
           s.slot_time, s.status, s.booked_by,
           s.created_at, s.updated_at,
           s.patient_id,
           p.full_name AS patient_name
    FROM appointment_slots s
    LEFT JOIN patients p ON p.id = s.patient_id
    WHERE 1=1`;
  const params = [];
  let i = 1;

  if (filters.date)   { sql += ` AND s.slot_date = $${i++}`;           params.push(filters.date); }
  if (filters.status) { sql += ` AND s.status = $${i++}::slot_status`; params.push(filters.status); }
  if (filters.from)   { sql += ` AND s.slot_date >= $${i++}`;          params.push(filters.from); }
  if (filters.to)     { sql += ` AND s.slot_date <= $${i++}`;          params.push(filters.to); }

  sql += ' ORDER BY s.slot_date, s.slot_time';
  const { rows } = await db.query(sql, params);
  return rows;
}

// ─────────────────────────────────────────────────────────────
// createSlot — solo médico crea horarios disponibles
// ─────────────────────────────────────────────────────────────
async function createSlot({ date, time, doctorUserId }) {
  // La constraint uq_slot_TIMESTAMP ya garantiza unicidad; capturamos el error de PG
  try {
    // Intentar insertar con doctor_id (después de ejecutar migración 002)
    const { rows } = await db.query(
      `INSERT INTO appointment_slots (slot_date, slot_time, status, doctor_id)
       VALUES ($1, $2, 'available'::slot_status, $3)
       RETURNING id, TO_CHAR(slot_date, 'YYYY-MM-DD') AS slot_date, slot_time, status, patient_id, booked_by, created_at, updated_at`,
      [date, time, doctorUserId]
    );
    logger.info('Slot creado', { date, time, doctor: doctorUserId });
    return rows[0];
  } catch (err) {
    // Si la columna doctor_id no existe aún (antes de migración), reintentar sin ella
    if (err.code === '42703') { // undefined_column
      logger.warn('Columna doctor_id no existe aún. Ejecuta: psql -f database/migrations/002_add_doctor_id_to_slots.sql');
      try {
        const { rows } = await db.query(
          `INSERT INTO appointment_slots (slot_date, slot_time, status)
           VALUES ($1, $2, 'available'::slot_status)
           RETURNING id, TO_CHAR(slot_date, 'YYYY-MM-DD') AS slot_date, slot_time, status, patient_id, booked_by, created_at, updated_at`,
          [date, time]
        );
        logger.info('Slot creado (sin doctor_id)', { date, time });
        return rows[0];
      } catch (innerErr) {
        if (innerErr.code === '23505') {
          const e = new Error('Ya existe un slot para esa fecha y hora');
          e.statusCode = 409;
          throw e;
        }
        throw innerErr;
      }
    }
    // Código 23505 = unique_violation en PostgreSQL
    if (err.code === '23505') {
      const e = new Error('Ya existe un slot para esa fecha y hora');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// bookSlot — reserva con doble protección: mutex + SELECT FOR UPDATE
// ─────────────────────────────────────────────────────────────
async function bookSlot({ slotId, patientId, bookedBy }) {
  return withSlotLock(slotId, async () => {
    const conn = await db.connect();
    try {
      await conn.query('BEGIN');

      const { rows: slotRows } = await conn.query(
        `SELECT id, status, patient_id, slot_date, slot_time
         FROM appointment_slots
         WHERE id = $1
         FOR UPDATE`,
        [slotId]
      );
      const slot = slotRows[0];
      if (!slot) {
        const e = new Error('Slot no encontrado'); e.statusCode = 404; throw e;
      }
      if (slot.status !== 'available') {
        const e = new Error('El horario ya no está disponible'); e.statusCode = 409; throw e;
      }

      // ENUM booking_by: 'patient' | 'doctor'
      await conn.query(
        `UPDATE appointment_slots
         SET status     = 'booked'::slot_status,
             patient_id = $1,
             booked_by  = $2::booking_by,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [patientId, bookedBy, slotId]
      );

      // Obtener datos del paciente para notificación
      const { rows: patRows } = await conn.query(
        `SELECT p.user_id, p.email, p.full_name
         FROM patients p
         WHERE p.id = $1`,
        [patientId]
      );
      const patient = patRows[0];

      // Notificación en base de datos al paciente si fue el médico quien agendó
      if (bookedBy === 'doctor' && patient) {
        await conn.query(
          `INSERT INTO notifications (user_id, message)
           VALUES ($1, 'El médico ha agendado una nueva cita para usted.')`,
          [patient.user_id]
        );

        // Envío de correo electrónico
        const slotDate = slot.slot_date.toISOString().split('T')[0];
        const slotTime = String(slot.slot_time).slice(0, 5);
        emailService.notifyAppointmentBooked(patient.email, patient.full_name, slotDate, slotTime)
          .catch(err => logger.error('Error al enviar correo de reserva:', err));
      }

      // Notificación al doctor si el paciente hizo la reserva
      if (bookedBy === 'patient' && patient) {
        const slotDate = slot.slot_date.toISOString().split('T')[0];
        const slotTime = String(slot.slot_time).slice(0, 5);
        const doctorEmail = process.env.ADMIN_EMAIL || 'preyvictoria@gmail.com';
        const doctorName = process.env.ADMIN_NAME || 'Doctor';
        emailService.notifyDoctorPatientBooked(
          doctorEmail,
          doctorName,
          patient.full_name,
          slotDate,
          slotTime
        )
          .catch(err => logger.error('Error al enviar correo de reserva al doctor:', err));
      }

      await conn.query('COMMIT');
      logger.info('Slot reservado', { slotId, patientId, bookedBy });

      // Devolver fila completa con nombre del paciente
      const { rows } = await db.query(
        `SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
                s.patient_id, p.full_name AS patient_name, s.created_at, s.updated_at
         FROM appointment_slots s
         LEFT JOIN patients p ON p.id = s.patient_id
         WHERE s.id = $1`,
        [slotId]
      );
      return rows[0];
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// cancelAppointment — paciente solo cancela la suya; médico, cualquiera
// Al cancelar el slot vuelve a 'available' para poder reutilizarlo
// ─────────────────────────────────────────────────────────────
async function cancelAppointment({ slotId, requesterId, requesterRole }) {
  const conn = await db.connect();
  try {
    await conn.query('BEGIN');

    const { rows: slotRows } = await conn.query(
      `SELECT id, patient_id, status, slot_date, slot_time
       FROM appointment_slots
       WHERE id = $1
       FOR UPDATE`,
      [slotId]
    );
    const slot = slotRows[0];
    if (!slot) { const e = new Error('Cita no encontrada'); e.statusCode = 404; throw e; }
    if (slot.status === 'cancelled') { const e = new Error('La cita ya fue cancelada'); e.statusCode = 409; throw e; }

    // Verificar que el paciente solo cancela sus propias citas
    if (requesterRole === 'patient') {
      const { rows } = await db.query(
        'SELECT id FROM patients WHERE user_id = $1',
        [requesterId]
      );
      if (!rows[0] || rows[0].id !== slot.patient_id) {
        const e = new Error('No autorizado para cancelar esta cita'); e.statusCode = 403; throw e;
      }
    }

    // Devolver a 'available' para que otros puedan reservar
    await conn.query(
      `UPDATE appointment_slots
       SET status     = 'available'::slot_status,
           patient_id = NULL,
           booked_by  = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [slotId]
    );

    const slotDate = slot.slot_date.toISOString().split('T')[0];
    const slotTime = String(slot.slot_time).slice(0, 5);

    // Obtener datos del paciente para notificaciones
    const { rows: patRows } = await conn.query(
      `SELECT p.user_id, p.email, p.full_name
       FROM patients p
       WHERE p.id = $1`,
      [slot.patient_id]
    );
    const patient = patRows[0];

    // Notificar al paciente si fue el médico quien canceló
    if (requesterRole === 'doctor' && patient) {
      await conn.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, 'Su cita médica ha sido cancelada por el médico.')`,
        [patient.user_id]
      );

      // Envío de correo electrónico
      emailService.notifyAppointmentCancelled(patient.email, patient.full_name, slotDate, slotTime)
        .catch(err => logger.error('Error al enviar correo de cancelación:', err));
    }

    // Notificar al paciente Y al doctor si fue el paciente quien canceló
    if (requesterRole === 'patient' && patient) {
      // Notificación en base de datos al paciente
      await conn.query(
        `INSERT INTO notifications (user_id, message)
         VALUES ($1, 'Has cancelado exitosamente tu cita médica.')`,
        [patient.user_id]
      );

      // Envío de correo electrónico de confirmación al paciente
      emailService.notifyAppointmentCancelled(patient.email, patient.full_name, slotDate, slotTime)
        .catch(err => logger.error('Error al enviar correo de cancelación al paciente:', err));

      // Notificar al doctor que el paciente canceló
      const doctorEmail = process.env.ADMIN_EMAIL || 'preyvictoria@gmail.com';
      const doctorName = process.env.ADMIN_NAME || 'Doctor';
      emailService.notifyDoctorPatientCancelled(doctorEmail, doctorName, patient.full_name, slotDate, slotTime)
        .catch(err => logger.error('Error al enviar correo de cancelación al doctor:', err));
    }

    await conn.query('COMMIT');
    logger.info('Cita cancelada', { slotId, requesterRole });
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────
// rescheduleSlot — médico cambia fecha/hora; notifica al paciente
// ─────────────────────────────────────────────────────────────
async function rescheduleSlot({ slotId, date, time }) {
  const conn = await db.connect();
  try {
    await conn.query('BEGIN');

    const { rows: slotRows } = await conn.query(
      `SELECT id, status, patient_id, slot_date, slot_time
       FROM appointment_slots
       WHERE id = $1
       FOR UPDATE`,
      [slotId]
    );
    const slot = slotRows[0];
    if (!slot) { const e = new Error('Slot no encontrado'); e.statusCode = 404; throw e; }

    const updates  = ['updated_at = CURRENT_TIMESTAMP'];
    const params   = [];
    let i = 1;
    if (date) { updates.push(`slot_date = $${i++}`); params.push(date); }
    if (time) { updates.push(`slot_time = $${i++}`); params.push(time); }
    if (i === 1) { const e = new Error('Nada que actualizar'); e.statusCode = 400; throw e; }

    params.push(slotId);
    await conn.query(
      `UPDATE appointment_slots SET ${updates.join(', ')} WHERE id = $${i}`,
      params
    );

    // Notificar al paciente si la cita estaba reservada
    if (slot.status === 'booked' && slot.patient_id) {
      const { rows: patRows } = await conn.query(
        `SELECT p.user_id, p.email, p.full_name
         FROM patients p
         WHERE p.id = $1`,
        [slot.patient_id]
      );
      const patient = patRows[0];
      if (patient) {
        const oldDate = slot.slot_date.toISOString().split('T')[0];
        const oldTime = String(slot.slot_time).slice(0, 5);
        const newDate = date || oldDate;
        const newTime = time || oldTime;

        await conn.query(
          `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
          [patient.user_id,
           `El médico ha reprogramado su cita para el ${newDate} a las ${newTime} hs.`]
        );

        // Envío de correo electrónico
        emailService.notifyAppointmentRescheduled(patient.email, patient.full_name, oldDate, oldTime, newDate, newTime)
          .catch(err => logger.error('Error al enviar correo de reprogramación:', err));
      }
    }

    await conn.query('COMMIT');
    logger.info('Slot reprogramado', { slotId, date, time });

    const { rows } = await db.query(
      `SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
              s.patient_id, p.full_name AS patient_name, s.created_at, s.updated_at
       FROM appointment_slots s
       LEFT JOIN patients p ON p.id = s.patient_id
       WHERE s.id = $1`,
      [slotId]
    );
    return rows[0];
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────
// getPatientAppointments — todas las citas de un paciente
// ─────────────────────────────────────────────────────────────
async function getPatientAppointments(patientId) {
  const { rows } = await db.query(
    `SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
            s.patient_id, p.full_name AS patient_name, s.created_at, s.updated_at
     FROM appointment_slots s
     LEFT JOIN patients p ON p.id = s.patient_id
     WHERE s.patient_id = $1
     ORDER BY s.slot_date DESC, s.slot_time DESC`,
    [patientId]
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────
// getAppointmentById — obtener detalles de una cita específica
// ─────────────────────────────────────────────────────────────
async function getAppointmentById(slotId) {
  const { rows } = await db.query(
    `SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
            s.patient_id, p.full_name AS patient_name, p.email AS patient_email,
            p.phone AS patient_phone, s.created_at, s.updated_at
     FROM appointment_slots s
     LEFT JOIN patients p ON p.id = s.patient_id
     WHERE s.id = $1`,
    [slotId]
  );
  return rows[0];
}

// ─────────────────────────────────────────────────────────────
// getAllAppointments — obtener todas las citas (para médicos)
// ─────────────────────────────────────────────────────────────
async function getAllAppointments(filters = {}) {
  let sql = `
    SELECT s.id, TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date, s.slot_time, s.status, s.booked_by,
           s.patient_id, p.full_name AS patient_name, p.email AS patient_email,
           p.phone AS patient_phone, s.created_at, s.updated_at
    FROM appointment_slots s
    LEFT JOIN patients p ON p.id = s.patient_id
    WHERE 1=1`;
  const params = [];
  let i = 1;

  if (filters.status) { sql += ` AND s.status = $${i++}::slot_status`; params.push(filters.status); }
  if (filters.from)   { sql += ` AND s.slot_date >= $${i++}`; params.push(filters.from); }
  if (filters.to)     { sql += ` AND s.slot_date <= $${i++}`; params.push(filters.to); }

  sql += ' ORDER BY s.slot_date DESC, s.slot_time DESC';
  const { rows } = await db.query(sql, params);
  return rows;
}

module.exports = {
  getSlots,
  createSlot,
  bookSlot,
  cancelAppointment,
  rescheduleSlot,
  getPatientAppointments,
  getAppointmentById,
  getAllAppointments,
};