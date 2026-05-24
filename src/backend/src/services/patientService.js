'use strict';

const db = require('../config/database');

async function listPatients() {
  const { rows } = await db.query(
    `SELECT p.id, p.full_name, p.email, p.phone, p.birth_date, p.sex,
            u.username, u.created_at
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE u.is_active = true
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
     WHERE p.id = $1`,
    [patientId]
  );
  return rows[0] || null;
}

async function getPatientByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM patients WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function updatePatient(patientId, updates) {
  const { fullName, address, phone, birthDate, sex } = updates;
  await db.query(
    `UPDATE patients
     SET full_name  = COALESCE($1, full_name),
         address    = COALESCE($2, address),
         phone      = COALESCE($3, phone),
         birth_date = COALESCE($4, birth_date),
         sex        = COALESCE($5, sex)
     WHERE id = $6`,
    [fullName, address, phone, birthDate, sex, patientId]
  );
  return getPatientById(patientId);
}

async function deactivatePatient(patientId) {
  await db.query(
    `UPDATE users SET is_active = false
     WHERE id = (SELECT user_id FROM patients WHERE id = $1)`,
    [patientId]
  );
}

module.exports = { listPatients, getPatientById, getPatientByUserId, updatePatient, deactivatePatient };