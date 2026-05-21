/**
 * services/clinicalRecordService.js — adaptado a MySQL.
 * ON DUPLICATE KEY UPDATE reemplaza al ON CONFLICT de PostgreSQL.
 */
'use strict';

const db  = require('../config/database');
const enc = require('../utils/encryption');

async function createRecord(data) {
  const { slotId, patientId, vitalSigns, diagnosis, prescriptions, labResults, notes } = data;

  const { rows: check } = await db.query(
    `SELECT id FROM appointment_slots WHERE id = ? AND patient_id = ? AND status = 'booked'`,
    [slotId, patientId]
  );
  if (check.length === 0) {
    const err = new Error('Slot no encontrado o no pertenece al paciente');
    err.statusCode = 404; throw err;
  }

  const vitalSignsEnc    = enc.encryptObject(vitalSigns);
  const diagnosisEnc     = enc.encrypt(diagnosis);
  const prescriptionsEnc = enc.encrypt(prescriptions);
  const labResultsEnc    = enc.encrypt(labResults);
  const notesEnc         = enc.encrypt(notes);

  // INSERT ... ON DUPLICATE KEY UPDATE: equivalente a ON CONFLICT en PostgreSQL
  await db.query(
    `INSERT INTO clinical_records
       (slot_id, patient_id, vital_signs_enc, diagnosis_enc,
        prescriptions_enc, lab_results_enc, notes_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       vital_signs_enc   = VALUES(vital_signs_enc),
       diagnosis_enc     = VALUES(diagnosis_enc),
       prescriptions_enc = VALUES(prescriptions_enc),
       lab_results_enc   = VALUES(lab_results_enc),
       notes_enc         = VALUES(notes_enc)`,
    [slotId, patientId, vitalSignsEnc, diagnosisEnc, prescriptionsEnc, labResultsEnc, notesEnc]
  );

  const { rows } = await db.query(
    'SELECT id, recorded_at FROM clinical_records WHERE slot_id = ?', [slotId]
  );
  return rows[0];
}

async function getPatientHistory(patientId) {
  const { rows } = await db.query(
    `SELECT cr.id, cr.recorded_at, cr.updated_at,
            cr.vital_signs_enc, cr.diagnosis_enc, cr.prescriptions_enc,
            cr.lab_results_enc, cr.notes_enc,
            s.id AS slot_id, s.slot_date, s.slot_time,
            p.full_name, p.birth_date, p.sex, p.email, p.phone
     FROM clinical_records cr
     JOIN appointment_slots s ON s.id = cr.slot_id
     JOIN patients p ON p.id = cr.patient_id
     WHERE cr.patient_id = ?
     ORDER BY s.slot_date DESC, s.slot_time DESC`,
    [patientId]
  );
  return rows.map(decryptRecord);
}

async function getRecordBySlot(slotId) {
  const { rows } = await db.query(
    `SELECT cr.*, s.slot_date, s.slot_time, p.full_name, p.email
     FROM clinical_records cr
     JOIN appointment_slots s ON s.id = cr.slot_id
     JOIN patients p ON p.id = cr.patient_id
     WHERE cr.slot_id = ?`,
    [slotId]
  );
  if (rows.length === 0) return null;
  return decryptRecord(rows[0]);
}

function decryptRecord(row) {
  return {
    id:            row.id,
    recordedAt:    row.recorded_at,
    updatedAt:     row.updated_at,
    slotId:        row.slot_id,
    slotDate:      row.slot_date,
    slotTime:      row.slot_time,
    patientName:   row.full_name,
    patientEmail:  row.email,
    birthDate:     row.birth_date,
    sex:           row.sex,
    phone:         row.phone,
    vitalSigns:    enc.decryptObject(row.vital_signs_enc),
    diagnosis:     enc.decrypt(row.diagnosis_enc),
    prescriptions: enc.decrypt(row.prescriptions_enc),
    labResults:    enc.decrypt(row.lab_results_enc),
    notes:         enc.decrypt(row.notes_enc),
  };
}

module.exports = { createRecord, getPatientHistory, getRecordBySlot };
