/**
 * services/appointmentService.js
 * Gestión de citas adaptada a MySQL.
 * SELECT ... FOR UPDATE funciona igual en InnoDB (motor transaccional de MySQL).
 */

'use strict';

const db             = require('../config/database');
const { withSlotLock } = require('../utils/slotMutex');
const logger         = require('../utils/logger');

async function getSlots(filters = {}) {
  let sql = 'SELECT * FROM appointment_slots WHERE 1=1';
  const params = [];

  if (filters.date) { sql += ' AND slot_date = ?'; params.push(filters.date); }
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.from) { sql += ' AND slot_date >= ?'; params.push(filters.from); }
  if (filters.to)   { sql += ' AND slot_date <= ?'; params.push(filters.to); }

  sql += ' ORDER BY slot_date, slot_time';
  const { rows } = await db.query(sql, params);
  return rows;
}

async function bookSlot({ slotId, patientId, bookedBy }) {
  return withSlotLock(slotId, async () => {
    const conn = await db.getClient();
    try {
      await conn.beginTransaction();

      // Capa 2: bloqueo pesimista — InnoDB soporta FOR UPDATE igual que PostgreSQL
      const [[slot]] = await conn.execute(
        'SELECT id, status FROM appointment_slots WHERE id = ? FOR UPDATE',
        [slotId]
      );

      if (!slot) {
        const err = new Error('Slot no encontrado'); err.statusCode = 404; throw err;
      }
      if (slot.status !== 'available') {
        const err = new Error('El horario ya no está disponible'); err.statusCode = 409; throw err;
      }

      await conn.execute(
        `UPDATE appointment_slots SET status = 'booked', patient_id = ?, booked_by = ? WHERE id = ?`,
        [patientId, bookedBy, slotId]
      );

      // Notificar al paciente si agendó el médico
      if (bookedBy === 'doctor') {
        const [[patRow]] = await conn.execute(
          'SELECT user_id FROM patients WHERE id = ?', [patientId]
        );
        if (patRow) {
          await conn.execute(
            `INSERT INTO notifications (user_id, message)
             VALUES (?, 'El médico ha agendado una nueva cita para usted.')`,
            [patRow.user_id]
          );
        }
      }

      await conn.commit();
      logger.info('Slot reservado', { slotId, patientId, bookedBy });

      const { rows } = await db.query('SELECT * FROM appointment_slots WHERE id = ?', [slotId]);
      return rows[0];
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}

async function cancelAppointment({ slotId, requesterId, requesterRole }) {
  const conn = await db.getClient();
  try {
    await conn.beginTransaction();

    const [[slot]] = await conn.execute(
      'SELECT id, patient_id, status FROM appointment_slots WHERE id = ? FOR UPDATE',
      [slotId]
    );
    if (!slot) { const e = new Error('Cita no encontrada'); e.statusCode = 404; throw e; }
    if (slot.status === 'cancelled') { const e = new Error('Ya cancelada'); e.statusCode = 409; throw e; }

    if (requesterRole === 'patient') {
      const { rows } = await db.query('SELECT id FROM patients WHERE user_id = ?', [requesterId]);
      if (!rows[0] || rows[0].id !== slot.patient_id) {
        const e = new Error('No autorizado'); e.statusCode = 403; throw e;
      }
    }

    await conn.execute(
      `UPDATE appointment_slots SET status = 'cancelled', patient_id = NULL, booked_by = NULL WHERE id = ?`,
      [slotId]
    );

    if (requesterRole === 'doctor' && slot.patient_id) {
      const [[patRow]] = await conn.execute(
        'SELECT user_id FROM patients WHERE id = ?', [slot.patient_id]
      );
      if (patRow) {
        await conn.execute(
          `INSERT INTO notifications (user_id, message)
           VALUES (?, 'Su cita médica ha sido cancelada por el médico.')`,
          [patRow.user_id]
        );
      }
    }

    await conn.commit();
    logger.info('Cita cancelada', { slotId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getPatientAppointments(patientId) {
  const { rows } = await db.query(
    `SELECT s.*, p.full_name AS patient_name
     FROM appointment_slots s
     LEFT JOIN patients p ON p.id = s.patient_id
     WHERE s.patient_id = ?
     ORDER BY s.slot_date DESC, s.slot_time DESC`,
    [patientId]
  );
  return rows;
}

module.exports = { getSlots, bookSlot, cancelAppointment, getPatientAppointments };
