'use strict';

const db  = require('../config/database');
const enc = require('../utils/encryption');

async function createRecord(data, doctorId) {
  const { slotId, patientId, vitalSigns, diagnosis, prescriptions, labResults, notes } = data;

  const { rows: check } = await db.query(
    `SELECT id FROM appointment_slots WHERE id = $1 AND patient_id = $2 AND status = 'booked'`,
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

  await db.query(
    `INSERT INTO clinical_records
       (slot_id, patient_id, doctor_id, vital_signs_enc, diagnosis_enc,
        prescriptions_enc, lab_results_enc, notes_enc)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slot_id) DO UPDATE SET
       vital_signs_enc   = EXCLUDED.vital_signs_enc,
       diagnosis_enc     = EXCLUDED.diagnosis_enc,
       prescriptions_enc = EXCLUDED.prescriptions_enc,
       lab_results_enc   = EXCLUDED.lab_results_enc,
       notes_enc         = EXCLUDED.notes_enc,
       doctor_id         = EXCLUDED.doctor_id`,
    [slotId, patientId, doctorId, vitalSignsEnc, diagnosisEnc, prescriptionsEnc, labResultsEnc, notesEnc]
  );

  const { rows } = await db.query(
    'SELECT id, recorded_at FROM clinical_records WHERE slot_id = $1', [slotId]
  );
  return rows[0];
}

async function getPatientHistory(patientId) {
  const { rows } = await db.query(
    `SELECT cr.id, cr.recorded_at, cr.updated_at, cr.doctor_id,
            cr.vital_signs_enc, cr.diagnosis_enc, cr.prescriptions_enc,
            cr.lab_results_enc, cr.notes_enc,
            s.id AS slot_id, s.slot_date, s.slot_time,
            p.full_name, p.birth_date, p.sex, p.email, p.phone,
            u.username AS doctor_name
     FROM clinical_records cr
     JOIN appointment_slots s ON s.id = cr.slot_id
     JOIN patients p ON p.id = cr.patient_id
     LEFT JOIN users u ON u.id = cr.doctor_id
     WHERE cr.patient_id = $1
     ORDER BY s.slot_date DESC, s.slot_time DESC`,
    [patientId]
  );
  return rows.map(decryptRecord);
}

async function getRecordBySlot(slotId) {
  const { rows } = await db.query(
    `SELECT cr.*, s.slot_date, s.slot_time, p.full_name, p.email, p.birth_date, p.sex,
            u.username AS doctor_name
     FROM clinical_records cr
     JOIN appointment_slots s ON s.id = cr.slot_id
     JOIN patients p ON p.id = cr.patient_id
     LEFT JOIN users u ON u.id = cr.doctor_id
     WHERE cr.slot_id = $1`,
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
    doctorId:      row.doctor_id,
    doctorName:    row.doctor_name,
    vitalSigns:    enc.decryptObject(row.vital_signs_enc),
    diagnosis:     enc.decrypt(row.diagnosis_enc),
    prescriptions: enc.decrypt(row.prescriptions_enc),
    labResults:    enc.decrypt(row.lab_results_enc),
    notes:         enc.decrypt(row.notes_enc),
  };
}

async function updateRecord(recordId, data, doctorId) {
  const { vitalSigns, diagnosis, prescriptions, labResults, notes } = data;

  // Verificar que el registro existe y pertenece al doctor
  const { rows: check } = await db.query(
    `SELECT id FROM clinical_records WHERE id = $1 AND doctor_id = $2`,
    [recordId, doctorId]
  );
  if (check.length === 0) {
    const err = new Error('Registro no encontrado o no autorizado');
    err.statusCode = 403; throw err;
  }

  const vitalSignsEnc    = vitalSigns ? enc.encryptObject(vitalSigns) : null;
  const diagnosisEnc     = diagnosis ? enc.encrypt(diagnosis) : null;
  const prescriptionsEnc = prescriptions ? enc.encrypt(prescriptions) : null;
  const labResultsEnc    = labResults ? enc.encrypt(labResults) : null;
  const notesEnc         = notes ? enc.encrypt(notes) : null;

  await db.query(
    `UPDATE clinical_records SET
       vital_signs_enc   = COALESCE($2, vital_signs_enc),
       diagnosis_enc     = COALESCE($3, diagnosis_enc),
       prescriptions_enc = COALESCE($4, prescriptions_enc),
       lab_results_enc   = COALESCE($5, lab_results_enc),
       notes_enc         = COALESCE($6, notes_enc),
       updated_at        = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [recordId, vitalSignsEnc, diagnosisEnc, prescriptionsEnc, labResultsEnc, notesEnc]
  );

  const { rows } = await db.query(
    'SELECT id, updated_at FROM clinical_records WHERE id = $1', [recordId]
  );
  return rows[0];
}

module.exports = { createRecord, updateRecord, getPatientHistory, getRecordBySlot };