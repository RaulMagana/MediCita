/**
 * services/patientService.js — adaptado a MySQL (placeholders ?)
 */
'use strict';

const db = require('../config/database');

async function listPatients() {
  const { rows } = await db.query(
    `SELECT p.id, p.full_name, p.email, p.phone, p.birth_date, p.sex,
            u.username, u.created_at
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE u.is_active = 1
     ORDER BY p.full_name`
  );
  return rows;
}

async function getPatientById(patientId) {
  const { rows } = await db.query(
    `SELECT p.id, p.full_name, p.address, p.email, p.phone, p.birth_date,
            p.sex, p.created_at, u.username
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [patientId]
  );
  return rows[0] || null;
}

async function getPatientByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM patients WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function updatePatient(patientId, updates) {
  const { fullName, address, phone, birthDate, sex } = updates;
  await db.query(
    `UPDATE patients
     SET full_name  = COALESCE(?, full_name),
         address    = COALESCE(?, address),
         phone      = COALESCE(?, phone),
         birth_date = COALESCE(?, birth_date),
         sex        = COALESCE(?, sex)
     WHERE id = ?`,
    [fullName, address, phone, birthDate, sex, patientId]
  );
  return getPatientById(patientId);
}

async function deactivatePatient(patientId) {
  await db.query(
    `UPDATE users SET is_active = 0
     WHERE id = (SELECT user_id FROM patients WHERE id = ?)`,
    [patientId]
  );
}

module.exports = { listPatients, getPatientById, getPatientByUserId, updatePatient, deactivatePatient };
