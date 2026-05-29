/**
 * controllers/clinicalRecordController.js
 */

'use strict';

const { validationResult }    = require('express-validator');
const clinicalRecordService   = require('../services/clinicalRecordService');
const patientService          = require('../services/patientService');

async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const { slotId, patientId, vitalSigns, diagnosis, prescriptions, labResults, notes } = req.body;
    const doctorId = req.user.sub; // Obtener doctor_id del token JWT
    const record = await clinicalRecordService.createRecord({
      slotId, patientId, vitalSigns, diagnosis, prescriptions, labResults, notes,
    }, doctorId);
    res.status(201).json({ message: 'Registro clínico guardado', data: record });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { recordId } = req.params;
    const { vitalSigns, diagnosis, prescriptions, labResults, notes } = req.body;
    const doctorId = req.user.sub;
    
    const record = await clinicalRecordService.updateRecord(recordId, {
      vitalSigns, diagnosis, prescriptions, labResults, notes,
    }, doctorId);
    res.json({ message: 'Registro clínico actualizado', data: record });
  } catch (err) { next(err); }
}

async function getHistory(req, res, next) {
  try {
    const { patientId } = req.params;

    // Un paciente solo puede ver su propio historial
    if (req.user.role === 'patient') {
      const self = await patientService.getPatientByUserId(req.user.sub);
      if (!self || self.id !== patientId) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
      }
    }

    const history = await clinicalRecordService.getPatientHistory(patientId);
    res.json({ data: history });
  } catch (err) { next(err); }
}

async function getBySlot(req, res, next) {
  try {
    const record = await clinicalRecordService.getRecordBySlot(req.params.slotId);
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ data: record });
  } catch (err) { next(err); }
}

module.exports = { create, update, getHistory, getBySlot };
